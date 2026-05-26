import re
from collections import Counter
from typing import Dict, List

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.services.embedding_service import embed_texts


def _split_sentences(text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [sentence.strip() for sentence in sentences if sentence.strip()]


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", text.lower())


def summarize_abstract(abstract: str, max_length: int = 150) -> Dict:
    sentences = _split_sentences(abstract)
    if not sentences:
        return {"summary": "", "keyPoints": []}

    if len(sentences) == 1:
        sentence = sentences[0]
        return {
            "summary": sentence[:max_length].strip(),
            "keyPoints": [sentence[:max_length].strip()],
        }

    embeddings = embed_texts(sentences)
    centroid = np.mean(embeddings, axis=0).reshape(1, -1)
    scores = [float(cosine_similarity(centroid, emb.reshape(1, -1))[0][0]) for emb in embeddings]

    ranked_indices = sorted(range(len(sentences)), key=lambda idx: scores[idx], reverse=True)
    selected = sorted(ranked_indices[: min(3, len(sentences))])

    summary_sentences = []
    key_points = []
    total_length = 0
    for idx in selected:
        sentence = sentences[idx]
        cleaned = sentence.strip()
        if not cleaned:
            continue
        if total_length + len(cleaned) > max_length and summary_sentences:
            continue
        summary_sentences.append(cleaned)
        key_points.append(cleaned)
        total_length += len(cleaned)

    if not summary_sentences:
        summary_sentences = [sentences[ranked_indices[0]][:max_length].strip()]
        key_points = summary_sentences[:]

    return {
        "summary": " ".join(summary_sentences)[:max_length].strip(),
        "keyPoints": key_points[:5],
    }


def extract_problem_statement(abstract: str) -> Dict:
    sentences = _split_sentences(abstract)
    if not sentences:
        return {"problem": "", "methodology": "", "results": ""}

    problem_sentence = _pick_sentence(sentences, ["problem", "challenge", "gap", "issue", "need", "objective"])
    methodology_sentence = _pick_sentence(sentences, ["method", "approach", "proposed", "we use", "using", "framework"])
    results_sentence = _pick_sentence(sentences, ["result", "show", "demonstrate", "improve", "performance", "finding"])

    if not problem_sentence:
        problem_sentence = sentences[0]
    if not methodology_sentence and len(sentences) > 1:
        methodology_sentence = sentences[min(1, len(sentences) - 1)]
    if not results_sentence:
        results_sentence = sentences[-1]

    return {
        "problem": problem_sentence[:220].strip(),
        "methodology": methodology_sentence[:220].strip(),
        "results": results_sentence[:220].strip(),
    }


def _pick_sentence(sentences: List[str], keywords: List[str]) -> str:
    lowered_keywords = [keyword.lower() for keyword in keywords]
    for sentence in sentences:
        lower_sentence = sentence.lower()
        if any(keyword in lower_sentence for keyword in lowered_keywords):
            return sentence
    return ""