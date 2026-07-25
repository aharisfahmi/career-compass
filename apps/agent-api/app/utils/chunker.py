def clean_snippet(text: str, max_length: int = 200) -> str:
    if len(text) > max_length:
        return text[:max_length] + "..."
    return text
