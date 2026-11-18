"""Automatic data checks. If one fails, the pipeline stops and says exactly what is wrong.

Each check answers a yes/no question about the data. They are the pipeline's
safety net: if the City changes a file next year, these catch it.
"""
import pandas as pd

import config
from pipeline.geo import load_stations
from pipeline.common import save_table


def check_all():
    results = []

    def check(name, ok, detail):
        results.append({"check": name, "passed": bool(ok), "detail": detail})

    inc = pd.read_csv(config.OUT_DATA / "incidents_geo.csv",
                      dtype={"station": str, "nearest_station": str, "neighbourhood_id": str}, low_memory=False)
    ctx = pd.read_csv(config.OUT_DATA / "neighbourhood_context.csv", dtype={"neighbourhood_id": str})
    nb = pd.read_csv(config.NEIGHBOURHOODS_FILE)
    st = load_stations()
    runs = pd.read_csv(config.RUN_AREAS_FILE)
    adj = pd.read_csv(config.OUT_DATA / "neighbourhood_adjusted_delay.csv", dtype={"neighbourhood_id": str})

    # --- incidents
    check("incident ids are unique", inc["Incident_Number"].is_unique, f"{inc['Incident_Number'].duplicated().sum()} duplicates")
    check("only Fire and Explosion types", inc["Final_Incident_Type"].astype(str).str[:2].isin(config.KEEP_TYPES).all(), "")
    check("waits inside the allowed range", inc["wait_s"].between(config.MIN_WAIT_S, config.MAX_WAIT_S).all(),
          f"min {inc['wait_s'].min():.0f} s, max {inc['wait_s'].max():.0f} s")
    check("alarm and arrival times all present", inc[["alarm", "arrival"]].notna().all().all(), "")
    share = inc["has_coords"].mean()
    check("at least 99% of incidents have usable coordinates", share >= 0.99, f"{share:.2%}")
    share = inc["neighbourhood_id"].notna().mean()
    check("at least 99% of incidents fall inside a neighbourhood", share >= 0.99, f"{share:.2%}")
    share = inc["station"].isin(st["station"]).mean()
    check("at least 99% of incident station codes match a real station", share >= 0.99,
          f"{share:.2%} match; {(~inc['station'].isin(st['station'])).sum()} do not")
    check("distance to nearest station is between 0 and 40 km",
          inc["dist_nearest_km"].dropna().between(0, 40).all(), f"max {inc['dist_nearest_km'].max():.1f} km")

    # --- boundaries, stations, census
    check("158 neighbourhoods in the boundary file", len(nb) == 158, f"{len(nb)}")
    check("census has 158 neighbourhoods", len(ctx) == 158, f"{len(ctx)}")
    check("boundary codes equal census codes",
          set(nb["AREA_SHORT_CODE"].astype(str)) == set(ctx["neighbourhood_id"]), "")
    check("no missing census values", not ctx.isna().any().any(), "")
    pct_cols = ["pct_65_plus", "pct_renters", "pct_apt_5plus", "pct_built_before_1980"]
    check("census percentages are between 0 and 100", ctx[pct_cols].apply(lambda s: s.between(0, 100)).all().all(), "")
    check("every station matches a fire run area",
          set(st["station"]) == set(runs["AREA_SHORT_CODE"].astype(int).astype(str)),
          f"{len(st)} stations, {len(runs)} run areas")

    # --- results
    check("every neighbourhood has results", len(adj) == 158, f"{len(adj)}")
    check("shrink factors are between 0 and 1", adj["shrink"].between(0, 1).all(), "")
    check("each range contains its estimate", ((adj["lo_pct"] <= adj["adj_shrunk_pct"]) &
                                               (adj["adj_shrunk_pct"] <= adj["hi_pct"])).all(), "")

    out = pd.DataFrame(results)
    save_table(out, "data_checks.csv")
    return out


def run():
    print("8. Data checks")
    out = check_all()
    for _, r in out.iterrows():
        print(f"   [{'ok' if r['passed'] else 'FAIL'}] {r['check']}" + (f" ({r['detail']})" if r["detail"] else ""))
    failed = out[~out["passed"]]
    if len(failed):
        raise SystemExit(f"\n{len(failed)} data check(s) failed - see outputs/tables/data_checks.csv")
    print(f"   all {len(out)} checks passed")