from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.recommendation_service import (
    recommend_papers as run_recommend_papers,
    recommend_research_directions as run_recommend_research_directions,
)

router = APIRouter()

class PaperInput(BaseModel):
    """Paper data for recommendation"""
    paperId: str
    title: str
    abstract: str = ""
    keywords: List[str] = []
    citationCount: int = 0
    authors: Optional[List[str]] = None

class RecommendationRequest(BaseModel):
    """Request for paper recommendations"""
    userInterests: List[str]
    userHistory: List[PaperInput] = []
    topN: int = 10
    candidatePapers: Optional[List[PaperInput]] = None


class ResearchDirectionsRequest(BaseModel):
    """Keywords for research direction recommendations"""
    keywords: List[str]

@router.post("/papers")
async def recommend_papers(request: RecommendationRequest):
    """
    Gợi ý bài báo theo sở thích và lịch sử người dùng
    Dùng độ tương đồng ngữ nghĩa và số trích dẫn
    """
    try:
        recommendations = run_recommend_papers(
            user_interests=request.userInterests,
            user_history=[paper.model_dump() for paper in request.userHistory],
            top_n=request.topN,
            candidate_papers=[paper.model_dump() for paper in request.candidatePapers] if request.candidatePapers else None,
        )
        return {
            "success": True,
            "message": "Recommendation engine active",
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/research-directions")
async def recommend_research_directions(request: ResearchDirectionsRequest):
    """
    Gợi ý hướng nghiên cứu triển vọng từ xu hướng từ khóa
    """
    try:
        directions = run_recommend_research_directions(request.keywords)
        return {
            "success": True,
            "message": "Research direction recommendations active",
            "directions": directions
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
