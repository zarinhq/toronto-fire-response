import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))          # so we can import config and pipeline
import config
from pipeline.common import analysis_frame, neighbourhood_delay, residuals
from pipeline.geo import polygons_of

T = config.OUT_TABLES


def table(name):
    return pd.read_csv(T / name)


# ---- 1. map outlines: simplify each neighbourhood shape ------------------
K = math.cos(math.radians(43.7))               # squeeze longitude so the map is not stretched


def simplify(points, tolerance):
    """Douglas-Peucker: drop points that barely change the shape."""
    if len(points) < 3:
        return points
    (ax, ay), (bx, by) = points[0], points[-1]
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy) or 1e-12
    far, far_i = -1, 0
    for i in range(1, len(points) - 1):
        d = abs(dy * (points[i][0] - ax) - dx * (points[i][1] - ay)) / length
        if d > far:
            far, far_i = d, i
    if far > tolerance:
        return simplify(points[: far_i + 1], tolerance)[:-1] + simplify(points[far_i:], tolerance)
    return [points[0], points[-1]]


nb = pd.read_csv(config.NEIGHBOURHOODS_FILE)
rings_by_id, all_pts = {}, []
for _, r in nb.iterrows():
    rings = [[(x * K, y) for x, y in poly[0]] for poly in polygons_of(r["geometry"])]
    rings_by_id[str(r["AREA_SHORT_CODE"])] = rings
    for ring in rings:
        all_pts += ring
x0, x1 = min(p[0] for p in all_pts), max(p[0] for p in all_pts)
y0, y1 = min(p[1] for p in all_pts), max(p[1] for p in all_pts)
WIDTH = 1000
scale = WIDTH / (x1 - x0)
height = (y1 - y0) * scale

paths = {}
for nid, rings in rings_by_id.items():
    d = ""
    for ring in rings:
        far_i = max(range(1, len(ring) - 1),
                    key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
        s = simplify(ring[: far_i + 1], 0.00018)[:-1] + simplify(ring[far_i:], 0.00018)
        if len(s) >= 3:
            d += "M" + "L".join(f"{(x - x0) * scale:.1f},{(y1 - y) * scale:.1f}" for x, y in s[:-1]) + "Z"
    paths[nid] = d

# ---- 2. one row per neighbourhood ---------------
adj = pd.read_csv(config.OUT_DATA / "neighbourhood_adjusted_delay.csv", dtype={"neighbourhood_id": str})
hoods = []
for _, r in adj.iterrows():
    hoods.append(dict(
        id=r.neighbourhood_id, name=r.neighbourhood_name, n=int(r.n),
        adj=round(r.adj_shrunk_pct, 1), lo=round(r.lo_pct, 1), hi=round(r.hi_pct, 1),
        med=int(r.median_s), km=round(r.mean_dist_km, 2),
        slow=bool(r.clear_slow), fast=bool(r.clear_fast), risk=bool(r.top_risk), five=bool(r.slow_and_high_risk),
        inc=None if pd.isna(r.median_income) else int(r.median_income),
        p65=round(r.pct_65_plus, 1), rent=round(r.pct_renters, 1),
        apt=round(r.pct_apt_5plus, 1), old=round(r.pct_built_before_1980, 1),
        d=paths[r.neighbourhood_id]))
raw10 = adj.nlargest(10, "median_s")["neighbourhood_id"].tolist()
adj10 = adj.nlargest(10, "adj_shrunk_pct")["neighbourhood_id"].tolist()

# ---- 3. wards (2018 onward only: older rows use the old 44-ward numbers) --
inc, d = analysis_frame()
d["resid"] = residuals(d, ["dist_nearest_km", "is_weekend"], ["daypart", "year_c"])
w = d[(d["year"] >= 2018) & d["Incident_Ward"].between(1, 25)].copy()
w["neighbourhood_id"] = w["Incident_Ward"].astype(int).astype(str)   # reuse the same function, grouped by ward
g = neighbourhood_delay(w)
ward_median = w.groupby("neighbourhood_id")["wait_s"].median()
wards = sorted(
    [dict(ward=int(r.neighbourhood_id), n=int(r.n), adj=round(r.adj_shrunk_pct, 1),
          lo=round(r.lo_pct, 1), hi=round(r.hi_pct, 1), med=int(ward_median[r.neighbourhood_id]))
     for _, r in g.iterrows()],
    key=lambda x: x["ward"])

# ---- 4. share of very short waits per year ---------------------
clean = pd.read_csv(config.OUT_DATA / "incidents_clean.csv", usecols=["year", "wait_s"])
short = [dict(year=int(y), pct=round(float((x.wait_s < 120).mean() * 100), 1), n=int(len(x)))
         for y, x in clean.groupby("year")]

# ---- 5. put everything together --------------------------------
extra = dict(zip(*table("robustness_extra.csv").T.values))
data = dict(
    kn=json.load(open(config.OUT / "key_numbers.json")),
    extra={k: float(v) for k, v in extra.items()},
    hoods=hoods, raw10=raw10, adj10=adj10, W=WIDTH, H=round(height, 1),
    wards=wards, ward_n=len(w), ward_total=int((d["year"] >= 2018).sum()),
    short=short,
    daypart=table("wait_by_daypart.csv").round(1).to_dict("records"),
    quarter=table("wait_by_distance_quarter.csv").round(2).to_dict("records"),
    year=table("wait_by_year.csv").round(1).to_dict("records"),
    overall=dict(zip(*table("wait_overall.csv").T.values)),
    audit=table("cleaning_audit.csv").to_dict("records"),
    rob_dist=table("robustness_distance.csv").to_dict("records"),
    rob_rank=table("robustness_ranking.csv").to_dict("records"),
    shuffle=table("robustness_shuffle.csv").to_dict("records"),
    checks=table("data_checks.csv").to_dict("records"),
)

out = HERE / "data.js"
out.write_text("const D = " + json.dumps(data, default=float, separators=(",", ":")) + ";\n")
print(f"wrote {out.name}: {out.stat().st_size // 1024} KB, {len(hoods)} neighbourhoods, {len(wards)} wards")