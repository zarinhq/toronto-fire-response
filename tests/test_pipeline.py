"""Automated tests. Run with:  python -m pytest -q

It uses some made-up data where we know the right answer in advance,
so it can check that the code does what it should be doing.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.clean import clean_incidents          # noqa: E402
from pipeline.common import fit, neighbourhood_delay, to_km   # noqa: E402
from pipeline.geo import assign_neighbourhoods, polygons_of    # noqa: E402


def make_raw():
    return pd.DataFrame({
        "Final_Incident_Type": ["01 - Fire", "01 - Fire", "03 - Alarm", "02 - Explosion", "01 - Fire", "01 - Fire"],
        "TFS_Alarm_Time": ["2020-01-04 02:00:00"] * 6,                      # a Saturday, 2 am
        "TFS_Arrival_Time": ["2020-01-04 02:05:00",    # 300 s  -> kept
                             "2020-01-04 02:00:05",    # 5 s    -> too short
                             "2020-01-04 02:05:00",    # wrong type
                             "2020-01-04 02:06:00",    # 360 s  -> kept
                             None,                     # no arrival
                             "2020-01-04 03:30:00"],   # 5400 s -> too long
        "Latitude": [43.7, 43.7, 43.7, 10.0, 43.7, 43.7],
        "Longitude": [-79.4, -79.4, -79.4, -79.4, -79.4, -79.4],
        "Incident_Station_Area": [" 113 ", "113", "113", "", "113", "113"],
    })


def test_cleaning_keeps_only_valid_rows():
    df, audit = clean_incidents(make_raw())
    assert list(df["wait_s"]) == [300.0, 360.0]
    assert audit["rows_left"].iloc[-1] == 2
    assert audit["rows_removed"].sum() == 4


def test_cleaning_adds_expected_columns():
    df, _ = clean_incidents(make_raw())
    assert list(df["daypart"]) == ["night", "night"]       # 2 am
    assert list(df["is_weekend"]) == [1, 1]                # Saturday
    assert list(df["has_coords"]) == [True, False]         # second point is outside Toronto
    assert df["station"].iloc[0] == "113"                  # padding removed
    assert pd.isna(df["station"].iloc[1])                  # blank becomes missing


def test_degrees_to_km():
    one_degree_north = to_km([44.70], [-79.40]) - to_km([43.70], [-79.40])
    assert abs(one_degree_north[0, 1] - 110.57) < 1e-6
    assert abs(one_degree_north[0, 0]) < 1e-9


def test_point_in_polygon_with_a_hole():
    square_with_hole = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
                        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]]
    geometry = json.dumps({"type": "Polygon", "coordinates": square_with_hole})
    shapes = [("A", "Square", polygons_of(geometry))]
    ids, names = assign_neighbourhoods([2, 5, 20], [2, 5, 20], shapes)
    assert ids[0] == "A"            # inside the outline
    assert ids[1] is None           # inside the hole
    assert ids[2] is None           # outside everything


def test_regression_recovers_a_known_effect():
    rng = np.random.default_rng(0)
    n, groups = 6000, 60
    df = pd.DataFrame({"neighbourhood_id": rng.integers(0, groups, n).astype(str),
                       "dist": rng.uniform(0, 3, n)})
    group_shift = pd.Series(rng.normal(0, 0.05, groups), index=[str(i) for i in range(groups)])
    df["log_wait"] = 5.5 + 0.25 * df["dist"] + df["neighbourhood_id"].map(group_shift) + rng.normal(0, 0.3, n)
    out = fit(df, ["dist"])
    assert abs(out.loc["dist", "coef"] - 0.25) < 0.02
    assert out.loc["dist", "ci_lo_pct"] < (np.exp(0.25) - 1) * 100 < out.loc["dist", "ci_hi_pct"]


def test_shrinkage_pulls_small_groups_harder():
    rng = np.random.default_rng(1)
    sizes = [400] * 20 + [5] * 20
    rows = []
    for gi, size in enumerate(sizes):
        rows.append(pd.DataFrame({"neighbourhood_id": str(gi),
                                  "resid": rng.normal(rng.normal(0, 0.1), 0.3, size)}))
    g = neighbourhood_delay(pd.concat(rows, ignore_index=True))
    assert g["shrink"].between(0, 1).all()
    big, small = g[g["n"] == 400]["shrink"].mean(), g[g["n"] == 5]["shrink"].mean()
    assert small < big
    assert (g["lo_pct"] <= g["adj_shrunk_pct"]).all() and (g["adj_shrunk_pct"] <= g["hi_pct"]).all()