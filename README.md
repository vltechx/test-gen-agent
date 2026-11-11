# test-gen-agent

An agent (Python, LangGraph + Claude) that generates Jest tests for a sample TypeScript project.

## Layout

```
test-gen-agent/
├── agent/              # Python agent package (LangGraph + langchain-anthropic)
│   ├── __init__.py
│   └── main.py         # entry point; currently only checks ANTHROPIC_API_KEY
├── sample-ts/          # TypeScript code the agent writes tests for
│   ├── src/cart.ts     # pure cart functions (add/remove item, totals, discounts)
│   ├── tests/          # generated tests go here (*.test.ts); intentionally empty
│   ├── jest.config.js  # Jest + ts-jest
│   ├── tsconfig.json
│   └── package.json
├── requirements.txt    # Python dependencies
├── .env.example        # copy to .env and add your key
└── .venv/              # Python 3.12 virtualenv (not committed)
```

## Setup

```sh
# Python
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # then set ANTHROPIC_API_KEY
.venv/bin/python agent/main.py   # prints "ready"

# TypeScript
cd sample-ts
npm install
npm test               # passes with no tests until the agent generates some
```

Note: `sample-ts` pins TypeScript to 6.x because ts-jest does not yet support TypeScript 7.
