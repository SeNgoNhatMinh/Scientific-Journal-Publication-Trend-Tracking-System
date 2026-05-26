from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.summarization_service import (
    extract_problem_statement,
    summarize_abstract as run_summarize_abstract,
)

router = APIRouter()

class AbstractInput(BaseModel):
    """Abstract text to summarize"""
    abstract: str
    maxLength: Optional[int] = 150

@router.post("/abstract")
async def summarize_abstract(input: AbstractInput):
    """
    Tóm tắt abstract học thuật thành các ý chính
    Dùng mô hình cục bộ nhẹ (Phi-3 Mini hoặc tương đương)
    """
    try:
        result = run_summarize_abstract(input.abstract, input.maxLength or 150)
        return {
            "success": True,
            "message": "Summarization engine active",
            "summary": result["summary"],
            "keyPoints": result["keyPoints"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/extract-problem")
async def extract_problem(input: AbstractInput):
    """
    Trích xuất phát biểu vấn đề nghiên cứu từ abstract
    """
    try:
        result = extract_problem_statement(input.abstract)
        return {
            "success": True,
            "problem": result["problem"],
            "methodology": result["methodology"],
            "results": result["results"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
