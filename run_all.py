"""Run the whole project from raw files to final results:"""
import sys
import time

from pipeline import clean, geo, context, describe, models, robustness, charts, checks, compare
from pipeline.common import make_folders
import config


def main():
    start = time.time()
    make_folders()
    key_file = config.OUT / "key_numbers.json"
    if key_file.exists() and not sys.argv[1:]:
        key_file.unlink()                      # a full run starts the headline numbers fresh
    steps = [("clean", clean.run), ("geo", geo.run), ("context", context.run), ("describe", describe.run),
             ("models", models.run), ("robustness", robustness.run), ("charts", charts.run),
             ("checks", checks.run), ("compare", compare.run)]
    wanted = sys.argv[1:]                      # e.g.  python run_all.py models robustness
    for name, fn in steps:
        if wanted and name not in wanted:
            continue
        t = time.time()
        fn()
        print(f"   ({name} took {time.time() - t:.1f} s)\n")
    print(f"Done in {time.time() - start:.0f} seconds. Results are in outputs/.")


if __name__ == "__main__":
    main()