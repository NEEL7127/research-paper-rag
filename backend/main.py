from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import uuid

from pdf_chunker import process_pdf
from rag import ingest_chunks, answer_question

app = FastAPI()

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)


# ── Route 1: Upload PDF ───────────────────────────────────────
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF file
    Chunks it with overlap
    Embeds + stores in ChromaDB
    Returns collection_id
    """

    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    collection_id = str(uuid.uuid4())[:8]
    pdf_path = f"uploads/{collection_id}.pdf"

    # Save PDF temporarily
    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Process PDF → chunks
    chunks = process_pdf(pdf_path)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # Embed + store
    total = ingest_chunks(chunks, collection_id)

    # Cleanup
    os.remove(pdf_path)

    return {
        "collection_id": collection_id,
        "pages_processed": max(c["page_number"] for c in chunks),
        "chunks_stored": total,
        "message": "Paper indexed successfully!"
    }


# ── Route 2: Ask Question ─────────────────────────────────────
class QuestionRequest(BaseModel):
    collection_id: str
    question: str


@app.post("/ask")
async def ask_question(body: QuestionRequest):
    """
    Two-stage retrieval:
    1. Bi-encoder gets top 20
    2. Cross-encoder re-ranks to top 5
    3. Groq generates answer
    """

    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        result = answer_question(body.question, body.collection_id)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Route 3: Health check ─────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Research RAG with re-ranking is running 🚀"}