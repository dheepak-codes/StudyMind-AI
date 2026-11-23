from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import rate_limit
from app.db import get_db
from app.deps import current_user, log_activity
from app.models import Chunk, Document, User
from app.schemas import AskIn
from app.services import llm, rag

router = APIRouter(prefix="/api/documents", tags=["documents"])


def doc_out(d: Document) -> dict:
    return {"id": d.id, "title": d.title, "file_type": d.file_type, "status": d.status,
            "error": d.error, "pages": d.page_count, "passages": d.chunk_count,
            "created_at": d.created_at.isoformat()}


def own_doc(db: Session, user: User, doc_id: int) -> Document:
    doc = db.get(Document, doc_id)
    if not doc or doc.user_id != user.id:  # 404 (not 403) so IDs of others are not revealed
        raise HTTPException(404, "Document not found.")
    return doc


@router.post("", status_code=201, dependencies=[Depends(rate_limit(20, 3600))])
def upload(file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {get_settings().max_upload_mb} MB.")
    if not data.startswith(b"%PDF-"):  # check real content, not just the filename
        raise HTTPException(415, "Only PDF files are accepted.")
    title = (file.filename or "Untitled").rsplit(".", 1)[0][:255]
    doc = Document(user_id=user.id, title=title, file_type="pdf", status="processing")
    db.add(doc)
    db.commit()
    try:
        rag.index_document(db, doc, rag.extract_pages(data))
    except (rag.PDFError, llm.LLMError) as e:
        db.rollback()
        doc.status, doc.error = "failed", str(e)[:300]
    db.commit()
    return doc_out(doc)  # the raw file is not stored, only extracted text + embeddings


@router.get("")
def list_documents(user: User = Depends(current_user), db: Session = Depends(get_db)):
    docs = db.scalars(select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc()))
    return [doc_out(d) for d in docs]


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(own_doc(db, user, doc_id))
    db.commit()


@router.post("/ask", dependencies=[Depends(rate_limit(30, 60))])
def ask(body: AskIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        passages = rag.retrieve(db, user.id, body.question, body.document_ids)
        if not passages:
            return {"answer": "I couldn't find anything in your documents. Upload notes first.", "sources": []}
        answer = llm.generate(
            f"Answer using ONLY these excerpts. If they don't contain the answer, say so.\n\n"
            f"{rag.format_context(passages)}\n\nQuestion: {body.question}")
    except llm.LLMError as e:
        raise HTTPException(502, str(e))
    log_activity(db, user, "notes", body.question)
    return {"answer": answer,
            "sources": [{k: p[k] for k in ("document", "page", "score")} for p in passages]}


@router.post("/{doc_id}/summary", dependencies=[Depends(rate_limit(10, 60))])
def summary(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc = own_doc(db, user, doc_id)
    if doc.status != "ready":
        raise HTTPException(409, "This document is not ready.")
    text = "\n".join(db.scalars(select(Chunk.text).where(Chunk.document_id == doc.id).order_by(Chunk.idx)))[:30000]
    try:
        notes = llm.generate(f"Write concise revision notes (bullet points) from this material:\n\n{text}")
    except llm.LLMError as e:
        raise HTTPException(502, str(e))
    return {"document": doc.title, "notes": notes, "truncated": len(text) >= 30000}
