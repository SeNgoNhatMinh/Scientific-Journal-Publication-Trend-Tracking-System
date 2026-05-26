import math
import re
from collections import Counter, defaultdict
from typing import Dict, List, Optional

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.services.embedding_service import embed_texts


def _clean_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _paper_text(paper: Dict) -> str:
    parts = [
        paper.get("title", ""),
        paper.get("abstract", ""),
        " ".join(paper.get("keywords", []) or []),
    ]
    return _clean_text(" ".join(part for part in parts if part))


def _citation_boost(citation_count: int) -> float:
    if citation_count <= 0:
        return 0.0
    return min(1.0, math.log1p(citation_count) / 8.0)


def _keyword_overlap_score(user_interests: List[str], paper_keywords: List[str]) -> float:
    user_set = {item.lower().strip() for item in user_interests if item}
    paper_set = {item.lower().strip() for item in paper_keywords if item}
    if not user_set or not paper_set:
        return 0.0
    return len(user_set & paper_set) / len(user_set | paper_set)


def recommend_papers(
    user_interests: List[str],
    user_history: List[Dict],
    top_n: int = 10,
    candidate_papers: Optional[List[Dict]] = None,
) -> List[Dict]:
    pool = candidate_papers or user_history or []
    if not pool:
        return []

    interest_text = _clean_text(" ".join(user_interests))
    if not interest_text:
        interest_text = _clean_text(" ".join(_paper_text(paper) for paper in user_history))

    if not interest_text:
        return []

    texts = [interest_text] + [_paper_text(paper) for paper in pool]
    embeddings = embed_texts(texts)
    interest_embedding = embeddings[0].reshape(1, -1)

    scored = []
    for idx, paper in enumerate(pool, start=1):
        paper_embedding = embeddings[idx].reshape(1, -1)
        semantic_score = float(cosine_similarity(interest_embedding, paper_embedding)[0][0])
        keyword_score = _keyword_overlap_score(user_interests, paper.get("keywords", []) or [])
        citation_score = _citation_boost(int(paper.get("citationCount", 0) or 0))

        final_score = (semantic_score * 0.65) + (keyword_score * 0.2) + (citation_score * 0.15)
        scored.append(
            {
                **paper,
                "score": round(final_score, 4),
                "semanticScore": round(semantic_score, 4),
                "keywordScore": round(keyword_score, 4),
                "citationBoost": round(citation_score, 4),
                "reason": _build_recommendation_reason(user_interests, paper, semantic_score, keyword_score),
            }
        )

    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:top_n]


def _build_recommendation_reason(user_interests: List[str], paper: Dict, semantic_score: float, keyword_score: float) -> str:
    matched_keywords = sorted({
        keyword.lower().strip()
        for keyword in (paper.get("keywords", []) or [])
        if keyword and keyword.lower().strip() in {item.lower().strip() for item in user_interests}
    })

    if matched_keywords:
        return f"Matches your interests: {', '.join(matched_keywords)}"
    if semantic_score >= 0.65:
        return "High semantic similarity to your interests"
    if keyword_score >= 0.25:
        return "Keyword overlap with your reading history"
    return "Recommended for topic exploration"


def recommend_research_directions(keywords: List[str], top_n: int = 10) -> List[Dict]:
    cleaned = [keyword.strip() for keyword in keywords if keyword and keyword.strip()]
    if not cleaned:
        return []

    embeddings = embed_texts(cleaned)
    clusters = []
    used = set()
    similarity_threshold = 0.72

    for index, keyword in enumerate(cleaned):
        if index in used:
            continue

        cluster_indices = [index]
        used.add(index)
        for other_index in range(index + 1, len(cleaned)):
            if other_index in used:
                continue
            similarity = float(cosine_similarity(
                embeddings[index].reshape(1, -1),
                embeddings[other_index].reshape(1, -1),
            )[0][0])
            if similarity >= similarity_threshold:
                cluster_indices.append(other_index)
                used.add(other_index)

        cluster_keywords = [cleaned[i] for i in cluster_indices]
        cluster_embeddings = embeddings[cluster_indices]
        centroid = np.mean(cluster_embeddings, axis=0).reshape(1, -1)
        central_scores = [
            float(cosine_similarity(centroid, embeddings[i].reshape(1, -1))[0][0])
            for i in cluster_indices
        ]
        representative = cluster_keywords[int(np.argmax(central_scores))]
        growth_score = min(1.0, 0.4 + 0.15 * len(cluster_keywords))

        clusters.append(
            {
                "direction": _format_direction_name(representative),
                "keywords": cluster_keywords,
                "rationale": _build_direction_rationale(cluster_keywords),
                "confidence": round(float(np.mean(central_scores)), 4),
                "priority": round(growth_score, 4),
            }
        )

    clusters.sort(key=lambda item: (item["priority"], item["confidence"]), reverse=True)
    return clusters[:top_n]


def _format_direction_name(keyword: str) -> str:
    return keyword[:1].upper() + keyword[1:]


def _build_direction_rationale(keywords: List[str]) -> str:
    keyword_text = ", ".join(sorted({keyword.lower() for keyword in keywords}))
    return f"Research directions around {keyword_text} show semantic convergence and practical overlap."