"""Call interpret_counts / the run-once function with inputs the conftest enumeration does not use,
and dump each result for the platform validator. Usage: python3 -I probe_shots.py <echo> > out.jsonl"""
import json, sys
sys.path.insert(0, sys.argv[1])
from quantum import qollab_job as Q
COUNTS = {"00": 120, "11": 130, "01": 3, "10": 2}  # 255 shots: IonQ's noisy-path drift
calls = [("interpret_counts(drift255, 'sim', shots_requested=None)", lambda: Q.interpret_counts(COUNTS, "sim")),
         ("interpret_counts(drift255, 'sim', shots_requested=300)", lambda: Q.interpret_counts(COUNTS, "sim", shots_requested=300)),
         ("interpret_counts(drift255, 'sim', shots_requested=256)", lambda: Q.interpret_counts(COUNTS, "sim", shots_requested=256))]
for name, fn in calls:
    try: print(json.dumps({"call": name, "result": fn()}))
    except Exception as e: print(json.dumps({"call": name, "error": f"{type(e).__name__}: {e}"}))
