## Features

- Document upload support for PDF, DOC, and DOCX files
- Real-time document processing and embedding
- Interactive chat interface
- Document-based question answering
- Modern, responsive UI

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd RAG-chatbot
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
npm install
```

4. Create a `.env` file in the root directory and add your Google API key:
```
GOOGLE_API_KEY=your_api_key_here
```

## Running the Application

1. Start the backend server:
```bash
python backend.py
```

2. In a new terminal, start the frontend development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Click the "Upload More" button to upload your documents
2. Wait for the documents to be processed
3. Start asking questions about the content of your documents
4. The chatbot will retrieve relevant information and generate responses based on the document content

## Architecture

- Frontend: React with TypeScript and Material-UI
- Backend: FastAPI
- Document Processing: PyPDF2, python-docx
- Embeddings: Google Gemini Pro
- Vector Store: FAISS
- Text Splitting: LangChain

## License

MIT
