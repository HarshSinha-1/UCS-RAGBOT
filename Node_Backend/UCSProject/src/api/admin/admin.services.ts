import { Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { insertDocument,deleteDocumentFromDB } from '../../Models/userModel';
import { v4 as uuidv4 } from 'uuid';
//import { authenticate, authorizeRoles } from '../middlewares/auth'




export async function handleDocumentUpload(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    const user = req.user;
    const description = req.body.description;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const docId = uuidv4();
//@ts-ignore
   // console.log('user.id:', user.id, typeof user.id);
    
    // 2. Send file to Python backend for processing
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path));
    form.append('doc_id', docId);
    form.append('title', file.originalname);

    const pythonRes = await axios.post(
      'http://localhost:8000/ingest',
      form,
      { headers: form.getHeaders() }
    );

    if (pythonRes.status !== 200) {
      res.status(500).json({ error: 'Failed to process document'});
      return;
    }
    // 1. Save metadata to PostgreSQL
    //@ts-ignore
    const result = await insertDocument(docId, file.originalname, user.id, description);
    if (!result) {
      res.status(500).json({ error: 'Failed to save document metadata' });
      return;
    }

    res.json({
      message: 'Document uploaded successfully ',
      documentId: docId,
      description: description,
      pythonResponse: pythonRes.data
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}


export async function deleteDocument(req: Request, res: Response): Promise<void> {
  try {
    const { doc_id } = req.params;

    if (!doc_id) {
      res.status(400).json({ error: 'Document ID is required' });
      return;
    }

    // 2. Send delete request to Python backend
    const pythonRes = await axios.delete(`http://localhost:8000/delete/${doc_id}`);

    if (pythonRes.status !== 200) {
      res.status(500).json({ error: 'Failed to delete document' });
      return;
    }

    // 3. Delete metadata from PostgreSQL
    const result = await deleteDocumentFromDB(doc_id);

     if (result.rowCount === 0) {
        res.status(404).json({
          status: 'error',
          message: `No document found with id ${doc_id}`
        });
        return;
      }
      
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('[Delete Error]', err);
    res.status(500).json({ error: 'Delete failed' });
  }
}


