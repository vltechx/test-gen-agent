import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root, regardless of the current working directory.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def main() -> int:
    if os.getenv("ANTHROPIC_API_KEY"):
        print("ready")
        return 0
    print("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
