"""Step 1 -notebook 02 -: raw incidents -> cleaned incidents + an audit of what was removed."""
import pandas as pd

import config
from pipeline.common import save_table


def clean_incidents(raw):
    """Pure function: takes the raw table, returns (clean table, audit log)."""
    df = raw.copy()
    log = [("raw file", 0, len(df))]

    def step(label, keep):
        nonlocal df
        removed = int((~keep).sum())
        df = df[keep].copy()
        log.append((label, removed, len(df)))

    df["alarm"] = pd.to_datetime(df["TFS_Alarm_Time"], errors="coerce")
    df["arrival"] = pd.to_datetime(df["TFS_Arrival_Time"], errors="coerce")

    step("keep Fire and Explosion types", df["Final_Incident_Type"].astype(str).str[:2].isin(config.KEEP_TYPES))
    step("drop missing alarm time", df["alarm"].notna())
    step("drop missing arrival time", df["arrival"].notna())
    df["wait_s"] = (df["arrival"] - df["alarm"]).dt.total_seconds()
    step(f"drop waits under {config.MIN_WAIT_S} s", df["wait_s"] >= config.MIN_WAIT_S)
    step(f"drop waits over {config.MAX_WAIT_S} s", df["wait_s"] <= config.MAX_WAIT_S)

    df["has_coords"] = (df["Latitude"].between(*config.LAT_RANGE) &
                        df["Longitude"].between(*config.LON_RANGE))
    df["station"] = df["Incident_Station_Area"].astype(str).str.strip().replace({"": pd.NA, "nan": pd.NA})
    df["year"] = df["alarm"].dt.year
    df["hour"] = df["alarm"].dt.hour
    df["is_weekend"] = (df["alarm"].dt.dayofweek >= 5).astype(int)
    df["daypart"] = pd.cut(df["hour"], config.DAYPART_EDGES, labels=config.DAYPART_LABELS).astype(str)

    audit = pd.DataFrame(log, columns=["step", "rows_removed", "rows_left"])
    return df, audit


def run():
    print("1. Cleaning incidents")
    raw = pd.read_csv(config.INCIDENTS_FILE, low_memory=False, dtype={"Incident_Station_Area": str})
    df, audit = clean_incidents(raw)
    save_table(audit, "cleaning_audit.csv")
    save_table(df, "incidents_clean.csv", folder=config.OUT_DATA)
    print(audit.to_string(index=False))
    return df