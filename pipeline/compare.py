"""This is optional: comparing the pipeline's results with the files notebooks saved in data/processed."""
import numpy as np
import pandas as pd

import config

NOTEBOOK_DIR = config.ROOT / "data" / "processed"


def _compare(name, key=None):
    old_path, new_path = NOTEBOOK_DIR / name, config.OUT_DATA / name
    if not old_path.exists():
        print(f"   {name}: no notebook version to compare with (skipped)")
        return None
    old, new = pd.read_csv(old_path, low_memory=False), pd.read_csv(new_path, low_memory=False)
    if key:
        old, new = old.set_index(key).sort_index(), new.set_index(key).sort_index()
    if len(old) != len(new):
        print(f"   {name}: DIFFERENT row count ({len(old)} vs {len(new)})")
        return False
    shared = [c for c in old.columns if c in new.columns and pd.api.types.is_numeric_dtype(old[c])
              and pd.api.types.is_numeric_dtype(new[c])]
    bad = [c for c in shared if not np.allclose(old[c].to_numpy(float), new[c].to_numpy(float),
                                                rtol=1e-6, atol=1e-6, equal_nan=True)]
    if bad:
        print(f"   {name}: {len(bad)} column(s) differ: {bad}")
        return False
    print(f"   {name}: identical on all {len(shared)} shared numeric columns")
    return True


def run():
    print("9. Comparing with your notebook results")
    ok = [_compare("incidents_geo.csv"),
          _compare("neighbourhood_context.csv", key="neighbourhood_id"),
          _compare("neighbourhood_adjusted_delay.csv", key="neighbourhood_id")]
    done = [r for r in ok if r is not None]
    if not done:
        print("   nothing to compare with")
    else:
        print("   pipeline reproduces the notebooks" if all(done) else "   some results differ - see above")