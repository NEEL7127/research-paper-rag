# 📄 Research Paper RAG — Ask Your Paper

Upload any research paper as PDF and ask questions about it in natural language.
Powered by a 4-stage advanced RAG pipeline with re-ranking.

---

## 🧠 What makes this different from basic RAG

Most RAG projects: question → top 6 chunks → LLM

This project:
1. **Query Expansion** — Groq rewrites your question 3 ways for better recall
2. **Hybrid Search** — semantic (70%) + keyword (30%) combined
3. **Cross-encoder Re-ranking** — re-scores top 10 chunks for true relevance
4. **Context Stitching** — merges chunks from same page for clean context

---

## 🎯 Example questions

- "What is the main contribution of this paper?"
- "How does the proposed method work?"
- "What were the experimental results?"
- "What limitations did the authors mention?"

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Tailwind CSS |
| Backend | FastAPI |
| PDF Parsing | PyMuPDF |
| Vector DB | ChromaDB |
| Bi-encoder | sentence-transformers (all-MiniLM-L6-v2) |
| Re-ranker | cross-encoder (ms-marco-TinyBERT-L-2-v2) |
| LLM | Groq (llama-3.1-8b-instant) |

---

## ⚙️ How the pipeline works
```
PDF Upload → Extract text → Chunk (500 words, 100 overlap)
                                        ↓
                     Bi-encoder embeds → ChromaDB stores

User Question → Query expansion (3 versions)
                        ↓
              Hybrid search (semantic + keyword)
                        ↓
              Cross-encoder re-ranking → top 5
                        ↓
              Context stitching (merge by page)
                        ↓
              Structured prompt → Groq → Answer
```

---

## 🚀 Run Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your Groq API key to .env
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 📁 Project Structure
```
research-rag/
├── backend/
│   ├── main.py         # FastAPI routes
│   ├── rag.py          # Full RAG pipeline
│   └── pdf_chunker.py  # PDF extraction + chunking
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── Upload.jsx
            └── Chat.jsx
```

---

## 🧠 Key Concepts Learned

- Sliding window chunking with overlap
- Bi-encoder vs cross-encoder difference
- Hybrid search (semantic + keyword scoring)
- Query expansion for better recall
- Re-ranking pipeline for precision
- Context stitching for clean LLM input