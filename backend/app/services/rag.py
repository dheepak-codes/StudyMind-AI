"""RAG = Retrieval-Augmented Generation.
1) extract text from PDF  2) split into chunks  3) embed chunks (numbers that capture meaning)
4) at question time, embed the question and find the closest chunks  5) give those to the LLM.
Embeddings are stored in the database and compared with numpy. For a student project this is
simple and enough; FAISS can replace `retrieve` later if documents grow very large."""
import io

import numpy as np
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Chunk, Document
from app.services import llm


class PDFError(ValueError):
    pass


def extract_pages(data: bytes) -> list[tuple[int, str]]:
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise PDFError("Password-protected PDFs are not supported.")
        pages = [(i + 1, (p.extract_text() or "").strip()) for i, p in enumerate(reader.pages)]
    except PDFError:
        raise
    except Exception as e:
        raise PDFError("This file could not be read as a PDF.") from e
    pages = [(n, t) for n, t in pages if t]
    if not pages:
        raise PDFError("No text found. Scanned/image-only PDFs are not supported (no OCR).")
    return pages


def chunk_pages(pages: list[tuple[int, str]], size: int = 1000, overlap: int = 150):
    chunks = []
    for page, text in pages:
        start = 0
        while start < len(text):
            piece = text[start:start + size].strip()
            if len(piece) > 40:
                chunks.append((page, piece))
            start += size - overlap
    return chunks


def index_document(db: Session, doc: Document, pages: list[tuple[int, str]]):
    chunks = chunk_pages(pages)
    if not chunks:
        raise PDFError("The document has too little text to index.")
    vectors = llm.embed([t for _, t in chunks])
    for i, ((page, text), vec) in enumerate(zip(chunks, vectors)):
        db.add(Chunk(document_id=doc.id, user_id=doc.user_id, idx=i, page=page, text=text, embedding=vec))
    doc.page_count = len(pages)
    doc.chunk_count = len(chunks)
    doc.status = "ready"


def retrieve(db: Session, user_id: int, question: str, document_ids: list[int] | None = None, k: int = 4):
    """Only ever searches the caller's own chunks (user_id filter = authorization)."""
    q = select(Chunk).join(Document).where(Chunk.user_id == user_id, Document.status == "ready")
    if document_ids:
        q = q.where(Chunk.document_id.in_(document_ids))
    rows = db.scalars(q).all()
    if not rows:
        return []
    qv = np.array(llm.embed([question])[0])
    mat = np.array([r.embedding for r in rows])
    sims = mat @ qv / (np.linalg.norm(mat, axis=1) * np.linalg.norm(qv) + 1e-9)
    top = np.argsort(-sims)[:k]
    docs = {d.id: d.title for d in db.scalars(select(Document).where(Document.id.in_(list({rows[i].document_id for i in top}))))}
    return [
        {"document": docs.get(rows[i].document_id, ""), "document_id": rows[i].document_id,
         "page": rows[i].page, "score": round(float(sims[i]), 3), "text": rows[i].text}
        for i in top
    ]


def format_context(passages: list[dict]) -> str:
    return "\n\n".join(f"[{p['document']}, page {p['page']}]\n{p['text']}" for p in passages)
