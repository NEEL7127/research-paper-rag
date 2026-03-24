try:
    import pymupdf as fitz
except ImportError:
    import fitz  # PyMuPDF legacy alias
import re

def extract_text_from_pdf(pdf_path: str) -> list[dict]:
    """
    Extract text page by page from PDF.
    Returns list of {text, page_number}
    """
    pages = []
    doc = fitz.open(pdf_path)

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()

        # Clean up whitespace
        text = re.sub(r'\n+', '\n', text).strip()

        if text:
            pages.append({
                "text": text,
                "page_number": page_num + 1
            })

    doc.close()
    return pages


def chunk_text(pages: list[dict], chunk_size: int = 500, overlap: int = 100) -> list[dict]:
    """
    Split pages into overlapping chunks.

    Why overlap?
    If an answer sits at the boundary of two chunks,
    overlap ensures context isn't lost.

    chunk_size = max words per chunk
    overlap    = words shared between consecutive chunks
    """
    chunks = []

    for page in pages:
        words = page["text"].split()
        page_num = page["page_number"]

        # Slide a window across the words
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words)

            if len(chunk_text.strip()) > 50:  # skip tiny chunks
                chunks.append({
                    "text": chunk_text,
                    "page_number": page_num,
                    "start_word": start,
                    "end_word": min(end, len(words))
                })

            # Move forward but keep overlap
            start += chunk_size - overlap

    return chunks


def process_pdf(pdf_path: str) -> list[dict]:
    """
    Main function — PDF path → list of chunks
    """
    pages = extract_text_from_pdf(pdf_path)
    chunks = chunk_text(pages)
    return chunks
