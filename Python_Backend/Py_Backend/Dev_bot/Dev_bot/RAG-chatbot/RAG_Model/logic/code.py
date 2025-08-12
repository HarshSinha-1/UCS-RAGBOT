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



# Load environment variables

 

# --- Main Q&A Pipeline ---
logger = logging.getLogger(__name__)

def insert_in_batches(collection, records, batch_size=200):
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
     batch_size=32,
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
    insert_in_batches(collection, records, batch_size=200)


    print(f"✅ Inserted {len(all_chunks)} chunks into vector DB for doc_id: {doc_id}")


    # # Final insertion to Milvus
    # insert_into_vector_db(
    #     embeddings=embeddings,
    #     text=all_chunks,
    #     title=doc_name, 
    #     doc_id=doc_id, # or doc_name if preferred
    #     page=all_pages
    # )

    # print(f"✅ Finished processing and storing chunks for doc_id: {doc_id}")


# def process_pdf_for_doc(pdf_path: str, doc_id: str, title: str , embedder, collection):

#     # Step 1: Load ONLY the target file, not the entire directory
#     raw_docs = load_documents(Path(pdf_path).parent)  # ✅ fix: don't load entire folder
#     if not raw_docs or not any(text.strip() for text in raw_docs):
#         raise ValueError("Document is empty or contains no readable text")

#     combined = "\n".join(raw_docs).strip()
#     chunks: List[str] = section_based_chunker(combined)

#     if not combined:
#         raise ValueError("Combined text is empty after cleaning")

#     chunks = section_based_chunker(combined)
#     if not chunks:
#         raise ValueError("No chunks could be created from the document")

#     # Optional: filter out empty chunks explicitly
#     chunks = [c.strip() for c in chunks if c.strip()]
    
#     chunks = list(dict.fromkeys(chunks))  # ✅ remove any duplicate chunks

#     # Step 3: Add sentence-level overlap across chunks
#     chunks = add_overlap(chunks, overlap_sentences=2)  # ✅ enable overlap for better embeddings

#     # Step 4: Get embeddings for each chunk
#     embeddings: List[np.ndarray] = get_embeddings(chunks, embedder)

#     # Safety check
#     if len(chunks) != len(embeddings):
#         raise ValueError(f"Mismatch: {len(chunks)} chunks vs {len(embeddings)} embeddings")

#     # Optional: Debug
#     for i in range(len(chunks)):
#         print(f"[{i}] Chunk preview: {chunks[i][:80]!r}")
#         print(f"[{i}] Embedding dims preview: {embeddings[i][:3]}")

#     # Step 5: Insert into Milvus vector DB
#     insert_into_vector_db(embeddings=embeddings,
#                          text=chunks,
#                          title=title,
#                          doc_id=doc_id
#                          )

#     print(f"✅ Finished processing and storing chunks for doc_id: {doc_id}")

 
# def process_query(query, bge, ORClient):

#     docs_dir = ensure_docs_directory()
#     documents = load_documents(docs_dir)
#     if not documents:
#         print("No documents found. Please upload first.")
#         return {'status': 'error', 'message': 'No documents found. Please upload first.'}

#     # Chunking
#     all_text = '\n'.join(documents)
#     chunks = section_based_chunker(all_text)
#     if not chunks:
#         print("Document chunking failed.")
#         return {'status': 'error', 'message': 'Document chunking failed.'}

#     # Embedding
#     chunk_embeddings = bge.encode(chunks, batch_size=32, normalize_embeddings=True)
#     query_embedding = bge.encode([query], normalize_embeddings=True)[0]
#     # ----- Milvus INSERT LOGIC -----
#     # If you have only 1 file, get doc_name from docs_dir; else, you can pass a list.
#     # doc_name = None
#     # doc_files = list(docs_dir.glob('*'))
#     # if len(doc_files) == 1:
#     #     doc_name = doc_files[0].name
#     # else:
#     #     doc_name = "unknown"

#     # # Generate data for insertion
#     # chunk_ids = [str(uuid.uuid4()) for _ in chunks]      # Use UUID as string
#     # pages = [0 for _ in chunks]                          # Or your real page numbers

#     # insert_data = [
#     #     chunk_ids,                                        # "ID"
#     #     [vec.tolist() if hasattr(vec, 'tolist') else vec for vec in chunk_embeddings],  # "embedding"
#     #     chunks,                                           # "text"
#     #     [doc_name] * len(chunks),                         # "doc_name"
#     #     pages                                             # "page"
#     # ]

#     # collection.insert(insert_data)
#     # print(f"✅ Inserted {len(chunks)} chunks for document '{doc_name}' into Milvus.")

#     # # ---------- Retrieval for Query ----------
#     # query_embedding = bge.encode([query], normalize_embeddings=True)[0]
#     # # Milvus similarity search
#     # search_params = {"metric_type": "COSINE", "params": {"nprobe": 16}}
#     # results = collection.search(
#     #     data=[query_embedding],
#     #     anns_field="embedding",
#     #     param=search_params,
#     #     limit=3,
#     #     output_fields=["text", "doc_name", "page"]
#     # )

#     # relevant_chunks = [hit.entity.get('text') for hit in results[0] if hit.distance > 0.5]
#     # Context = "\n".join(relevant_chunks)
#     # print("\n--- RAG Context ---\n", Context[:3000])
    
#     similarities = np.dot(chunk_embeddings, query_embedding)
#     top_k_indices = similarities.argsort()[-3:][::-1]
#     relevant_chunks = [chunks[i] for i in top_k_indices if similarities[i] > 0.5]  # Only keep semi-relevant chunks
#     Context = "\n".join(relevant_chunks)

#     print("\n--- RAG Context ---\n", Context[:3000])

#     if not Context.strip():
#         return {
#             'status': 'error',
#             'message': "No relevant content found for your query in the uploaded documents."
#         }

#     # ---------- LLM Prompt/Inference ----------
#     Prompt = f"""You are a smart AI agent provided with two things: a CONTEXT and a USER QUESTION.
# Your task is to answer the user's question as accurately as possible, using ONLY information from the context.

# Return your answer as a JSON array.
# - Each array item must have a 'name' (short, clear label) and a 'description' (detailed explanation, as feasible from the context).
# - Group together any points that are similar.
# - Do NOT invent or assume any information.
# - If nothing relevant is found, return [] only, with no further explanation.

# Context:
# {Context}

# Question:
# {query}

# Format:
# [
#   {{
#     "name": "Short label for point",
#     "description": "Detailed explanation of the point, with as much detail as available in the context."
#   }}
# ]

# Your answer:
# """

#     chat_response = ORClient.chat.completions.create(
#         model="deepseek/deepseek-chat-v3:free",
#         messages=[
#             {"role": "system", "content": "You are a helpful assistant that always returns valid JSON arrays and nothing else."},
#             {"role": "user", "content": Prompt}
#         ],
#         temperature=0.0,
#     )
#     answer_text = chat_response.choices[0].message.content
#     print("\n--- Model Raw Output ---\n", answer_text)

#     try:
#         json_start = answer_text.find("[")
#         json_end = answer_text.rfind("]") + 1
#         json_string = answer_text[json_start:json_end]
#         parsed_answer = json.loads(json_string)
#     except Exception:
#         return {
#             'status': 'error',
#             'message': f"Failed to parse AI response as JSON. Model output: {answer_text}"
#         }
#     return {'status': 'success', 'answer': parsed_answer}

def process_query(
    query: str,
    doc_id: List[str],
    embedder,
    llm_client,
    collection,
    top_k: int = 5
) -> Dict[str, Any]:
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
    Prompt = f"""You are an intelligent AI assistant designed to provide factual, insightful, and context-grounded answers based strictly on the provided CONTEXT.

## Your Objective:
Use the CONTEXT to answer the USER QUESTION in the most *comprehensive, **insightful, and **information-rich* manner possible. Only use information *explicitly* found in the context. Do NOT make assumptions or add external knowledge.

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

If the context does not contain enough information to answer the question, return an *empty array []* — with no other output or explanation.

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
            "sources": unified_sources
        }

    except Exception as e:
        logger.error("Failed processing query: %s", e, exc_info=True)
        return {
            "status": "error",
            "message": f"{e}\nRaw LLM output:\n{answer_text if 'answer_text' in locals() else ''}"
        }
    
    # ✅ Extract full JSON block (more flexible)
    #  json_array_match = re.search(r'\[\s*{[\s\S]*?}\s*\]', answer_text)
    #  if not json_array_match:
    #     raise ValueError("No JSON array found in model response.")
        
    #  json_string = json_array_match.group(0)
        
    #  try:
    #     parsed_answer = json5.loads(json_string)
    #  except Exception:
    #         # Try to parse with json5 which is more lenient
    #     parsed_answer = json5.loads(json_string)

    #  return {'status': 'success', 'answer': parsed_answer}

    # except Exception as e:
    #  return {
    #         'status': 'error',
    #         'message': f"Failed to parse AI response as JSON.\nError: {e}\nRaw Model Output:\n{answer_text}"
    #     }