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


def _to_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    return max(min_value, min(max_value, value))


def _trend_context_score(trend_context: Optional[Dict]) -> float:
    if not trend_context:
        return 0.5

    status_scores = {
        "exploding": 0.92,
        "growing": 0.78,
        "stable": 0.52,
        "declining": 0.28,
    }
    status_score = status_scores.get(str(trend_context.get("trendStatus", "")).lower(), 0.5)

    avg_growth = _to_float(trend_context.get("averageGrowthRate"), 0.0)
    growth_score = _clamp((avg_growth + 20.0) / 100.0)

    yearly = trend_context.get("trends") or trend_context.get("yearlyData") or []
    recent_growth = None
    if isinstance(yearly, list) and yearly:
        for item in reversed(yearly):
            if isinstance(item, dict) and item.get("growthRate") is not None:
                recent_growth = _to_float(item.get("growthRate"), None)
                break
    momentum_score = _clamp(((recent_growth if recent_growth is not None else avg_growth) + 20.0) / 100.0)

    return _clamp((status_score * 0.45) + (growth_score * 0.35) + (momentum_score * 0.20))


def _keyword_specificity_score(keyword: str) -> float:
    tokens = [token for token in re.split(r"[\s/_-]+", keyword.lower()) if token]
    if not tokens:
        return 0.25

    technical_markers = (
        "model", "learning", "network", "transformer", "mamba", "graph", "diffusion",
        "segmentation", "classification", "detection", "retrieval", "embedding",
        "federated", "contrastive", "multimodal", "vision", "language",
    )
    marker_bonus = 0.18 if any(marker in keyword.lower() for marker in technical_markers) else 0.0
    length_score = _clamp(len(tokens) / 5.0)
    return _clamp(0.25 + (length_score * 0.55) + marker_bonus)


def recommend_research_directions(
    keywords: List[str],
    trend_context: Optional[Dict] = None,
    top_n: int = 10,
) -> List[Dict]:
    cleaned = [keyword.strip() for keyword in keywords if keyword and keyword.strip()]
    if not cleaned:
        return []

    embeddings = embed_texts(cleaned)
    trend_score = _trend_context_score(trend_context)
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
        cluster_size_score = _clamp(math.log1p(len(cluster_keywords)) / math.log1p(6))
        if len(cleaned) > 1:
            related_scores = []
            for cluster_index in cluster_indices:
                similarities = [
                    float(cosine_similarity(
                        embeddings[cluster_index].reshape(1, -1),
                        embeddings[other_index].reshape(1, -1),
                    )[0][0])
                    for other_index in range(len(cleaned))
                    if other_index != cluster_index
                ]
                if similarities:
                    related_scores.append(float(np.mean(similarities)))
            relatedness_score = _clamp(((float(np.mean(related_scores)) if related_scores else 0.0) + 1.0) / 2.0)
        else:
            relatedness_score = 0.45
        specificity_score = _keyword_specificity_score(representative)
        confidence = float(np.mean(central_scores))
        priority = _clamp(
            (trend_score * 0.45) +
            (cluster_size_score * 0.15) +
            (relatedness_score * 0.20) +
            (specificity_score * 0.15) +
            (confidence * 0.05),
            0.05,
            0.98,
        )

        clusters.append(
            {
                "direction": _format_direction_name(representative),
                "keywords": cluster_keywords,
                "rationale": _build_direction_rationale(cluster_keywords, trend_context),
                "confidence": round(confidence, 4),
                "priority": round(priority, 4),
                "signals": {
                    "trend": round(trend_score, 4),
                    "clusterSize": round(cluster_size_score, 4),
                    "relatedness": round(relatedness_score, 4),
                    "specificity": round(specificity_score, 4),
                },
            }
        )

    clusters.sort(key=lambda item: (item["priority"], item["confidence"]), reverse=True)
    return clusters[:top_n]


def _format_direction_name(keyword: str) -> str:
    return keyword[:1].upper() + keyword[1:]


def _build_direction_rationale(keywords: List[str], trend_context: Optional[Dict] = None) -> str:
    keyword_text = ", ".join(sorted({keyword.lower() for keyword in keywords}))
    if trend_context:
        status = trend_context.get("trendStatus") or "tracked"
        growth = trend_context.get("averageGrowthRate")
        if growth is not None:
            return (
                f"Research directions around {keyword_text} are linked to a {status} trend "
                f"with average growth near {growth}%."
            )
    return f"Research directions around {keyword_text} show semantic convergence and practical overlap."
