import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.utils.skill_taxonomy import normalize_skills


def test_normalize_sql():
    result = normalize_skills(["sql"])
    assert result[0]["canonical"] == "SQL"


def test_normalize_multiple():
    result = normalize_skills(["python", "react", "unknown_skill"])
    assert result[0]["canonical"] == "Python"
    assert result[1]["canonical"] == "React"
    assert result[2]["canonical"] == "unknown_skill"


def test_normalize_case_insensitive():
    result = normalize_skills(["PYTHON", "ReAcT"])
    assert result[0]["canonical"] == "Python"
    assert result[1]["canonical"] == "React"
