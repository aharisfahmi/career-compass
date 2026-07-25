import base64
from mistralai import Mistral
from app.core.config import settings


async def parse_cv_pdf(pdf_bytes: bytes) -> str:
    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    base64_pdf = base64.b64encode(pdf_bytes).decode()
    response = await client.ocr.process_async(
        model="mistral-ocr-latest",
        document={
            "type": "base64",
            "document": base64_pdf,
        },
        include_image_base64=False,
    )
    return "\n\n".join(page.markdown for page in response.pages)
