import re
import subprocess
from pathlib import Path
from typing import TypedDict

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langgraph.graph import StateGraph, START, END

load_dotenv()

llm = ChatAnthropic(model="claude-sonnet-5-5", max_tokens=16000)
FENCE = "`" * 3
MAX_RUNS = 3
PROJECT_DIR = "sample-ts"


class AgentState(TypedDict, total=False):
    source_path: str
    source_code: str
    tests: str
    test_path: str
    test_output: str
    passed: bool
    attempts: int


def ask_claude(prompt: str) -> str:
    """Send a prompt and return the code inside the reply's code block."""
    response = llm.invoke(prompt)
    if response.response_metadata.get("stop_reason") == "max_tokens":
        print("  ! Claude's reply was cut off at max_tokens")
    text = response.content if isinstance(response.content, str) else "".join(
        block.get("text", "") for block in response.content if isinstance(block, dict)
    )
    # Match an opening fence, then everything up to a closing fence OR the end of the text
    match = re.search(FENCE + r"(?:ts|typescript)?[ \t]*\n(.*?)(?:" + FENCE + r"|\Z)", text, re.DOTALL)
    return (match.group(1) if match else text).strip() + "\n"


# ---------- nodes ----------

def read_source(state: AgentState) -> dict:
    code = Path(state["source_path"]).read_text()
    print(f"[read_source] {len(code.splitlines())} lines from {state['source_path']}")
    return {"source_code": code}


def generate_tests(state: AgentState) -> dict:
    module = Path(state["source_path"]).stem
    prompt = f"""Write Jest unit tests in TypeScript (ts-jest) for the module below.
Import from './{module}'. Cover normal cases, edge cases and thrown errors.
Keep it focused: one describe block per exported function, about 150 lines at most.
Return ONLY the complete test file inside one {FENCE}ts code block.

{FENCE}ts
{state["source_code"]}
{FENCE}"""
    tests = ask_claude(prompt)
    print(f"[generate_tests] {len(tests.splitlines())} lines of tests")
    return {"tests": tests}


def write_tests(state: AgentState) -> dict:
    src = Path(state["source_path"])
    test_path = src.with_name(f"{src.stem}.test.ts")
    test_path.write_text(state["tests"])
    print(f"[write_tests] wrote {test_path}")
    return {"test_path": str(test_path)}


def run_tests(state: AgentState) -> dict:
    result = subprocess.run(
        ["npm", "test", "--", "--ci"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
    )
    passed = result.returncode == 0
    attempts = state.get("attempts", 0) + 1
    print(f"[run_tests] run {attempts}: {'PASSED' if passed else 'FAILED'}")
    return {"test_output": result.stdout + result.stderr, "passed": passed, "attempts": attempts}


def fix_tests(state: AgentState) -> dict:
    module = Path(state["source_path"]).stem
    prompt = f"""These Jest tests for '{module}' are failing. Fix the TEST file.
Rules:
- Fix mistakes in the tests: syntax, imports, wrong assumptions about how the code behaves.
- If a test fails because the source code itself looks buggy, do NOT change the expected value
  to match the bug. Keep the test and add a comment starting with // POSSIBLE BUG: explaining why.
Return ONLY the complete corrected test file inside one {FENCE}ts code block.

Source ({module}.ts):
{FENCE}ts
{state["source_code"]}
{FENCE}

Current tests:
{FENCE}ts
{state["tests"]}
{FENCE}

Jest output (last part):
{FENCE}
{state["test_output"][-4000:]}
{FENCE}"""
    tests = ask_claude(prompt)
    print(f"[fix_tests] revised tests ({len(tests.splitlines())} lines)")
    return {"tests": tests}


# ---------- routing: the conditional edge ----------

def after_tests(state: AgentState) -> str:
    if state["passed"]:
        return "done"
    if state["attempts"] >= MAX_RUNS:
        return "give_up"
    return "fix"


# ---------- graph ----------

builder = StateGraph(AgentState)
builder.add_node("read_source", read_source)
builder.add_node("generate_tests", generate_tests)
builder.add_node("write_tests", write_tests)
builder.add_node("run_tests", run_tests)
builder.add_node("fix_tests", fix_tests)

builder.add_edge(START, "read_source")
builder.add_edge("read_source", "generate_tests")
builder.add_edge("generate_tests", "write_tests")
builder.add_edge("write_tests", "run_tests")
builder.add_conditional_edges(
    "run_tests",
    after_tests,
    {"done": END, "give_up": END, "fix": "fix_tests"},
)
builder.add_edge("fix_tests", "write_tests")  # loop back: write -> run again

graph = builder.compile()


if __name__ == "__main__":
    print(graph.get_graph().draw_mermaid())  # prints a diagram of the graph

    final = graph.invoke({"source_path": "sample-ts/src/cart.ts", "attempts": 0})

    print("\n==== RESULT ====")
    print(f"Passed: {final['passed']} after {final['attempts']} run(s)")
    bugs = [line.strip() for line in final["tests"].splitlines() if "POSSIBLE BUG" in line]
    for bug in bugs:
        print("  ", bug)
    if not final["passed"]:
        print("\n".join(final["test_output"].splitlines()[-30:]))