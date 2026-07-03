from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.rag_service import ask_assistant

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    user_id: Optional[str] = None
    
class Source(BaseModel):
    title: Optional[str] = None
    doi: Optional[str] = None
    year: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source] = []

@router.post("/ask", response_model=ChatResponse)
async def ai_chat(req: ChatRequest):
    """
    RAG Chatbot using LangChain Agent.
    It queries the local MongoDB first and fallbacks to ArXiv.
    """
    try:
        result = await ask_assistant(req.question, req.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
