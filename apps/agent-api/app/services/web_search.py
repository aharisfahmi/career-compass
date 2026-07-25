from app.core.config import settings


def tavily_search(query: str, include_domains: list[str] | None = None, max_results: int = 10) -> list[dict]:
    if not settings.TAVILY_API_KEY:
        raise RuntimeError("TAVILY_API_KEY not configured")
    from tavily import TavilyClient
    client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    kwargs = {
        "query": query,
        "max_results": max_results,
        "search_depth": "advanced",
    }
    if include_domains:
        kwargs["include_domains"] = include_domains
    response = client.search(**kwargs)
    return [
        {
            "title": r["title"],
            "url": r["url"],
            "snippet": r["content"],
            "source": "tavily",
        }
        for r in response.get("results", [])
    ]


def duckduckgo_fallback(query: str, max_results: int = 10) -> list[dict]:
    results = []
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r["title"],
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                    "source": "ddgs",
                })
    except Exception:
        pass
    return results
