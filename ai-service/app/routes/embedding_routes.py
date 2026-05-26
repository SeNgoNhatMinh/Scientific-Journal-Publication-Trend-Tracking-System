from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.embedding_service import (
    compute_similarity as compute_text_similarity,
    embed_text as generate_embedding,
    embed_texts as generate_embeddings,
)

router = APIRouter()

class TextInput(BaseModel):
    """Single text for embedding"""
    text: str

class TextListInput(BaseModel):
    """Multiple texts for embedding"""
    texts: List[str]

class SimilarityInput(BaseModel):
    """Two texts for similarity comparison"""
    text1: str
    text2: str

@router.post("/embed")
async def embed_text(input: TextInput):
    """
    Sinh embedding cho một đoạn văn
    Trả về vector 384 chiều từ all-MiniLM-L6-v2
    """
    try:
        embedding = generate_embedding(input.text)
        return {
            "success": True,
            "text": input.text,
            "embedding": embedding.tolist(),
            "dimension": len(embedding)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/embed-batch")
async def embed_batch(input: TextListInput):
    """
    Sinh embedding hàng loạt
    Xử lý theo lô hiệu quả
    """
    try:
        embeddings = generate_embeddings(input.texts)
        return {
            "success": True,
            "count": len(input.texts),
            "embeddings": [emb.tolist() for emb in embeddings],
            "dimension": embeddings.shape[1]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/similarity")
async def compute_similarity(input: SimilarityInput):
    """
    Tính độ tương đồng cosine giữa hai đoạn văn
    Điểm từ -1 đến 1 (thường 0–1 với văn tương tự)
    """
    try:
        similarity = compute_text_similarity(input.text1, input.text2)
        
        return {
            "success": True,
            "text1": input.text1,
            "text2": input.text2,
            "similarity": similarity,
            "interpretation": "High similarity" if similarity > 0.7 else "Low similarity"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
