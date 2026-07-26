from mistralai import Mistral
from app.core.config import settings


async def parse_cv_pdf(pdf_bytes: bytes) -> str:
    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    uploaded = await client.files.upload_async(
        file={
            "file_name": "cv.pdf",
            "content": pdf_bytes,
        },
        purpose="ocr",
    )
    signed = await client.files.get_signed_url_async(file_id=uploaded.id)
    response = await client.ocr.process_async(
        model="mistral-ocr-latest",
        document={
            "type": "document_url",
            "document_url": signed.url,
        },
        include_image_base64=False,
    )
    return "\n\n".join(page.markdown for page in response.pages)
