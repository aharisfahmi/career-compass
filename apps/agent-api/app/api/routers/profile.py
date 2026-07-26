import json
import base64
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(prefix="/api/v1")


class ProfileInput(BaseModel):
    form_data: Dict[str, Any]
    cv_text: Optional[str] = None


@router.post("/profile/extract")
async def extract_profile(payload: ProfileInput):
    from app.agents.profile_agent import build_profile_agent
    agent = build_profile_agent()
    input_text = payload.cv_text or json.dumps(payload.form_data)
    result = await agent.arun(input_text)
    if hasattr(result, "content"):
        return {"profile": result.content}
    return {"profile": result}


@router.post("/profile/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    contents = await file.read()

    if file.filename.lower().endswith((".txt", ".md")):
        text = contents.decode("utf-8", errors="replace")
        return {"cv_text": text}

    if file.filename.lower().endswith(".pdf"):
        from app.utils.cv_parser import parse_cv_pdf
        try:
            text = await parse_cv_pdf(contents)
            return {"cv_text": text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

    raise HTTPException(status_code=400, detail="Supported formats: .pdf, .txt, .md")
