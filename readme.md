# EduBhasha — Multilingual Educational Knowledge Platform

EduBhasha is a multilingual, Retrieval-Augmented Generation (RAG) platform for institutional and department-specific educational queries.  
It separates retrieval, authentication, and data layers using **FastAPI**, **Express.js**, **PostgreSQL**, and **Milvus**, exposed through REST APIs.

## Architecture Overview

- **Frontend (React + Vite)**: Student and admin interfaces for chat, document management, and verification flows.
- **Node Backend (Express + TypeScript)**: Authentication, authorization, user/admin APIs, metadata persistence, and orchestration.
- **Python Backend (FastAPI)**: Document ingestion, chunking, embedding, retrieval, and LLM answer generation.
- **PostgreSQL**: Users, OAuth mappings, sessions, documents, chat records, and unanswered query logs.
- **Milvus**: Vector storage and similarity search for document chunks.

## Core Capabilities

- Multilingual document-grounded question answering via retrieval + generation.
- JWT and OAuth-based authentication (credentials, Google, GitHub) with session tracking.
- Admin dashboard for:
  - document upload and deletion,
  - knowledge-base visibility,
  - operational monitoring support.
- Human-in-the-loop fallback pipeline for unresolved queries:
  - failed/unanswered queries are persisted for administrative follow-up.

## Current Repository Structure

```text
UCS-RAGBOT/
├── Node_Backend/                  # Express + PostgreSQL + Auth layer
├── Python_Backend/                # FastAPI + Milvus + RAG pipeline
└── RAG-Frontend/                  # React frontend (student + admin UI)
```

## Key Backend Flows

### 1) Authentication & Authorization (Express)
- Credential sign-up/sign-in with OTP email verification.
- OAuth login via Google and GitHub.
- JWT-based role separation for user and admin access.

### 2) Document Ingestion
- Admin uploads file through Express endpoint.
- Express forwards file to FastAPI ingestion endpoint.
- FastAPI extracts text, chunks content, generates embeddings, and stores vectors in Milvus.
- Express stores metadata in PostgreSQL.

### 3) Query Processing
- User submits query with selected document IDs.
- Express forwards query to FastAPI retrieval endpoint.
- FastAPI retrieves relevant chunks from Milvus and generates structured multilingual answers.
- Express stores successful chat records.
- If no sufficient context is found, unresolved queries are saved for admin review.

## API Surface (High-Level)

### Express APIs
- `/auth/*` — signup, signin, verify, OAuth callbacks
- `/api/user/*` — query, document listing, profile
- `/api/admin/*` — upload, delete, chat logs, failed query retrieval

### FastAPI APIs
- `/ingest` — ingest and vectorize a document
- `/query` — retrieve context + generate answer
- `/delete/{doc_id}` — remove vectors for a document

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Material UI, Tailwind
- **Node Layer**: Express, Passport, JWT, Zod, Multer, pg
- **Python Layer**: FastAPI, sentence-transformers, PyMuPDF/PyPDF2/python-docx, OpenRouter client
- **Data**: PostgreSQL, Milvus

## Concurrency & Reliability Notes

The platform is architected for concurrent student usage through separated service responsibilities and API boundaries.  
Job-queue based processing, explicit rate limiting, and deeper activity pipeline controls can be layered into the existing design to further strengthen high-load reliability.

## Run (Development)

1. Start PostgreSQL and ensure connection variables are set.
2. Start Milvus and verify connectivity from the Python service.
3. Run Node backend (default local port: `3000`).
4. Run FastAPI backend (default local port: `8000`).
5. Run frontend (default local port: `5173`).

## Vision

EduBhasha is designed to provide reliable multilingual educational assistance with clear governance:
- contextual answers grounded in institution-owned knowledge,
- transparent fallback handling,
- and administrator-led closure for unresolved student queries.
