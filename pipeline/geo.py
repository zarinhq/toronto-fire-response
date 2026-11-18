"""Step 2 - notebook 03 -: placing each incident in a neighbourhood and measuring distance to stations."""
import json
import numpy as np
import pandas as pd
from matplotlib.path import Path
from scipy.spatial import cKDTree

import config
from pipeline.common import save_table, to_km


def polygons_of(geometry_json):
    """A neighbourhood is a list of shapes; each shape has an outline and maybe holes."""
    g = json.loads(geometry_json)
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]


def assign_neighbourhoods(lon, lat, shapes):
    """shapes: list of (id, name, polygons). Returns (ids, names) for each point (None if outside all)."""
    pts = np.column_stack([lon, lat])
    ids = np.full(len(pts), None, dtype=object)
    names = np.full(len(pts), None, dtype=object)
    for nid, name, polys in shapes:
        for poly in polys:
            inside = Path(poly[0]).contains_points(pts)
            for hole in poly[1:]:
                inside &= ~Path(hole).contains_points(pts)
            new = inside & (ids == None)  # noqa: E711  (only fill points not yet placed)
            ids[new], names[new] = nid, name
    return ids, names


def load_stations():
    st = pd.read_csv(config.STATIONS_FILE)
    st = st[(st["TYPE_DESC"] == "Fire Station") & st["STATION"].notna()].copy()
    st["station"] = st["STATION"].astype(int).astype(str)
    coords = [json.loads(g)["coordinates"][0] for g in st["geometry"]]
    st["lon"] = [c[0] for c in coords]
    st["lat"] = [c[1] for c in coords]
    return st[["station", "lat", "lon"]].reset_index(drop=True)


def add_distances(inc, st):
    ok = inc["has_coords"]
    xy_inc = to_km(inc.loc[ok, "Latitude"], inc.loc[ok, "Longitude"])
    dist, idx = cKDTree(to_km(st["lat"], st["lon"])).query(xy_inc)
    inc["dist_nearest_km"] = np.nan
    inc.loc[ok, "dist_nearest_km"] = dist
    inc["nearest_station"] = None
    inc.loc[ok, "nearest_station"] = st["station"].to_numpy()[idx]

    # distance to the station named in the incident record
    lookup = st.set_index("station")[["lat", "lon"]].rename(columns={"lat": "st_lat", "lon": "st_lon"})
    joined = inc.join(lookup, on="station")
    both = (ok & joined["st_lat"].notna()).to_numpy()
    inc["dist_assigned_km"] = np.nan
    inc.loc[both, "dist_assigned_km"] = np.linalg.norm(
        to_km(inc.loc[both, "Latitude"], inc.loc[both, "Longitude"]) -
        to_km(joined.loc[both, "st_lat"], joined.loc[both, "st_lon"]), axis=1)
    return inc


def run(clean=None):
    print("2. Placing incidents on the map and measuring distance")
    inc = clean if clean is not None else pd.read_csv(
        config.OUT_DATA / "incidents_clean.csv", dtype={"station": str}, low_memory=False)
    nb = pd.read_csv(config.NEIGHBOURHOODS_FILE)
    shapes = [(str(r["AREA_SHORT_CODE"]), r["AREA_NAME"], polygons_of(r["geometry"])) for _, r in nb.iterrows()]

    inc = inc.copy()
    inc["has_coords"] = inc["has_coords"].astype(bool)
    inc["neighbourhood_id"] = None
    inc["neighbourhood_name"] = None
    ids, names = assign_neighbourhoods(inc.loc[inc["has_coords"], "Longitude"].to_numpy(),
                                       inc.loc[inc["has_coords"], "Latitude"].to_numpy(), shapes)
    inc.loc[inc["has_coords"], "neighbourhood_id"] = ids
    inc.loc[inc["has_coords"], "neighbourhood_name"] = names

    inc = add_distances(inc, load_stations())
    save_table(inc, "incidents_geo.csv", folder=config.OUT_DATA)
    print(f"   placed {inc['neighbourhood_id'].notna().sum()} of {len(inc)} incidents; "
          f"median distance to nearest station {inc['dist_nearest_km'].median():.2f} km")
    return inc