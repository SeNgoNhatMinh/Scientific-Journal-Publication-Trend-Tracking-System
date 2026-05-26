import os
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


_embedding_model = None


def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        model_name = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
        _embedding_model = SentenceTransformer(model_name)

    return _embedding_model


def embed_text(text: str) -> np.ndarray:
    model = get_embedding_model()
    return model.encode(text, convert_to_numpy=True)


def embed_texts(texts: List[str]) -> np.ndarray:
    model = get_embedding_model()
    return model.encode(texts, convert_to_numpy=True)


def compute_similarity(text1: str, text2: str) -> float:
    embeddings = embed_texts([text1, text2])
    return float(
        cosine_similarity(
            embeddings[0].reshape(1, -1),
            embeddings[1].reshape(1, -1),
        )[0][0]
    )