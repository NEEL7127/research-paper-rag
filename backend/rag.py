import chromadb
from sentence_transformers import SentenceTransformer, CrossEncoder
from groq import Groq
from collections import defaultdict
import os
import re
from dotenv import load_dotenv

load_dotenv()

# ── Models ────────────────────────────────────────────────────
bi_encoder   = SentenceTransformer("all-MiniLM-L6-v2")
cross_encoder = CrossEncoder("cross-encoder/ms-marco-TinyBERT-L-2-v2")
chroma_client = chromadb.PersistentClient(path="./chroma_db")
groq_client   = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ── Ingestion ─────────────────────────────────────────────────
def ingest_chunks(chunks: list[dict], collection_name: str):
    try:
        chroma_client.delete_collection(collection_name)
    except:
        pass

    collection = chroma_client.create_collection(collection_name)
    texts      = [c["text"] for c in chunks]
    embeddings = bi_encoder.encode(texts, show_progress_bar=True).tolist()

    collection.add(
        ids        = [str(i) for i in range(len(chunks))],
        embeddings = embeddings,
        documents  = texts,
        metadatas  = [{
            "page_number": c["page_number"],
            "start_word":  c["start_word"],
            "end_word":    c["end_word"]
        } for c in chunks]
    )
    return len(chunks)


# ── Upgrade 1: Query Expansion ────────────────────────────────
def expand_query(question: str) -> list[str]:
    """
    Use Groq to rewrite the question 3 ways.
    Each version searches differently → more chunks found.
    """
    prompt = f"""You are a search query optimizer for research papers.
Given a question, rewrite it into 3 different search queries that would
find relevant content in a research paper. Each query should approach
the question from a slightly different angle.

Return ONLY the 3 queries, one per line, no numbering, no explanation.

Question: {question}
Queries:"""

    try:
        res = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=150
        )
        lines = res.choices[0].message.content.strip().split("\n")
        # Clean up and keep max 3
        queries = [l.strip() for l in lines if l.strip()][:3]
        # Always include original question
        all_queries = [question] + queries
        return list(dict.fromkeys(all_queries))  # deduplicate
    except:
        return [question]  # fallback to original if fails


# ── Upgrade 2: Hybrid Search ──────────────────────────────────
def keyword_score(query: str, text: str) -> float:
    """
    Simple BM25-style keyword scoring.
    Counts how many query words appear in the chunk.
    Normalized by query length.
    """
    query_words = set(re.findall(r'\w+', query.lower()))
    text_words  = re.findall(r'\w+', text.lower())
    text_word_set = set(text_words)

    # Remove common stop words
    stop = {"the","a","an","is","in","of","to","and","or","for","with","that","this","it"}
    query_words -= stop

    if not query_words:
        return 0.0

    matches = sum(1 for w in query_words if w in text_word_set)
    return matches / len(query_words)


def hybrid_retrieve(question: str, collection_name: str, k: int = 10) -> list[dict]:
    """
    Combines semantic search + keyword scoring.
    Final score = 0.7 * semantic + 0.3 * keyword
    """
    collection = chroma_client.get_collection(collection_name)

    # Expand query into multiple versions
    queries = expand_query(question)

    # Search with each query version, collect all candidates
    seen_ids   = set()
    candidates = []

    for q in queries:
        q_embedding = bi_encoder.encode([q]).tolist()
        results = collection.query(
            query_embeddings=q_embedding,
            n_results=min(k, collection.count())
        )

        for i in range(len(results["documents"][0])):
            doc_id = results["ids"][0][i]
            if doc_id in seen_ids:
                continue
            seen_ids.add(doc_id)

            semantic_score = 1 - results["distances"][0][i]
            kw_score       = keyword_score(question, results["documents"][0][i])
            hybrid         = 0.7 * semantic_score + 0.3 * kw_score

            candidates.append({
                "text":           results["documents"][0][i],
                "page_number":    results["metadatas"][0][i]["page_number"],
                "start_word":     results["metadatas"][0][i]["start_word"],
                "semantic_score": round(semantic_score, 3),
                "keyword_score":  round(kw_score, 3),
                "hybrid_score":   round(hybrid, 3)
            })

    # Sort by hybrid score
    candidates.sort(key=lambda x: x["hybrid_score"], reverse=True)
    return candidates[:k]


# ── Upgrade 3: Re-ranking ─────────────────────────────────────
def rerank(question: str, candidates: list[dict], final_k: int = 5) -> list[dict]:
    """
    Cross-encoder re-ranks the hybrid results.
    Most accurate relevance scoring.
    """
    pairs        = [[question, c["text"]] for c in candidates]
    cross_scores = cross_encoder.predict(pairs)

    for i, score in enumerate(cross_scores):
        candidates[i]["cross_score"] = float(score)

    reranked = sorted(candidates, key=lambda x: x["cross_score"], reverse=True)
    return reranked[:final_k]


# ── Upgrade 4: Context Stitching ──────────────────────────────
def stitch_context(chunks: list[dict]) -> str:
    """
    Groups chunks by page number.
    Merges chunks from same page together.
    Adds clear page separators.
    Result: clean, readable context instead of fragmented pieces.
    """
    page_groups = defaultdict(list)
    for chunk in chunks:
        page_groups[chunk["page_number"]].append(chunk["text"])

    context = ""
    for page_num in sorted(page_groups.keys()):
        texts = page_groups[page_num]
        merged = " [...] ".join(texts)  # [...] shows where chunks joined
        context += f"\n\n{'='*50}\n"
        context += f"PAGE {page_num}\n"
        context += f"{'='*50}\n"
        context += merged

    return context.strip()


# ── Upgrade 5: Better Prompt ──────────────────────────────────
def build_prompt(question: str, context: str) -> str:
    return f"""You are an expert research assistant analyzing an academic paper.

STRICT RULES:
- Base your answer ONLY on the provided context
- Always cite page numbers as (pg. X) inline
- If something isn't in the context say: "This is not covered in the provided sections."
- Be precise and academic in tone
- Never make up information

ANSWER FORMAT (follow this structure):
**Direct Answer:** [1-2 sentence direct response]

**Explanation:** [Detailed explanation with page citations]

**Key Evidence:** [Specific quotes or data points from the paper]

**Pages Referenced:** [List all page numbers used]

PAPER CONTEXT:
{context}

QUESTION: {question}

Answer:"""


# ── Main Pipeline ─────────────────────────────────────────────
def answer_question(question: str, collection_name: str):
    """
    Full upgraded pipeline:
    1. Query expansion    → better recall
    2. Hybrid search      → semantic + keyword
    3. Re-ranking         → cross-encoder precision
    4. Context stitching  → clean merged context
    5. Structured prompt  → formatted answer
    """

    # Step 1+2: Hybrid retrieval (includes query expansion)
    candidates = hybrid_retrieve(question, collection_name, k=10)

    # Step 3: Re-rank
    top_chunks = rerank(question, candidates, final_k=5)

    # Step 4: Stitch context
    context = stitch_context(top_chunks)

    # Step 5: Generate answer
    prompt   = build_prompt(question, context)
    response = groq_client.chat.completions.create(
        model    = "llama-3.1-8b-instant",
        messages = [{"role": "user", "content": prompt}],
        temperature = 0.1,
        max_tokens  = 1024
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": [{
            "page":           c["page_number"],
            "hybrid_score":   c["hybrid_score"],
            "keyword_score":  c["keyword_score"],
            "cross_score":    round(c["cross_score"], 3)
        } for c in top_chunks]
    }