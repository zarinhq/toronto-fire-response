"""Step 7 - notebook 06b graphs: a map and a dot plot of neighbourhood delay."""
import matplotlib
matplotlib.use("Agg")            # draw to files, no window needed
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.collections import PatchCollection
from matplotlib.patches import Polygon

import config
from pipeline.geo import polygons_of


def _ring_area(ring):
    x, y = np.array(ring).T
    return abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))) / 2


def run():
    print("7. Drawing charts")
    config.OUT_FIG.mkdir(parents=True, exist_ok=True)   
    g = pd.read_csv(config.OUT_DATA / "neighbourhood_adjusted_delay.csv", dtype={"neighbourhood_id": str})
    nb = pd.read_csv(config.NEIGHBOURHOODS_FILE)
    lookup = g.set_index("neighbourhood_id")["adj_shrunk_pct"]

    items = []
    for _, r in nb.iterrows():
        for poly in polygons_of(r["geometry"]):
            items.append((_ring_area(poly[0]), np.array(poly[0]), lookup.get(str(r["AREA_SHORT_CODE"]), np.nan)))
    items.sort(key=lambda t: -t[0])          # draw big shapes first
    lim = np.nanmax(np.abs([v for _, _, v in items]))
    pc = PatchCollection([Polygon(p, closed=True) for _, p, _ in items], cmap="RdBu_r",
                         edgecolor="white", linewidth=0.4)
    pc.set_array(np.array([v for _, _, v in items]))
    pc.set_clim(-lim, lim)
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.add_collection(pc)
    ax.autoscale_view()
    ax.set_aspect(1 / np.cos(np.radians(config.LAT0)))
    fig.colorbar(pc, label="slower (+) or faster (-) than expected, %")
    ax.set_axis_off()
    ax.set_title("Wait compared with what distance and time of day predict")
    fig.savefig(config.OUT_FIG / "adjusted_delay_map.png", dpi=150, bbox_inches="tight")
    plt.close(fig)

    top = g.sort_values("adj_shrunk_pct", ascending=False)
    sel = pd.concat([top.head(8), top.tail(8)]).iloc[::-1]
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.errorbar(sel["adj_shrunk_pct"], range(len(sel)),
                xerr=[sel["adj_shrunk_pct"] - sel["lo_pct"], sel["hi_pct"] - sel["adj_shrunk_pct"]],
                fmt="o", color="#4C78A8", ecolor="lightgrey", capsize=2)
    ax.set_yticks(range(len(sel)))
    ax.set_yticklabels(sel["neighbourhood_name"])
    ax.axvline(0, color="black", linewidth=0.8)
    ax.set_xlabel("slower (+) or faster (-) than expected, % (95% range)")
    fig.tight_layout()
    fig.savefig(config.OUT_FIG / "adjusted_delay_top_bottom.png", dpi=150)
    plt.close(fig)
    print("   saved figures/adjusted_delay_map.png and adjusted_delay_top_bottom.png")