"""Step 5 - notebook 06 and 06b -: models, then each neighbourhood's delay beyond what the models explain."""
import numpy as np
import pandas as pd

import config
from pipeline.common import (analysis_frame, fit, residuals, neighbourhood_delay,
                             save_table, add_key_numbers)


def results_table(m, name):
    out = m.reset_index(names="term")
    out.insert(0, "model", name)
    out["r2"], out["n"] = m.attrs["r2"], m.attrs["n"]
    return out


def run():
    print("5. Fitting models")
    inc, d = analysis_frame()
    ctx = pd.read_csv(config.OUT_DATA / "neighbourhood_context.csv", dtype={"neighbourhood_id": str})
    d = d.merge(ctx.drop(columns="neighbourhood_name"), on="neighbourhood_id", how="left")
    for v in config.CONTEXT_VARS:                      # put census measures on one scale
        d[v + "_z"] = (d[v] - ctx[v].mean()) / ctx[v].std()

    time_cat = ["daypart", "year_c"]
    m1 = fit(d, ["dist_nearest_km"])
    m2 = fit(d, ["dist_nearest_km", "is_weekend"], time_cat)
    m3 = fit(d, ["dist_nearest_km", "is_weekend"] + [v + "_z" for v in config.CONTEXT_VARS], time_cat)
    for name, m in [("model1_distance", m1), ("model2_plus_time", m2), ("model3_plus_census", m3)]:
        t = results_table(m, name)
        save_table(t[~t["term"].str.startswith("year_c")], f"{name}_results.csv")
        print(f"   {name}: {m.loc['dist_nearest_km', 'pct_effect']:.1f}% per km, R2 {m.attrs['r2']:.2f}")

    # ---- delay beyond what distance and time of day explain, per neighbourhood
    d["resid"] = residuals(d, ["dist_nearest_km", "is_weekend"], time_cat)
    g = neighbourhood_delay(d)
    names = d.groupby("neighbourhood_id")["neighbourhood_name"].first()
    g["neighbourhood_name"] = g["neighbourhood_id"].map(names)
    nb = d.groupby("neighbourhood_id").agg(median_s=("wait_s", "median"),
                                           mean_dist_km=("dist_nearest_km", "mean")).reset_index()
    g = g.merge(nb, on="neighbourhood_id").merge(ctx.drop(columns="neighbourhood_name"), on="neighbourhood_id")

    for v in config.RISK_VARS:
        g[v + "_z"] = (g[v] - g[v].mean()) / g[v].std()
    g["risk_score"] = g[[v + "_z" for v in config.RISK_VARS]].mean(axis=1)
    g["clear_slow"] = g["lo_pct"] > 0
    g["clear_fast"] = g["hi_pct"] < 0
    g["top_risk"] = g["risk_score"] >= g["risk_score"].quantile(config.TOP_RISK_QUANTILE)
    g["slow_and_high_risk"] = g["clear_slow"] & g["top_risk"]
    g = g.drop(columns=[v + "_z" for v in config.RISK_VARS]).sort_values("adj_shrunk_pct", ascending=False)
    save_table(g, "neighbourhood_adjusted_delay.csv", folder=config.OUT_DATA)

    top_raw = set(g.nlargest(10, "median_s")["neighbourhood_id"])
    top_adj = set(g.nlargest(10, "adj_shrunk_pct")["neighbourhood_id"])
    five = g[g["slow_and_high_risk"]]["neighbourhood_name"].tolist()
    print(f"   clearly slower than expected: {g['clear_slow'].sum()} | clearly faster: {g['clear_fast'].sum()}")
    print(f"   slow and high risk: {five}")
    add_key_numbers({
        "distance_pct_per_km_model1": m1.loc["dist_nearest_km", "pct_effect"],
        "distance_pct_per_km": m2.loc["dist_nearest_km", "pct_effect"],
        "distance_ci_lo": m2.loc["dist_nearest_km", "ci_lo_pct"],
        "distance_ci_hi": m2.loc["dist_nearest_km", "ci_hi_pct"],
        "night_pct": m2.loc["daypart_night", "pct_effect"],
        "distance_pct_per_km_model3": m3.loc["dist_nearest_km", "pct_effect"],
        "r2_model2": m2.attrs["r2"],
        "clearly_slow_count": int(g["clear_slow"].sum()),
        "clearly_fast_count": int(g["clear_fast"].sum()),
        "slow_and_high_risk": five,
        "raw_top10_vs_adjusted_top10_overlap": len(top_raw & top_adj),
    })
    return g