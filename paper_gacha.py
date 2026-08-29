"""Select ten research papers and publish them as a Bluesky reply thread."""
from __future__ import annotations

import html
import json
import os
import random
import re
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

import feedparser
import requests
from atproto import Client, client_utils, models
from sentence_transformers import SentenceTransformer, util

ROOT = Path(__file__).parent
HISTORY_FILE = ROOT / "data" / "posted_papers.json"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
HEADERS = {"User-Agent": "paper-gacha/1.0 (personal research discovery bot)"}


@dataclass
class Paper:
    uid: str
    title: str
    abstract: str
    url: str
    fields: list[str]
    source: str
    published: str = ""
    score: float = 0.0


def env_list(name: str, default: str) -> list[str]:
    values = [x.strip() for x in (os.getenv(name) or default).split(",") if x.strip()]
    if not values:
        raise RuntimeError(f"{name} must contain at least one comma-separated value.")
    return values


def env_positive_int(name: str, default: int) -> int:
    value = os.getenv(name) or str(default)
    try:
        number = int(value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a positive integer, got {value!r}.") from exc
    if number < 1:
        raise RuntimeError(f"{name} must be a positive integer, got {value!r}.")
    return number


def env_non_negative_float(name: str, default: float) -> float:
    value = os.getenv(name) or str(default)
    try:
        number = float(value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a non-negative number, got {value!r}.") from exc
    if number < 0:
        raise RuntimeError(f"{name} must be a non-negative number, got {value!r}.")
    return number


DIVERSE_TOPICS = {
    "biology": "biology",
    "physics": "physics",
    "history": "history",
    "culture": "culture",
    "language": "linguistics",
}


def env_diverse_topics() -> dict[str, str]:
    names = env_list("PAPER_GACHA_SERENDIPITY_TOPICS", ",".join(DIVERSE_TOPICS))
    unknown = sorted(set(names) - set(DIVERSE_TOPICS))
    if unknown:
        choices = ", ".join(DIVERSE_TOPICS)
        raise RuntimeError(f"PAPER_GACHA_SERENDIPITY_TOPICS contains unknown topics: {', '.join(unknown)}. Choose from: {choices}.")
    return {name: DIVERSE_TOPICS[name] for name in names}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def arxiv(query: str, limit: int = 35) -> list[Paper]:
    response = requests.get(
        "https://export.arxiv.org/api/query",
        params={"search_query": f"all:{query}", "start": 0, "max_results": limit, "sortBy": "submittedDate", "sortOrder": "descending"},
        headers=HEADERS, timeout=30,
    )
    response.raise_for_status()
    feed = feedparser.parse(response.text)
    return [Paper(
        uid=f"arxiv:{entry.id.rsplit('/', 1)[-1]}", title=clean(entry.title), abstract=clean(entry.summary),
        url=entry.id.replace("http:", "https:"), fields=[tag.term for tag in getattr(entry, "tags", [])],
        source="arXiv", published=getattr(entry, "published", ""),
    ) for entry in feed.entries]


def openalex(query: str, limit: int, lookback_days: int) -> list[Paper]:
    response = requests.get("https://api.openalex.org/works", params={
        "search": query, "per-page": limit, "sort": "publication_date:desc",
        "filter": f"from_publication_date:{(datetime.now(timezone.utc)-timedelta(days=lookback_days)).date()},to_publication_date:{datetime.now(timezone.utc).date()}",
    }, headers=HEADERS, timeout=30)
    response.raise_for_status()
    papers = []
    for work in response.json().get("results", []):
        if work.get("type") not in {"article", "preprint"}:
            continue
        published = work.get("publication_date", "")
        if published and published > str(date.today()):
            continue
        inverted = work.get("abstract_inverted_index") or {}
        words = sorted(((pos, word) for word, positions in inverted.items() for pos in positions))
        abstract = " ".join(word for _, word in words)
        concepts = [c["display_name"] for c in work.get("concepts", [])[:4]]
        location = work.get("best_oa_location") or {}
        url = location.get("pdf_url") or location.get("landing_page_url") or work.get("doi") or work.get("id")
        papers.append(Paper(f"openalex:{work['id'].rsplit('/', 1)[-1]}", clean(work.get("title", "")), clean(abstract),
                            url, concepts, "OpenAlex", published))
    return papers


def semantic_scholar(query: str, limit: int = 35) -> list[Paper]:
    headers = dict(HEADERS)
    if os.getenv("SEMANTIC_SCHOLAR_API_KEY"):
        headers["x-api-key"] = os.environ["SEMANTIC_SCHOLAR_API_KEY"]
    response = requests.get("https://api.semanticscholar.org/graph/v1/paper/search", params={
        "query": query, "limit": limit, "fields": "paperId,title,abstract,url,fieldsOfStudy,publicationDate",
    }, headers=headers, timeout=30)
    response.raise_for_status()
    return [Paper(f"s2:{p['paperId']}", clean(p.get("title", "")), clean(p.get("abstract", "")),
                  p.get("url", f"https://www.semanticscholar.org/paper/{p['paperId']}"), p.get("fieldsOfStudy") or [],
                  "Semantic Scholar", p.get("publicationDate") or "") for p in response.json().get("data", [])]


def fetch(query: str, limit: int, lookback_days: int) -> list[Paper]:
    results: list[Paper] = []
    for source in (arxiv, openalex, semantic_scholar):
        try:
            papers = openalex(query, limit, lookback_days) if source is openalex else source(query, limit)
            cutoff = str(date.today() - timedelta(days=lookback_days))
            results.extend(paper for paper in papers if not paper.published or paper.published[:10] >= cutoff)
        except requests.RequestException as exc:
            print(f"Warning: {source.__name__} failed for {query}: {exc}")
        time.sleep(1)
    return results


def unique(papers: Iterable[Paper], posted: set[str], minimum_abstract_characters: int) -> list[Paper]:
    seen, kept = set(), []
    for p in papers:
        key = re.sub(r"[^a-z0-9]", "", p.title.lower())[:100]
        future_dated = bool(p.published and p.published[:10] > str(date.today()))
        if p.uid not in posted and key and key not in seen and len(p.abstract) > minimum_abstract_characters and not future_dated:
            seen.add(key); kept.append(p)
    return kept


def ranked(papers: list[Paper], profile: list[str], count: int, keyword_match_bonus: float, model: SentenceTransformer) -> list[Paper]:
    if not papers:
        return []
    query = " ".join(profile)
    vectors = model.encode([query] + [f"{p.title}. {p.abstract}" for p in papers], convert_to_tensor=True, normalize_embeddings=True)
    similarities = util.cos_sim(vectors[0], vectors[1:])[0].cpu().tolist()
    for p, score in zip(papers, similarities):
        # Small transparent bonus for explicit keyword matches.
        text = (p.title + " " + p.abstract).lower()
        p.score = float(score) + keyword_match_bonus * sum(term.lower() in text for term in profile)
    return sorted(papers, key=lambda p: p.score, reverse=True)[:count]


def diverse_pick(papers_by_field: dict[str, list[Paper]], count: int = 3) -> list[Paper]:
    available = [(field, papers) for field, papers in papers_by_field.items() if papers]
    random.shuffle(available)
    chosen = []
    for field, papers in available:
        chosen.append(random.choice(papers))
        if len(chosen) == count:
            return chosen
    # Graceful fallback if a public API had a sparse result.
    remainder = [p for _, papers in available for p in papers if p.uid not in {x.uid for x in chosen}]
    random.shuffle(remainder)
    return chosen + remainder[:count-len(chosen)]


def one_sentence(abstract: str) -> str:
    sentence = re.split(r"(?<=[.!?])\s+", abstract)[0].strip()
    return sentence[:180].rstrip(" ,;:") + ("…" if len(sentence) > 180 else "")


def paper_line(paper: Paper) -> str:
    year = paper.published[:4] if re.fullmatch(r"\d{4}", paper.published[:4]) else "n.d."
    fields = ", ".join(paper.fields) or "Unclassified"
    return f"• {paper.title} ({year})\n  • {fields}"


def category_pages(category: str, papers: list[Paper], limit: int) -> list[list[Paper]]:
    """Split only between papers; never shorten a title, year, or keyword."""
    pages, current = [], []
    heading = f"Paper Gacha ~{category}~"
    for paper in papers:
        candidate = "\n".join([heading] + [paper_line(x) for x in current + [paper]])
        if current and len(candidate) > limit:
            pages.append(current)
            current = [paper]
        else:
            current.append(paper)
    if current:
        pages.append(current)
    return pages


def category_text(category: str, papers: list[Paper], continuation: bool) -> str:
    heading = f"Paper Gacha ~{category}~" + (" (cont.)" if continuation else "")
    return "\n".join([heading] + [paper_line(paper) for paper in papers])


def category_content(category: str, papers: list[Paper], continuation: bool) -> client_utils.TextBuilder:
    heading = f"Paper Gacha ~{category}~" + (" (cont.)" if continuation else "")
    content = client_utils.TextBuilder().text(heading)
    for paper in papers:
        year = paper.published[:4] if re.fullmatch(r"\d{4}", paper.published[:4]) else "n.d."
        fields = ", ".join(paper.fields) or "Unclassified"
        content.text("\n• ").link(paper.title, paper.url).text(f" ({year})\n  • {fields}")
    return content


def load_history() -> set[str]:
    HISTORY_FILE.parent.mkdir(exist_ok=True)
    if not HISTORY_FILE.exists(): return set()
    return set(json.loads(HISTORY_FILE.read_text(encoding="utf-8")))


def save_history(history: set[str], history_limit: int) -> None:
    # Retain enough history for durable deduplication without endlessly growing the repo.
    HISTORY_FILE.write_text(json.dumps(sorted(history)[-history_limit:], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def login_with_retry(client: Client, handle: str, password: str, attempts: int = 3) -> None:
    """Retry only login: retrying a timed-out post could duplicate a Bluesky post."""
    for attempt in range(1, attempts + 1):
        try:
            client.login(handle, password)
            return
        except Exception as exc:
            if attempt == attempts:
                raise
            delay = 5 * (2 ** (attempt - 1))
            print(f"Warning: Bluesky login failed ({exc}); retrying in {delay}s ({attempt}/{attempts})")
            time.sleep(delay)


def main() -> None:
    expertise = env_list("PAPER_GACHA_EXPERTISE", "robotics, robot learning, embodied AI")
    related = env_list("PAPER_GACHA_RELATED", "computer vision, reinforcement learning, human-robot interaction")
    core_count = env_positive_int("PAPER_GACHA_CORE_COUNT", 4)
    related_count = env_positive_int("PAPER_GACHA_RELATED_COUNT", 3)
    serendipity_count = env_positive_int("PAPER_GACHA_SERENDIPITY_COUNT", 3)
    lookback_days = env_positive_int("PAPER_GACHA_LOOKBACK_DAYS", 365)
    candidates_per_source = env_positive_int("PAPER_GACHA_CANDIDATES_PER_SOURCE", 35)
    serendipity_candidates_per_source = env_positive_int("PAPER_GACHA_SERENDIPITY_CANDIDATES_PER_SOURCE", 15)
    minimum_abstract_characters = env_positive_int("PAPER_GACHA_MINIMUM_ABSTRACT_CHARACTERS", 30)
    keyword_match_bonus = env_non_negative_float("PAPER_GACHA_KEYWORD_MATCH_BONUS", 0.03)
    max_post_characters = env_positive_int("PAPER_GACHA_MAX_POST_CHARACTERS", 280)
    history_limit = env_positive_int("PAPER_GACHA_HISTORY_LIMIT", 5000)
    diverse_topics = env_diverse_topics()
    posted = load_history()
    print("Collecting papers from public APIs…")
    expert = unique(fetch(" ".join(expertise), candidates_per_source, lookback_days), posted, minimum_abstract_characters)
    related_papers = unique(fetch(" ".join(related), candidates_per_source, lookback_days), posted, minimum_abstract_characters)
    diverse = {field: unique(fetch(query, serendipity_candidates_per_source, lookback_days), posted, minimum_abstract_characters) for field, query in diverse_topics.items()}
    model = SentenceTransformer(MODEL_NAME)
    selections = {
        "Core": ranked(expert, expertise, core_count, keyword_match_bonus, model),
        "Related": ranked(related_papers, related, related_count, keyword_match_bonus, model),
        "Serendipity": diverse_pick(diverse, serendipity_count),
    }
    expected_count = core_count + related_count + serendipity_count
    if sum(len(papers) for papers in selections.values()) != expected_count:
        raise RuntimeError(f"Only selected fewer than {expected_count} papers; retry later or broaden your query settings.")
    dry_run = os.getenv("PAPER_GACHA_DRY_RUN", "false").lower() == "true"
    if dry_run:
        for category, papers in selections.items():
            for i, page in enumerate(category_pages(category, papers, max_post_characters)):
                print("\n" + category_text(category, page, continuation=i > 0))
        return
    handle, password = os.getenv("BLUESKY_HANDLE"), os.getenv("BLUESKY_APP_PASSWORD")
    if not handle or not password: raise RuntimeError("Set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD (or use PAPER_GACHA_DRY_RUN=true).")
    client = Client(); login_with_retry(client, handle, password)
    posted_this_run: set[str] = set()
    for category, papers in selections.items():
        root_ref = parent_ref = None
        for i, page in enumerate(category_pages(category, papers, max_post_characters)):
            response = client.send_post(
                text=category_content(category, page, continuation=i > 0),
                **({"reply_to": models.AppBskyFeedPost.ReplyRef(root=root_ref, parent=parent_ref)} if parent_ref else {}),
            )
            parent_ref = models.ComAtprotoRepoStrongRef.Main(uri=response.uri, cid=response.cid)
            root_ref = root_ref or parent_ref
            posted_this_run.update(paper.uid for paper in page)
            save_history(posted | posted_this_run, history_limit)
            print(f"Posted {category} page {i + 1}")


if __name__ == "__main__":
    main()
