"""Generate SAMPLE run data for the console (public/api/runs.json).

These runs are made up for UI development. Real runs will come from the agents
writing the same JSON shape (see src/api/types.ts).
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
ALL = [(s, n) for s, names in TESTS.items() for n in names]

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

start = datetime(2026, 11, 12, 14, 0, tzinfo=timezone.utc)
runs = []
for i, (agent, trigger, pattern, has_bug) in enumerate(PLANS):
    started = start + timedelta(hours=17 * i + random.randint(0, 5), minutes=random.randint(0, 59))
    attempts = []
    for n, ok in enumerate(pattern, start=1):
        failed = [] if ok else random.sample(ALL, random.randint(1, 4) if n > 1 else random.randint(2, 6))
        attempts.append({
            "number": n,
            "passed": ok,
            "testsTotal": len(ALL),
            "testsFailed": len(failed),
            "durationMs": random.randint(2500, 6500),
            "failures": [
                {"suite": s, "test": t, "message": random.choice(FAIL_MESSAGES)} for s, t in failed
            ],
        })
    last = attempts[-1]
    if has_bug:
        # A test kept with a POSSIBLE BUG comment still fails, so the run can't pass.
        bug = ("computeTotal", "rounds half up to the nearest cent")
        if bug not in {(f["suite"], f["test"]) for f in last["failures"]}:
            last["failures"].append({"suite": bug[0], "test": bug[1],
                                     "message": "expect(received).toBe(expected) // Object.is equality"})
            last["testsFailed"] = len(last["failures"])
    failed_last = {(f["suite"], f["test"]) for f in last["failures"]}
    possible_bugs = []
    if has_bug:
        possible_bugs.append({
            "suite": "computeTotal",
            "test": "rounds half up to the nearest cent",
            "note": "POSSIBLE BUG: computeTotal uses Math.floor, so 0.5 cents rounds down instead of up.",
        })
    status = "passed" if last["passed"] else ("limit_reached" if len(attempts) >= 3 else "failed")
    runs.append({
        "id": f"run-{1001 + i}",
        "agent": agent,
        "trigger": trigger,
        "pullRequest": 4 + i if trigger == "ci" else None,
        "model": "claude-sonnet-5-5",
        "sourceFile": "sample-ts/src/cart.ts",
        "testFile": "sample-ts/src/cart.test.ts",
        "startedAt": started.isoformat().replace("+00:00", "Z"),
        "durationMs": sum(a["durationMs"] for a in attempts) + random.randint(15000, 60000),
        "status": status,
        "attempts": attempts,
        "tests": [
            {"suite": s, "name": t, "status": "failed" if (s, t) in failed_last else "passed"}
            for s, t in ALL
        ],
        "possibleBugs": possible_bugs,
        "sample": True,
    })

runs.sort(key=lambda r: r["startedAt"], reverse=True)
out = Path(__file__).resolve().parent.parent / "public" / "api" / "runs.json"
out.write_text(json.dumps({"runs": runs}, indent=2) + "\n")
print(f"wrote {len(runs)} sample runs to {out}")
