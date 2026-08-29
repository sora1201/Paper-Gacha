"""Persist Paper Gacha settings supplied by the Configure Paper Gacha workflow."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).parents[1]
CONFIG_FILE = ROOT / "paper_gacha_config.json"
DEFAULT_SERENDIPITY_TOPICS = {
    "biology": "biology",
    "physics": "physics",
    "history": "history",
    "culture": "culture",
    "language": "linguistics",
}


def phrases(value: str) -> list[str]:
    values = [part.strip() for part in value.split(",") if part.strip()]
    if not values:
        raise ValueError("Enter at least one comma-separated phrase.")
    return values


def positive_int(value: str, name: str) -> int:
    number = int(value)
    if number < 1:
        raise ValueError(f"{name} must be at least 1.")
    return number


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expertise", required=True)
    parser.add_argument("--related", required=True)
    parser.add_argument("--core-count", required=True)
    parser.add_argument("--related-count", required=True)
    parser.add_argument("--serendipity-count", required=True)
    parser.add_argument("--lookback-days", required=True)
    for field in DEFAULT_SERENDIPITY_TOPICS:
        parser.add_argument(f"--include-{field}", required=True)
    args = parser.parse_args()

    config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    config["research"]["expertise"] = phrases(args.expertise)
    config["research"]["related"] = phrases(args.related)
    config["selection"]["core_count"] = positive_int(args.core_count, "Core count")
    config["selection"]["related_count"] = positive_int(args.related_count, "Related count")
    config["selection"]["serendipity_count"] = positive_int(args.serendipity_count, "Serendipity count")
    config["selection"]["lookback_days"] = positive_int(args.lookback_days, "Lookback days")
    config["serendipity_topics"] = {
        field: query
        for field, query in DEFAULT_SERENDIPITY_TOPICS.items()
        if getattr(args, f"include_{field}").lower() == "true"
    }
    if not config["serendipity_topics"]:
        raise ValueError("Select at least one serendipity field.")

    CONFIG_FILE.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Saved Paper Gacha configuration.")


if __name__ == "__main__":
    main()
