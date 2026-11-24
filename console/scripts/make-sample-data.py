"""Generate SAMPLE run data for the console (public/api/runs.json).

These runs are made up for UI development. Real runs will come from the agents
writing the same JSON shape, schemaVersion 1 (see src/api/types.ts).
Test names match sample-ts/src/cart.test.ts, as Jest reports them ("suite > test").
"""
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

random.seed(7)

TESTS = {
    "addItem": [
        "adds a new item to an empty cart",
        "appends a new item with a different id",
        "increases quantity when the id already exists, without duplicating",
        "keeps the existing item name and price when merging",
        "does not mutate the original cart or its items",
        "returns copies of items rather than shared references",
        *[f"throws RangeError for invalid quantity {q}" for q in ["0", "-1", "1.5", "NaN", "Infinity"]],
        "throws for invalid quantity even when the item already exists",
    ],
    "removeItem": [
        "removes the item with the given id",
        "is a no-op for an id that is not in the cart",
        "returns an empty array when removing from an empty cart",
        "can empty the cart by removing the last item",
        "does not mutate the original cart and returns copied items",
    ],
    "subtotal": [
        "returns 0 for an empty cart",
        "computes unitPrice * quantity for a single item",
        "sums across multiple items",
        "handles zero-priced items",
    ],
    "computeTotal": [
        "returns the subtotal when no discount is given",
        "applies a percentage discount",
        "returns 0 for a 100% discount",
        "returns the full subtotal for a 0% discount",
        "returns 0 for an empty cart regardless of discount",
        "rounds down to the nearest cent",
        "rounds half up to the nearest cent",
        *[f"throws RangeError for invalid discount {d}" for d in ["-1", "-0.01", "100.01", "101", "NaN", "Infinity", "-Infinity"]],
        "includes the offending value in the error message",
    ],
}
ALL = [f"{suite} > {name}" for suite, names in TESTS.items() for name in names]

REPO = Path(__file__).resolve().parents[2]
TEST_FILE = "sample-ts/src/cart.test.ts"
TEST_LINES = len((REPO / TEST_FILE).read_text().splitlines())
MAX_RUNS = 3

# The test a POSSIBLE BUG comment is attached to, and the line the comment would sit on.
BUG_TEST = "computeTotal > rounds half up to the nearest cent"
BUG = {
    "line": 126,
    "text": "// POSSIBLE BUG: 50% off 999 cents is 499.5, which should round up to 500, but computeTotal returned 499.",
}

AGENTS = ["langgraph", "semantic-kernel", "agent-framework"]
FAIL_MESSAGES = [
    "expect(received).toEqual(expected) // deep equality",
    "expect(received).toThrow(expected) - Received function did not throw",
    "TypeError: Cannot read properties of undefined (reading 'quantity')",
    "expect(received).toBe(expected) // Object.is equality",
]

# (agent, trigger, attempt pass/fail pattern, possible bug?)
PLANS = [
    ("langgraph", "ci", [False, True], False),
    ("semantic-kernel", "ci", [True], False),
    ("agent-framework", "ci", [False, False, True], False),
    ("langgraph", "local", [False, False, False], True),
    ("semantic-kernel", "local", [False, False, False], True),
    ("agent-framework", "ci", [True], False),
    ("langgraph", "ci", [True], False),
    ("semantic-kernel", "ci", [False, False, False], False),
    ("agent-framework", "local", [False, True], False),
    ("langgraph", "local", [False, True], False),
]

def iso(dt: datetime) -> str:
    return dt.isoformat(timespec="seconds").replace("+00:00", "Z")


def outcome_for(attempts: list, suspected_bugs: list) -> str:
    # A run with a suspected bug never counts as passed: the flagged test is kept as written.
    if attempts[-1]["passed"] and not suspected_bugs:
        return "passed"
    return "limit_reached" if len(attempts) >= MAX_RUNS else "failed"


start = datetime(2026, 11, 12, 14, 0, tzinfo=timezone.utc)
runs = []
for i, (agent, trigger, pattern, has_bug) in enumerate(PLANS):
    started = start + timedelta(hours=17 * i + random.randint(0, 5), minutes=random.randint(0, 59),
                                seconds=random.randint(0, 59))
    attempts = []
    for n, ok in enumerate(pattern, start=1):
        failed = [] if ok else random.sample(ALL, random.randint(1, 4) if n > 1 else random.randint(2, 6))
        attempts.append({
            "n": n,
            "passed": ok,
            "durationMs": random.randint(2500, 6500),
            "tests": {"total": len(ALL), "passed": len(ALL) - len(failed), "failed": len(failed)},
            "failures": [{"name": name, "message": random.choice(FAIL_MESSAGES)} for name in failed],
        })
    last = attempts[-1]
    suspected_bugs = [dict(BUG)] if has_bug else []
    if has_bug and BUG_TEST not in {f["name"] for f in last["failures"]}:
        # The test kept with the POSSIBLE BUG comment still fails in the last attempt.
        last["failures"].append({"name": BUG_TEST, "message": "expect(received).toBe(expected) // Object.is equality"})
        last["passed"] = False
        last["tests"]["failed"] = len(last["failures"])
        last["tests"]["passed"] = len(ALL) - len(last["failures"])
    failed_last = {f["name"] for f in last["failures"]}

    duration_ms = sum(a["durationMs"] for a in attempts) + random.randint(15000, 60000)
    run_id = f"{started.strftime('%Y-%m-%dT%H-%M-%SZ')}_{agent}"
    runs.append({
        "schemaVersion": 1,
        "runId": run_id,
        "agent": agent,
        "model": "claude-sonnet-5-5",
        "startedAt": iso(started),
        "finishedAt": iso(started + timedelta(milliseconds=duration_ms)),
        "durationMs": duration_ms,
        "trigger": {
            "kind": trigger,
            "prNumber": 4 + i if trigger == "ci" else None,
            "commit": f"{random.getrandbits(28):07x}",
        },
        "sourceFile": "sample-ts/src/cart.ts",
        "testFile": TEST_FILE,
        "outcome": outcome_for(attempts, suspected_bugs),
        "maxRuns": MAX_RUNS,
        "attempts": attempts,
        "finalTests": [{"name": name, "status": "failed" if name in failed_last else "passed"} for name in ALL],
        "final": {"testLines": TEST_LINES + len(suspected_bugs), "testCount": len(ALL)},
        "suspectedBugs": suspected_bugs,
    })

runs.sort(key=lambda r: r["startedAt"], reverse=True)
out = Path(__file__).resolve().parent.parent / "public" / "api" / "runs.json"
out.write_text(json.dumps({"runs": runs}, indent=2) + "\n")
print(f"wrote {len(runs)} sample runs to {out}")
