from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile
from pypdf import PdfReader

from app.core.config import MAX_PDF_BYTES
from app.schemas import DocumentTextOut

router = APIRouter()

PDF_TYPE = "application/pdf"


@router.post("/documents", response_model=DocumentTextOut)
async def post_document(file: UploadFile = File(...)) -> DocumentTextOut:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in {PDF_TYPE, "application/x-pdf"} and not filename.endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF uploads are accepted")
    data = await file.read()
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF larger than 10 MB")
    try:
        reader = PdfReader(BytesIO(data), strict=False)
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not read PDF; paste the specification text instead") from exc
    text = "\n".join(pages).strip()
    if not text:
        raise HTTPException(
            status_code=422,
            detail="No extractable text (scanned image PDF). Paste the specification text instead.",
        )
    return DocumentTextOut(text=text)
