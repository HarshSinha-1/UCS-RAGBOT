# from fastapi import FastAPI, UploadFile, File, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# import uvicorn
# import os
# from pathlib import Path
# import shutil
# from typing import List
# import json
# from VectorDb.connectMilvus import Collection
# from .logic.code import process_query,ensure_docs_directory
 #from .AiClient import bge , OR_client   

import warnings
warnings.filterwarnings("ignore")

# app = FastAPI()

# # Configure CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],  # React dev server
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# class QueryRequest(BaseModel):
#     query: str

# @app.post("/upload")
# async def upload_files(files: List[UploadFile] = File(...)):
#     try:
#         docs_dir = ensure_docs_directory()
#         print(f"Docs directory: {docs_dir}")  # Debug print

#         # Clear existing files
#         for file in docs_dir.glob("*"):
#             if file.is_file():
#                 file.unlink()
        
#         # Save new files
#         for file in files:
#             file_path = docs_dir / file.filename
#             print(f"Saving file to: {file_path}")  # Debug print
#             with open(file_path, "wb") as buffer:
#                 shutil.copyfileobj(file.file, buffer)
        
#         return {"status": "success", "message": f"Successfully uploaded {len(files)} files"}
#     except Exception as e:
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/query")
# async def query_endpoint(request: QueryRequest):
#     try:
#         result = process_query(request.query, bge , OR_client)
#         return result
#     except Exception as e:
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))


# if __name__ == "__main__":
#     uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True) 

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import shutil
import traceback

# Local imports
from  RAG_Model.VectorDb.connectMilvus import collection
from RAG_Model.logic.code import process_pdf_for_doc, process_query
from RAG_Model.AiClient import bge, OR_client
from typing import List
from fastapi.responses import JSONResponse


app = FastAPI()

# Enable CORS for frontend (e.g., React on Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory for saving uploaded documents
def ensure_docs_directory():
    docs_dir = Path(__file__).resolve().parent / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    return docs_dir

# Request model for query endpoint
class QueryRequest(BaseModel):
    query: str
    doc_id: str

# Upload + ingestion endpoint
@app.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    doc_id: str = Form(...),
    title: str = Form(...)
):
    try:
        docs_dir = ensure_docs_directory()
        save_path = docs_dir / f"{doc_id}_{file.filename}"

        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process PDF: extract → chunk → embed → insert
        process_pdf_for_doc(
            file_path=save_path,
            doc_id=doc_id,
            title=title,
            embedder=bge,
            collection=collection
        )

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": f"Document '{file.filename}' ingested successfully.",
                "doc_id": doc_id
            }
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Query endpoint with doc_id filtering

class QueryRequest(BaseModel):
    query: str
    doc_id: List[str]

@app.post("/query")
async def query_endpoint(request: QueryRequest):
    try:
        result = process_query(
            query=request.query,
            doc_id=request.doc_id,
            embedder=bge,
            llm_client=OR_client,
            collection=collection
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete/{doc_id}")
async def delete_chunks(doc_id: str):
    try:
        expr = f'doc_id == "{doc_id}"'  # use == not 'in' unless you're passing a list
        delete_result = collection.delete(expr)
        collection.flush()

        return JSONResponse(
            status_code=200,
            content={"status": "success", "deleted_count": delete_result.delete_count}
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Dev mode
if __name__ == "__main__": 
    import uvicorn
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)
