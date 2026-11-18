"""Step 4 - notebook 04 -: plain descriptions of the waits - overall, by year, time of day, distance."""
import numpy as np
import pandas as pd

import config
from pipeline.common import analysis_frame, add_key_numbers, save_table


def percentiles(s):
    return pd.Series({"n": len(s), "median_s": s.median(), "mean_s": s.mean(),
                      "p75_s": s.quantile(.75), "p90_s": s.quantile(.90), "p95_s": s.quantile(.95)})


def run():
    print("4. Describing the waits")
    inc, d = analysis_frame()
    overall = percentiles(inc["wait_s"]).to_frame("value").reset_index(names="measure")
    save_table(overall, "wait_overall.csv")
    save_table(inc.groupby("year")["wait_s"].apply(percentiles).unstack().reset_index(), "wait_by_year.csv")
    save_table(inc.groupby("daypart")["wait_s"].apply(percentiles).unstack().reset_index(), "wait_by_daypart.csv")
    save_table(inc.groupby("is_weekend")["wait_s"].apply(percentiles).unstack().reset_index(), "wait_by_weekend.csv")

    d = d.copy()
    d["distance_quarter"] = pd.qcut(d["dist_nearest_km"], 4, labels=["closest", "second", "third", "farthest"])
    q = d.groupby("distance_quarter", observed=True).agg(
        n=("wait_s", "size"), km_min=("dist_nearest_km", "min"), km_max=("dist_nearest_km", "max"),
        median_s=("wait_s", "median")).reset_index()
    save_table(q, "wait_by_distance_quarter.csv")

    nb = d.groupby(["neighbourhood_id", "neighbourhood_name"]).agg(
        n=("wait_s", "size"), median_s=("wait_s", "median"), p90_s=("wait_s", lambda s: s.quantile(.9)),
        mean_dist_km=("dist_nearest_km", "mean")).reset_index()
    save_table(nb, "neighbourhood_summary.csv")
    add_key_numbers({"incidents_clean": len(inc), "incidents_modelled": len(d),
                     "median_wait_s": inc["wait_s"].median(), "p90_wait_s": inc["wait_s"].quantile(.9)})