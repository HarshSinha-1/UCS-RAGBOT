import os
import sys

import numpy as np

import re
from  RAG_Model.AiClient import ORClient , bge
#from .Section_Chunk import section_based_chunker, add_overlap
import uuid

from RAG_Model.logic.extract_text import extract_text_from_pdf, extract_text_from_docx, extract_text_from_txt, extract_text_from_txt, extract_text_from_html, extract_text_from_csv, load_documents
from RAG_Model.logic.Chunk_embedd_store import section_based_chunker, split_and_group_chunks, insert_into_vector_db , search_similar_chunks_multi , get_embeddings , add_overlap
from pathlib import Path
import json5
from typing import List, Tuple, Dict, Any
from pymilvus import Collection, MilvusException
import logging
import time
from langdetect import detect



# Load environment variables

 

# --- Main Q&A Pipeline ---
logger = logging.getLogger(__name__)

def insert_in_batches(collection, records, batch_size=64):
    """
    Insert records in smaller batches to avoid HTTP 413 errors.
    Reduced batch size and added chunk size validation.
    """
    total = len(records)
    logger.info("Inserting %d records in batches of %d", total, batch_size)

    for start in range(0, total, batch_size):
        batch = records[start : start + batch_size]
        logger.info(" → Batch %d–%d", start, start + len(batch) - 1)
        t0 = time.time()
        try:
            collection.insert(batch)
        except MilvusException as e:
            logger.error("Batch %d–%d failed: %s", start, start+len(batch)-1, e)
            raise
        else:
            logger.info("   done in %.2f s", time.time() - t0)

    # optional manual flush if you disabled auto-flush
    collection.flush()
    logger.info("All batches inserted and flushed.")

# Map file extensions to extractor functions
EXTRACTORS = {
    ".pdf": extract_text_from_pdf,
    ".docx": extract_text_from_docx,
    ".txt": extract_text_from_txt,
    ".html": extract_text_from_html,
    ".htm": extract_text_from_html,
    ".csv": extract_text_from_csv,
}

def process_pdf_for_doc(file_path: str, doc_id: str, title: str, embedder, collection):

    file = Path(file_path)
    if not file.exists():
        raise FileNotFoundError(f"{file} does not exist")

    # Detect file extension
    ext = file.suffix.lower()
    extractor = EXTRACTORS.get(ext)
    if not extractor:
        raise ValueError(f"Unsupported file type: {ext}")

    # 1) Extraction: always returns List[Tuple[text, page_no]]
    pages = extractor(file)
    if not pages or not any(isinstance(item, (tuple, list)) and len(item) == 2 and isinstance(item[0], str) and item[0].strip() for item in pages):
        raise ValueError("No text could be extracted from document")

    # 2) chunk & collate
    all_chunks: List[str] = []
    all_page_nos: List[int] = []

    overlap_sentences = 2
    for text, page_no in pages:
        # user-supplied chunker returns list of strings   
        raw_chunks = section_based_chunker(text)

        # clean, dedupe, overlap
        seen = set()
        cleaned: List[str] = []
        for chunk in raw_chunks:
            c = chunk.strip()
            if c and c not in seen:
                seen.add(c)
                cleaned.append(c)
        # apply your overlap strategy (you’ll need to define this)
        overlapped = add_overlap(cleaned, overlap_sentences)
        all_chunks.extend(overlapped)
        all_page_nos.extend([page_no] * len(overlapped))

    if not all_chunks:
        raise ValueError("Chunking produced no content")

    # 3) embedembeddings = embedder.encode(all_chunks, batch_size=32, normalize_embeddings=True)

    embeddings = embedder.encode(
     all_chunks,
     batch_size=64,
     normalize_embeddings=True,
     show_progress_bar=True
    )

    if len(embeddings) != len(all_chunks):
        raise RuntimeError("Mismatch between chunks and embeddings")
    
    ids = [str(uuid.uuid4()) for _ in all_chunks]  # unique chunk IDs
    chunk_indices = list(range(len(all_chunks)))   # 0-based indexin
   
    records = []
    for chunk_index, (chunk_id, chunk, page_no, vector) in enumerate(
        zip(ids, all_chunks, all_page_nos, embeddings)
    ):
        records.append({
            "id": chunk_id,
            "embedding": vector,
            "text": chunk,
            "doc_name":title,
            "doc_id":doc_id,
            "chunk_index":chunk_index,
            "page":page_no
        })

    collection_name="rag_chunks1"    
    collection = Collection(name=collection_name)
    # … build your records list …
    insert_in_batches(collection, records, batch_size=64)


    print(f"✅ Inserted {len(all_chunks)} chunks into vector DB for doc_id: {doc_id}")


def process_query(
    query: str,
    doc_id: List[str],
    embedder,
    llm_client,
    collection,
    top_k: int = 5
) -> Dict[str, Any]:
    
    # 🔹 1) Detect language of query
    try:
        detected_lang = detect(query)
    except Exception:
        detected_lang = "en"   # fallback to English if detection fails

    """
    1) Searches for top_k similar chunks across the given doc_id list
    2) Builds a labeled context with chunk text + (file_name, page_no)
    3) Asks the LLM to answer purely from that context, returning
       a JSON array of { name, description, sources: [{file_name, page_no}, ...] }
    """
    # 1) retrieve top-K chunks
    relevant = search_similar_chunks_multi(
        query=query,
        collection=collection,
        embedder=embedder,
        top_k=top_k,
        doc_id=doc_id                
    )
    if not relevant:
        return {"status": "error", "message": "No relevant content found."}

    # 2) build a context block, tagging each chunk with its source
    context_lines: List[str] = []
    for hit in relevant:
        src = hit["file_name"]
        pg  = hit["page_no"]
        chunk_txt = hit["chunk_text"]
        context_lines.append(f"[{src} | Page {pg}]\n{chunk_txt}")

    context = "\n\n---\n\n".join(context_lines)

    # 3) craft the prompt
    Prompt = f"""You are an multilingual intelligent AI assistant designed to provide factual, insightful, and context-grounded answers based strictly on the provided CONTEXT.

## Your Objective:
Use the CONTEXT to answer the USER QUESTION in the most *comprehensive, **insightful, and **information-rich* manner possible. Only use information *explicitly* found in the context. Do NOT make assumptions or add external knowledge.

## Important:
- The USER QUESTION is written in language code: "{detected_lang}".
- Always return your answer **in the same language as the USER QUESTION**.
- Do not translate sources; keep file_name and page_no unchanged.

## Output Format:
Return your response as a JSON array, where each item has the following structure:
- name: A clear, engaging, and eye-catching title for the piece of information
- description: A rich explanation that blends *paragraphs and bullet points*. Make it expressive and easy to read. Use formatting like:
  - A intro paragraph
  - Followed by bullet points for key facts or features
  - Optionally, a concluding note if relevant
- sources: A list of objects, each containing:
    • "file_name": string – the name of the source file
    • "page_no": int – the page number where the information was found

⚠️ Important: If the context does not contain enough information to answer, then return exactly: 
*["No context found for your query, please rephrase or upload more documents."]* — with no other output or explanation.

## CONTEXT:
{context}

## USER QUESTION:
{query}

## YOUR ANSWER:
"""

    try:
        chat_response = llm_client.chat.completions.create(
            model="tngtech/deepseek-r1t2-chimera:free",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that always returns valid JSON arrays and nothing else."},
                {"role": "user",   "content": Prompt}
            ],
            temperature=0.0,
        )
        answer_text = chat_response.choices[0].message.content
        
        fence_match = re.search(r"```json\s*([\s\S]*?)```", answer_text)
        if fence_match:
            answer_text = fence_match.group(1).strip()

        # ── 2) Find and extract the first balanced JSON array ──
        start_idx = answer_text.find('[')
        if start_idx == -1:
            raise ValueError("No '[' found in LLM response")

        depth = 0
        end_idx = None
        for i, ch in enumerate(answer_text[start_idx:], start=start_idx):
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
            if depth == 0:
                end_idx = i
                break

        if end_idx is None:
            raise ValueError("Unable to find matching ']' for JSON array")

        json_str = answer_text[start_idx:end_idx + 1]

        json_str = re.sub(r',\s*(?=[\]\}])', '', json_str)
        def balance(open_c, close_c, s):
            o, c = s.count(open_c), s.count(close_c)
            return s + close_c * (o - c) if o > c else s
        json_str = balance('[', ']', json_str)
        json_str = balance('{', '}', json_str)
        # ── End auto-fix ──

        # parse the (now hopefully balanced) JSON
        parsed: List[Dict[str, Any]] = json5.loads(json_str)

        parsed = json5.loads(json_str)


        # 6) collect a unified sources list
        seen = set()
        unified_sources = []
        for item in parsed:
            for s in item.get("sources", []):
                key = (s["file_name"], s["page_no"])
                if key not in seen:
                    seen.add(key)
                    unified_sources.append({"file_name": s["file_name"], "page_no": s["page_no"]})

        # 7) return both the structured answer and the overall sources
        return {
            "status": "success",
            "answer": parsed,
            "sources": unified_sources,
            "language": detected_lang
        }

    except Exception as e:
        logger.error("Failed processing query: %s", e, exc_info=True)
        return {
            "status": "error",
            "message": f"{e}\nRaw LLM output:\n{answer_text if 'answer_text' in locals() else ''}"
        }
    
