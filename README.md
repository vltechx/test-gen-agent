# test-gen-agent

Two agents that use Claude to generate Jest tests for a sample TypeScript project:

| Agent | Folder | Stack |
|---|---|---|
| Python | `agent/` | LangGraph + langchain-anthropic |
| C# | `semantic-kernel-agent/` | Semantic Kernel + Anthropic C# SDK |

Both agents read `sample-ts/src/cart.ts`, write `sample-ts/src/cart.test.ts`, run the tests and fix
failing tests, with at most 3 test runs. If a test fails because the source code looks wrong, they do
not change the expected value to match the bug. They keep the test and mark it with a
`// POSSIBLE BUG:` comment.

## Layout

```
test-gen-agent/
├── agent/                       # Python agent (LangGraph)
│   ├── graph.py                 # the agent: read → generate → write → run → fix loop
│   └── main.py                  # setup check; prints "ready" if ANTHROPIC_API_KEY is set
├── semantic-kernel-agent/       # C# agent (Semantic Kernel)
│   ├── Program.cs               # connects Semantic Kernel to Claude, runs the prompt
│   ├── TestTools.cs             # plugin with the tools Claude can call
│   └── semantic-kernel-agent.csproj
├── sample-ts/                   # TypeScript code the agents write tests for
│   ├── src/cart.ts              # pure cart functions (add/remove item, totals, discounts)
│   ├── src/cart.test.ts         # generated tests
│   ├── jest.config.js           # Jest + ts-jest
│   ├── tsconfig.json
│   └── package.json
├── .github/workflows/
│   ├── test-agent.yml           # CI for the Python agent
│   └── sk-test-agent.yml        # CI for the Semantic Kernel agent
├── requirements.txt             # Python dependencies
└── .env.example                 # copy to .env and add your key
```

## Setup

```sh
cp .env.example .env   # then set ANTHROPIC_API_KEY

# TypeScript project (needed by both agents)
cd sample-ts
npm install
npm test
```

Note: `sample-ts` pins TypeScript to 6.x because ts-jest does not yet support TypeScript 7.

## Python agent (LangGraph)

Requires Python 3.12.

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python agent/main.py      # prints "ready" if the key is set
.venv/bin/python -m agent.graph     # run the agent
```

The agent is a LangGraph state graph with nodes for reading the source, generating tests, writing
them, running Jest and fixing failures. It stops when the tests pass or after 3 runs.

## Semantic Kernel agent (C#)

Requires the .NET 10 SDK and `npm install` in `sample-ts/`.

```sh
cd semantic-kernel-agent
dotnet run
```

Run it from inside `semantic-kernel-agent/`: it reads `ANTHROPIC_API_KEY` from `../.env` (or the
environment) and works on `../sample-ts`.

Unlike the Python agent's fixed graph, this agent uses **automatic function calling**. Claude
decides which tools to call and in what order. The tools come from `TestTools.cs`, registered as a
Semantic Kernel plugin:

| Tool | What it does | Guardrail |
|---|---|---|
| `read_source` | Reads a file from `sample-ts/src` | Paths outside `sample-ts/src` are rejected |
| `write_tests` | Writes a test file to `sample-ts/src` | Only `*.test.ts` files |
| `run_tests` | Runs `npm test` and returns PASSED/FAILED plus output | Refuses after 3 runs |

At the end it prints whether the last run passed, how many runs it took, and Claude's summary.

## CI

Both workflows run on pull requests and post the agent's output as a PR comment. They need an
`ANTHROPIC_API_KEY` repository secret.

| Workflow | Runs when a PR changes |
|---|---|
| `test-agent.yml` (Python) | `agent/**` or `sample-ts/src/**` |
| `sk-test-agent.yml` (Semantic Kernel) | `semantic-kernel-agent/**` or `sample-ts/src/**` |
