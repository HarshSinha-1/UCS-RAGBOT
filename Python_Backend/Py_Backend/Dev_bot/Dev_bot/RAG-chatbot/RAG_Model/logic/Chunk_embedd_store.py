# --- Chunking and Semantic Grouping ---
import re
from langchain.text_splitter import RecursiveCharacterTextSplitter
from RAG_Model.AiClient import bge
import numpy as np
from typing import List
#from RAG_Model.logic.extract_text import load_documents
from RAG_Model.VectorDb.connectMilvus import Collection
from PyPDF2 import PdfReader
from typing import List, Dict, Optional
import numpy as np

def split_and_group_chunks(texts, bge, chunk_size=1000, threshold=0.9):
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=0)
    chunks = splitter.split_text('\n'.join(texts))
    print(f"\n--- {len(chunks)} Chunks Generated ---\n")
    for i, ch in enumerate(chunks):
        print(f"\n--- Chunk {i} ---\n{ch[:500]}...\n")
    if not chunks:
        return []
    embeddings = bge.encode(chunks, batch_size=32, normalize_embeddings=True)
    grouped = []
    N = len(chunks)
    i = 0
    while i < N:
        group = [chunks[i]]
        j = i + 1
        while j < N:
            sim = np.dot(embeddings[i], embeddings[j])
            if sim >= threshold:
                group.append(chunks[j])
                j += 1
            else:
                break
        grouped.append('\n'.join(group))
        i = j
    return grouped


# def find_most_similar_chunks(query_embedding, chunk_embeddings, chunks, k=3):
#     similarities = []
#     query_embedding = np.array(query_embedding)
#     for chunk_embedding in chunk_embeddings:
#         chunk_embedding = np.array(chunk_embedding)
#         similarity = np.dot(query_embedding, chunk_embedding) / (
#             np.linalg.norm(query_embedding) * np.linalg.norm(chunk_embedding)
#         )
#         similarities.append(similarity)
#     top_k_indices = np.argsort(similarities)[-k:][::-1]
#     return [chunks[i] for i in top_k_indices]

def search_similar_chunks_multi(
    query: str,
    collection,
    embedder,
    top_k: int = 5,
    doc_id: Optional[List[str]] = None,
) -> List[Dict]:
    """
    Search for the most similar chunks to `query` across the given Milvus collection.

    Returns a list of dicts:
      - chunk_text: the text of the retrieved chunk
      - doc_id:    your document identifier
      - file_name: the original PDF filename (doc_name metadata)
      - page_no:   the page number where this chunk came from
      - score:     Milvus distance (lower = more similar for COSINE)

    :param query:      the user’s search query
    :param collection: an _instance_ of pymilvus.Collection already connected
    :param embedder:   any model with `encode(list[str], …) -> np.ndarray`
    :param top_k:      how many hits to return
    :param doc_id:    optional filter: only search chunks whose doc_id is in this list
    """
    # 1) Embed the query
    query_emb = embedder.encode(
        [query],
        batch_size=32,
        convert_to_numpy=True,
        normalize_embeddings=True
    )[0]  # shape (D,)

    # 2) Build Milvus search parameters and filter expression
    search_params = {"metric_type": "COSINE", "params": {"nprobe": 16}}
    expr = None
    if doc_id:
        # e.g. doc_id in ["abc","def","ghi"]
        safe_list = ",".join(f'"{d}"' for d in doc_id)
        expr = f'doc_id in [{safe_list}]'

    # 3) Perform the search
    #    Make sure your collection schema includes these metadata fields:
    #      - "chunk"     (or "text"): VARCHAR containing the chunk text
    #      - "doc_id":   VARCHAR, your document identifier
    #      - "doc_name": VARCHAR, the PDF filename
    #      - "page":     INT64, the page number
    results = collection.search(
        data=[query_emb],
        anns_field="embedding",
        param=search_params,
        limit=top_k,
        expr=expr,
        output_fields=["text", "doc_id", "doc_name", "page"]
    )

    # 4) Parse hits
    output: List[Dict] = []
    for hit in results[0]:
        ent = hit.entity
        output.append({
            "chunk_text": ent.get("text"),
            "doc_id":     ent.get("doc_id"),
            "file_name":  ent.get("doc_name"),
            "page_no":    ent.get("page"),
            "score":      hit.distance
        })
    return output


def section_based_chunker(text, min_len=200):
    """
    Splits document text into chunks by detecting section headers,
    falls back to paragraph-based split if not found.
    """
    # Regex: Match lines that look like headings (all caps, or start with "Section", or numbered, etc)
    pattern = re.compile(r'^(?:[A-Z][A-Z \d\.\-:]{5,}|Section\s+\d+|[IVXLC]+\.\s)', re.MULTILINE)
    matches = list(pattern.finditer(text))
    chunks = []
    if not matches:
        # Fallback: split by paragraphs
        paras = text.split('\n\n')
        buf = ''
        for para in paras:
            buf += para + '\n\n'
            if len(buf) > min_len:
                chunks.append(buf.strip())
                buf = ''
        if buf:
            chunks.append(buf.strip())
    else:
        # Cut sections by heading positions
        for i, m in enumerate(matches):
            start = m.start()
            end = matches[i+1].start() if i+1 < len(matches) else len(text)
            chunk = text[start:end].strip()
            if len(chunk) > min_len:
                chunks.append(chunk)
    return chunks

def add_overlap(chunks, overlap_sentences=2):
    overlapped_chunks = []
    for i, chunk in enumerate(chunks):
        if i > 0:
            prev = chunks[i-1].split('.')
            prefix = '.'.join(prev[-overlap_sentences:]) if len(prev) > overlap_sentences else chunks[i-1]
            overlapped_chunks.append((prefix + '\n' + chunk).strip())
        else:
            overlapped_chunks.append(chunk)
    return overlapped_chunks


def get_embeddings(chunks:list[str], bge) -> list[np.ndarray]:
    # Directly encode with bge
    return bge.encode(chunks, batch_size=32, normalize_embeddings=True)

import uuid

def insert_into_vector_db(doc_id, title, chunks, embeddings, Page):
    if len(chunks) != len(embeddings):
        print(f"[VectorDB Insert Error] Chunks: {len(chunks)} | Embeddings: {len(embeddings)}")
        for i, c in enumerate(chunks):
            print(f"[Chunk {i}] Length: {len(c)} | Content: {repr(c[:100])}")
        raise ValueError("Number of chunks and embeddings must match")

    ids = [str(uuid.uuid4()) for _ in chunks]  # unique chunk IDs
    chunk_indices = list(range(len(chunks)))   # 0-based indexin

    # Convert numpy embeddings to list if needed
    collection_name = "rag_chunks1"
    formatted_embeddings = [vec.tolist() if hasattr(vec, 'tolist') else vec for vec in embeddings]

    data_to_insert = [
        ids,                   # "id"
        formatted_embeddings,  # "embedding"
        chunks,                # "text"
        [title] * len(chunks),  # doc_name
        [doc_id] * len(chunks),# "doc_id"
        chunk_indices,         # "chunk_index"
        page        # "page"
    ]

     # ✅ Instantiate collection first
    collection = Collection(name=collection_name)
    collection.insert(data=data_to_insert)
    print(f"✅ Inserted {len(chunks)} chunks into vector DB for doc_id: {doc_id}")



