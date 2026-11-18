"""Shared helpers used by several steps (notebooks 06 and 07 used the same code)."""
import json
import numpy as np
import pandas as pd
from scipy import stats

import config


# ---------- folders and saving ---------------------------------------------
def make_folders():
    for folder in (config.OUT_DATA, config.OUT_TABLES, config.OUT_FIG):
        folder.mkdir(parents=True, exist_ok=True)


def save_table(df, name, folder=None, index=False):
    folder = folder or config.OUT_TABLES
    folder.mkdir(parents=True, exist_ok=True)
    df.to_csv(folder / name, index=index)
    print(f"   saved {folder.name}/{name}  ({len(df)} rows)")


def add_key_numbers(new):
    """Keep headline numbers in one small JSON file (used later by the dashboard)."""
    path = config.OUT / "key_numbers.json"
    current = json.loads(path.read_text()) if path.exists() else {}
    current.update({k: (float(v) if isinstance(v, (np.floating, float)) else
                        int(v) if isinstance(v, (np.integer,)) else v)
                    for k, v in new.items()})
    config.OUT.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(current, indent=2, sort_keys=True))


# ---------- geography ------------------------------------------------------
def to_km(lat, lon):
    """Convert degrees to kilometres around the centre of Toronto."""
    lat, lon = np.asarray(lat, float), np.asarray(lon, float)
    x = (lon - config.LON0) * 111.32 * np.cos(np.radians(config.LAT0))
    y = (lat - config.LAT0) * 110.57
    return np.column_stack([x, y])


# ---------- the analysis table ---------------------------------------------
def analysis_frame():
    """Incidents that have a neighbourhood and a distance, ready for modelling."""
    inc = pd.read_csv(config.OUT_DATA / "incidents_geo.csv",
                      dtype={"station": str, "nearest_station": str, "neighbourhood_id": str},
                      low_memory=False)
    d = inc[inc["neighbourhood_id"].notna() & inc["dist_nearest_km"].notna()].copy()
    d["log_wait"] = np.log(d["wait_s"])
    d["year_c"] = d["year"].astype(str)
    return inc, d


# ---------- regression with cluster-robust errors --------------------------
def _design(df, numeric, categorical):
    X = df[list(numeric)].astype(float)
    if categorical:
        X = pd.concat([X, pd.get_dummies(df[list(categorical)], drop_first=True).astype(float)], axis=1)
    X.insert(0, "const", 1.0)
    return X


def fit(df, numeric, categorical=(), y="log_wait", cluster="neighbourhood_id"):
    """Least squares with standard errors that allow incidents in the same
    neighbourhood to be alike (cluster-robust, CR1). Returns a table of results."""
    X = _design(df, numeric, categorical)
    Xv, yv = X.to_numpy(), df[y].to_numpy()
    n, k = Xv.shape
    bread = np.linalg.inv(Xv.T @ Xv)
    beta = bread @ Xv.T @ yv
    resid = yv - Xv @ beta
    codes, uniq = pd.factorize(df[cluster])
    G = len(uniq)
    scores = np.zeros((G, k))
    np.add.at(scores, codes, Xv * resid[:, None])
    cov = (G / (G - 1)) * ((n - 1) / (n - k)) * bread @ (scores.T @ scores) @ bread
    se = np.sqrt(np.diag(cov))
    p = 2 * stats.t.sf(np.abs(beta / se), G - 1)
    crit = stats.t.ppf(0.975, G - 1)
    out = pd.DataFrame({"coef": beta, "se": se, "p": p}, index=X.columns)
    out["pct_effect"] = (np.exp(out["coef"]) - 1) * 100
    out["ci_lo_pct"] = (np.exp(out["coef"] - crit * out["se"]) - 1) * 100
    out["ci_hi_pct"] = (np.exp(out["coef"] + crit * out["se"]) - 1) * 100
    out.attrs["r2"] = 1 - (resid ** 2).sum() / ((yv - yv.mean()) ** 2).sum()
    out.attrs["n"], out.attrs["G"] = n, G
    return out


def residuals(df, numeric, categorical=(), y="log_wait"):
    X = _design(df, numeric, categorical)
    beta = np.linalg.lstsq(X.to_numpy(), df[y].to_numpy(), rcond=None)[0]
    return df[y].to_numpy() - X.to_numpy() @ beta


# ---------- adjusted delay per neighbourhood -------------------------------
def neighbourhood_delay(df, rcol="resid"):
    """Average leftover delay per neighbourhood, pulled toward 0 when a
    neighbourhood has few incidents (empirical-Bayes shrinkage)."""
    g = df.groupby("neighbourhood_id")[rcol].agg(n="size", mean_resid="mean").reset_index()
    N, G = len(df), len(g)
    within = ((df[rcol] - df.groupby("neighbourhood_id")[rcol].transform("mean")) ** 2).sum() / (N - G)
    tau2 = max(0.0, g["mean_resid"].var() - (within / g["n"]).mean())
    g["shrink"] = tau2 / (tau2 + within / g["n"])
    g["shrunk_resid"] = g["shrink"] * g["mean_resid"]
    g["post_sd"] = np.sqrt(g["shrink"] * within / g["n"])
    g["adj_delay_pct"] = (np.exp(g["mean_resid"]) - 1) * 100
    g["adj_shrunk_pct"] = (np.exp(g["shrunk_resid"]) - 1) * 100
    g["lo_pct"] = (np.exp(g["shrunk_resid"] - 1.96 * g["post_sd"]) - 1) * 100
    g["hi_pct"] = (np.exp(g["shrunk_resid"] + 1.96 * g["post_sd"]) - 1) * 100
    g.attrs["within_var"], g.attrs["tau2"] = within, tau2
    return g