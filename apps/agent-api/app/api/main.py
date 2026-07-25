from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routers import workflow, session, profile

app = FastAPI(title="CareerCompass API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflow.router)
app.include_router(session.router)
app.include_router(profile.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
