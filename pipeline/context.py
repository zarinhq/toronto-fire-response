"""Step 3 - notebook 05 -: pulling five census measures per neighbourhood from the 2021 profile."""
import pandas as pd

import config
from pipeline.common import save_table

AGE = "Total - Distribution (%) of the population by broad age groups - 25% sample data"
INC = "Total - Income statistics for private households - 25% sample data"
TEN = "Total - Private households by tenure - 25% sample data"
STR = "Total - Occupied private dwellings by structural type of dwelling - 25% sample data"
PER = "Total - Occupied private dwellings by period of construction - 25% sample data"


def build_context(raw):
    """raw: the census sheet read with header=None (first column = row labels)."""
    labels = raw[0].astype(str).str.strip()

    def find_row(section, item):
        start = labels[labels == section].index
        assert len(start) == 1, f"section not found exactly once: {section}"
        below = labels.loc[start[0] + 1:]
        return below[below == item].index[0]

    def values(row):
        return pd.to_numeric(raw.loc[row, 1:], errors="coerce").to_numpy(dtype=float)

    def section_total(section):
        return values(labels[labels == section].index[0])

    return pd.DataFrame({
        "neighbourhood_id": raw.loc[1, 1:].astype(float).astype(int).astype(str).to_numpy(),
        "neighbourhood_name": raw.loc[0, 1:].to_numpy(),
        "median_income": values(find_row(INC, "Median total income of household in 2020 ($)")),
        "pct_65_plus": values(find_row(AGE, "65 years and over")),
        "pct_renters": values(find_row(TEN, "Renter")) / section_total(TEN) * 100,
        "pct_apt_5plus": values(find_row(STR, "Apartment in a building that has five or more storeys"))
                         / section_total(STR) * 100,
        "pct_built_before_1980": (values(find_row(PER, "1960 or before")) +
                                  values(find_row(PER, "1961 to 1980"))) / section_total(PER) * 100,
    })


def run():
    print("3. Reading census context")
    raw = pd.read_excel(config.CENSUS_FILE, sheet_name=config.CENSUS_SHEET, header=None)
    ctx = build_context(raw)
    save_table(ctx, "neighbourhood_context.csv", folder=config.OUT_DATA)
    return ctx