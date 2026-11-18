"""All the settings for the project in one place.

If you want to change a choice (for example, the longest wait we keep),
change it here and re-run `python run_all.py`. Nothing else needs editing.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# ---- folders -------------------------------------------------------------
RAW = ROOT / "data" / "raw"
OUT = ROOT / "outputs"
OUT_DATA = OUT / "data"        # big cleaned tables
OUT_TABLES = OUT / "tables"    # small result tables
OUT_FIG = OUT / "figures"      # pictures

# ---- raw files (names exactly as downloaded) -----------------------------
INCIDENTS_FILE = RAW / "Fire Incidents Data.csv"
STATIONS_FILE = RAW / "fire-station-locations - 4326.csv"
NEIGHBOURHOODS_FILE = RAW / "Neighbourhoods - 4326.csv"
RUN_AREAS_FILE = RAW / "toronto-fire-services-run-areas - 4326.csv"
CENSUS_FILE = RAW / "neighbourhood-profiles-2021-158-model.xlsx"
CENSUS_SHEET = "hd2021_census_profile"

# ---- cleaning choices ----------------------------------------------------
KEEP_TYPES = ("01", "02")      # 01 = Fire, 02 = Explosion
MIN_WAIT_S = 10                # shorter waits are treated as recording errors
MAX_WAIT_S = 3600              # longer than an hour is treated as an error
LAT_RANGE = (43.4, 44.0)       # a box around Toronto
LON_RANGE = (-79.8, -78.9)

# ---- geography -----------------------------------------------------------
LAT0, LON0 = 43.70, -79.40     # centre used to convert degrees to km

# ---- analysis choices ----------------------------------------------------
DAYPART_EDGES = [-1, 5, 11, 17, 23]
DAYPART_LABELS = ["night", "morning", "afternoon", "evening"]
CONTEXT_VARS = ["median_income", "pct_65_plus", "pct_renters"]   # model 3
RISK_VARS = ["pct_built_before_1980", "pct_apt_5plus"]           # risk proxies
TOP_RISK_QUANTILE = 0.75       # "high risk" = top quarter of the risk score
N_SHUFFLES = 1000
SEED = 42