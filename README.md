# test-gen-agent

One test-generation agent, built three ways.

**Live demo:** https://test-gen-agent-one.vercel.app. This is the web console in `console/`; see its README for what's live and what's sample data.

## What it does

The agent reads `sample-ts/src/cart.ts`, asks Claude to write Jest tests for it, writes them to
`sample-ts/src/cart.test.ts`, and runs them. If tests fail, it fixes the tests and runs them again,
at most 3 times in total.

If a test fails because `cart.ts` itself looks wrong, the agent is told not to change the expected
value to match the bug. It keeps the test and marks it with a `// POSSIBLE BUG:` comment.

## The three versions

**`agent/`: Python, LangGraph.** The code decides the flow. A fixed graph runs
read → generate → write → run, and a conditional edge (`after_tests` in `graph.py`) either ends
the run or sends it to `fix_tests` and back to write → run. The edge stops after `MAX_RUNS = 3`.

**`semantic-kernel-agent/`: C#, Semantic Kernel.** The model decides the steps. Claude gets three
tools (`read_source`, `write_tests`, `run_tests`) through automatic function calling and chooses
when to call them. The guardrails live in `TestTools.cs`.

**`agent-framework-agent/`: C#, Microsoft Agent Framework 1.x.** Microsoft Agent Framework is the
successor to Semantic Kernel. This version has the same three tools and guardrails, registered as
Microsoft.Extensions.AI functions with `AIFunctionFactory`. The agent is created with `AsAIAgent`
and run with `RunAsync`. Tool calling is on by default, so there's no extra setup step.

## Comparison

| | `agent/` | `semantic-kernel-agent/` | `agent-framework-agent/` |
|---|---|---|---|
| Who decides the steps | Code (graph edges) | Claude (automatic function calling) | Claude (default tool calling) |
| Retry cap (3 runs) | Conditional edge, `MAX_RUNS` in `graph.py` | `run_tests` in `TestTools.cs` | `run_tests` in `TestTools.cs` |
| Bug guardrail (`// POSSIBLE BUG:`) | `fix_tests` prompt in `graph.py` | Prompt in `Program.cs` | Agent instructions in `Program.cs` |
| Language | Python 3.12 | C# (.NET 10) | C# (.NET 10) |
| Framework | LangGraph + langchain-anthropic | Semantic Kernel | Microsoft Agent Framework (`Microsoft.Agents.AI`) |

## Guardrails

- **Writes are limited to test files in `sample-ts/src`.**
  - In the C# versions, `write_tests` refuses any name not ending in `.test.ts`, and a path check
    rejects anything outside `sample-ts/src`.
  - In the Python version, the code builds the test file path itself, so the model never chooses one.
- **3-run cap, enforced in code.** After 3 runs, the Python graph ends and the C# `run_tests` tool
  answers `LIMIT REACHED`.
- **The bug rule is a prompt instruction.** The `// POSSIBLE BUG:` behavior comes from what Claude
  is told, not from a code check.
- **The API key is kept out of the code.** Locally it is read from `.env`, which git ignores. In CI
  it comes from the `ANTHROPIC_API_KEY` repository secret.

## CI

Each agent has its own GitHub Actions workflow. It runs on pull requests that touch that agent's
folder or `sample-ts/src/`, and posts the agent's output as a PR comment.

| Workflow | Agent |
|---|---|
| `.github/workflows/test-agent.yml` | `agent/` |
| `.github/workflows/sk-test-agent.yml` | `semantic-kernel-agent/` |
| `.github/workflows/af-test-agent.yml` | `agent-framework-agent/` |

## Running locally

**Prerequisites**

- Python 3.12, .NET 10 SDK, Node 20
- An Anthropic API key in `.env`:

```sh
cp .env.example .env      # then set ANTHROPIC_API_KEY
cd sample-ts && npm install
```

Every agent overwrites `sample-ts/src/cart.test.ts`.

**Python agent.** Run from the repo root:

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m agent.graph
```

**Semantic Kernel agent.** Run from `semantic-kernel-agent/`:

```sh
cd semantic-kernel-agent
dotnet run
```

**Agent Framework agent.** Run from `agent-framework-agent/`:

```sh
cd agent-framework-agent
dotnet run
```

The C# agents read `../.env` and work on `../sample-ts`, so run them from inside their own folder.
