import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Import routes
from app.routes import embedding_routes, recommendation_routes, summarization_routes

app = FastAPI(
    title="Scientific Journal Trend AI Service",
    description="AI-powered microservice for trend analysis, embeddings, recommendations, and summarization",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS Configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(embedding_routes.router, prefix="/api/v1/embeddings", tags=["Embeddings"])
app.include_router(recommendation_routes.router, prefix="/api/v1/recommendations", tags=["Recommendations"])
app.include_router(summarization_routes.router, prefix="/api/v1/summarization", tags=["Summarization"])

from app.routes import chat_routes
app.include_router(chat_routes.router, prefix="/api/v1/chat", tags=["Chat"])

_port = os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000"))
print(
    f"""
╔════════════════════════════════════════════════════════╗
║  Scientific Journal Trend — AI Service (FastAPI)       ║
╠════════════════════════════════════════════════════════╣
║  Port: {_port}
║  Health: /health
║  Docs:   /docs
╚════════════════════════════════════════════════════════╝
"""
)

@app.get("/health")
async def health_check():
    """Kiểm tra sức khỏe dịch vụ"""
    return {
        "status": "healthy",
        "service": "AI Service",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
    print(
        f"""
╔════════════════════════════════════════════════════════╗
║  Scientific Journal Trend — AI Service (FastAPI)       ║
╠════════════════════════════════════════════════════════╣
║  Port: {port}
║  Health: /health
║  Docs:   /docs
╚════════════════════════════════════════════════════════╝
"""
    )
    uvicorn.run(app, host="0.0.0.0", port=port)
