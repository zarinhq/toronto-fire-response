"""Step 6 - notebook 07 -: changing each analysis choice and see whether the findings survive."""
import numpy as np
import pandas as pd
from scipy import stats

import config
from pipeline.common import (analysis_frame, fit, residuals, neighbourhood_delay,
                             save_table, add_key_numbers)

TIME_CAT = ["daypart", "year_c"]


def run():
    print("6. Robustness checks")
    inc, d = analysis_frame()
    d["band"] = pd.qcut(d["dist_nearest_km"], 4, labels=["b1", "b2", "b3", "b4"]).astype(str)
    d["dist2"] = d["dist_nearest_km"] ** 2

    # ---- checks 1-3: distance effect under different choices
    rows = []

    def show(label, df, dist="dist_nearest_km"):
        m = fit(df, [dist, "is_weekend"], TIME_CAT)
        r = m.loc[dist]
        rows.append({"check": label, "n": len(df), "per_km_pct": r["pct_effect"], "lo": r["ci_lo_pct"],
                     "hi": r["ci_hi_pct"], "night_pct": m.loc["daypart_night", "pct_effect"]})

    show("baseline (nearest station)", d)
    da = d[d["dist_assigned_km"].notna()]
    show("nearest, same rows", da)
    show("assigned station", da, "dist_assigned_km")
    show("assigned is also nearest", da[da["station"] == da["nearest_station"]])
    show("assigned, within 5 km", da[da["dist_assigned_km"] <= 5], "dist_assigned_km")
    for lo, hi in [(10, 900), (60, 3600), (120, 3600), (120, 900)]:
        show(f"waits {lo} to {hi} s", d[d["wait_s"].between(lo, hi)])
    table = pd.DataFrame(rows).round(2)
    save_table(table, "robustness_distance.csv")

    by_year = [fit(d[d["year"] != y], ["dist_nearest_km", "is_weekend"], TIME_CAT).loc["dist_nearest_km", "pct_effect"]
               for y in sorted(d["year"].unique())]
    m_s = fit(d, ["dist_nearest_km", "is_weekend"], TIME_CAT, y="wait_s")
    mb = fit(d, ["is_weekend"], ["band"] + TIME_CAT)
    mq = fit(d, ["dist_nearest_km", "dist2", "is_weekend"], TIME_CAT)

    # ---- locations
    pts = inc[inc["has_coords"]].groupby(["Latitude", "Longitude"]).size()
    unplaced = inc[inc["has_coords"] & inc["neighbourhood_id"].isna()]
    placed = inc[inc["neighbourhood_id"].notna()]
    extra = {
        "leave_one_year_out_min_pct": min(by_year), "leave_one_year_out_max_pct": max(by_year),
        "seconds_per_km": m_s.loc["dist_nearest_km", "coef"], "seconds_per_km_pm": 1.96 * m_s.loc["dist_nearest_km", "se"],
        "night_extra_seconds": m_s.loc["daypart_night", "coef"],
        "band2_vs_closest_pct": mb.loc["band_b2", "pct_effect"], "band3_vs_closest_pct": mb.loc["band_b3", "pct_effect"],
        "band4_vs_closest_pct": mb.loc["band_b4", "pct_effect"],
        "quadratic_linear_term": mq.loc["dist_nearest_km", "coef"], "quadratic_squared_term": mq.loc["dist2", "coef"],
        "quadratic_squared_p": mq.loc["dist2", "p"],
        "incidents_with_coords": int(pts.sum()), "distinct_locations": len(pts),
        "share_at_shared_location": pts[pts >= 2].sum() / pts.sum(), "max_at_one_point": int(pts.max()),
        "unplaced_incidents": len(unplaced), "unplaced_median_wait_s": unplaced["wait_s"].median(),
        "placed_median_wait_s": placed["wait_s"].median(),
    }
    save_table(pd.DataFrame({"measure": list(extra), "value": list(extra.values())}).round(4), "robustness_extra.csv")

    # ---- check 7: do the neighbourhood findings survive?
    adj = pd.read_csv(config.OUT_DATA / "neighbourhood_adjusted_delay.csv", dtype={"neighbourhood_id": str})
    five = adj.loc[adj["slow_and_high_risk"], "neighbourhood_id"].tolist()
    d["resid"] = residuals(d, ["dist_nearest_km", "is_weekend"], TIME_CAT)
    g0 = neighbourhood_delay(d)
    base_top10 = set(g0.nlargest(10, "adj_shrunk_pct")["neighbourhood_id"])
    rank_rows = []

    def variant(label, df, numeric, categorical):
        df = df.copy()
        df["resid"] = residuals(df, numeric, categorical)
        g = neighbourhood_delay(df)
        both = g0.merge(g, on="neighbourhood_id", suffixes=("_0", "_v"))
        rank_rows.append({
            "variant": label,
            "rank_corr": stats.spearmanr(both["adj_shrunk_pct_0"], both["adj_shrunk_pct_v"])[0],
            "top10_overlap": len(set(g.nlargest(10, "adj_shrunk_pct")["neighbourhood_id"]) & base_top10),
            "clearly_slow": int((g["lo_pct"] > 0).sum()),
            "five_still_clearly_slow": int((g[g["neighbourhood_id"].isin(five)]["lo_pct"] > 0).sum()),
            "of_how_many": len(five)})

    variant("baseline", d, ["dist_nearest_km", "is_weekend"], TIME_CAT)
    variant("assigned-station distance", da, ["dist_assigned_km", "is_weekend"], TIME_CAT)
    variant("waits of 2 min or more", d[d["wait_s"] >= 120], ["dist_nearest_km", "is_weekend"], TIME_CAT)
    variant("years 2011 to 2022", d[d["year"] <= 2022], ["dist_nearest_km", "is_weekend"], TIME_CAT)
    variant("flexible distance (bands)", d, ["is_weekend"], ["band"] + TIME_CAT)
    variant("with distance squared", d, ["dist_nearest_km", "dist2", "is_weekend"], TIME_CAT)
    ranking = pd.DataFrame(rank_rows).round(3)
    save_table(ranking, "robustness_ranking.csv")

    # ---- check 8: shuffle test
    codes, _ = pd.factorize(d["neighbourhood_id"])
    n_per = np.bincount(codes)
    sd_resid = d["resid"].std()

    def spread_and_flags(res):
        means = np.bincount(codes, weights=res) / n_per
        z = means / (sd_resid / np.sqrt(n_per))
        return means.std(), int((np.abs(z) > 1.96).sum())

    real_spread, real_flags = spread_and_flags(d["resid"].to_numpy())
    rng = np.random.default_rng(config.SEED)
    sims = np.array([spread_and_flags(rng.permutation(d["resid"].to_numpy())) for _ in range(config.N_SHUFFLES)])
    shuffle = pd.DataFrame([
        {"what": "real data", "spread": real_spread, "flagged": real_flags},
        {"what": "shuffled average", "spread": sims[:, 0].mean(), "flagged": sims[:, 1].mean()},
        {"what": "shuffled maximum", "spread": sims[:, 0].max(), "flagged": sims[:, 1].max()}]).round(3)
    save_table(shuffle, "robustness_shuffle.csv")

    base, assigned = table.iloc[0], table[table["check"] == "assigned station"].iloc[0]
    print(f"   distance effect: {base['per_km_pct']:.1f}% (nearest) vs {assigned['per_km_pct']:.1f}% (assigned)")
    print(f"   shuffle: real spread {real_spread:.3f} vs {sims[:, 0].mean():.3f} shuffled; flagged {real_flags} vs {sims[:, 1].mean():.1f}")
    add_key_numbers({
        "distance_pct_per_km_assigned": assigned["per_km_pct"],
        "distance_range_low": table["per_km_pct"].min(), "distance_range_high": table["per_km_pct"].max(),
        "shuffle_real_spread": real_spread, "shuffle_mean_spread": sims[:, 0].mean(),
        "shuffle_real_flagged": real_flags, "shuffle_mean_flagged": sims[:, 1].mean(),
        "seconds_per_km": extra["seconds_per_km"], "share_at_shared_location": extra["share_at_shared_location"]})