import express from 'express';
import { handleDocumentUpload , deleteDocument, getAllChats } from '../admin/admin.services';
import { AdminAuthenticate } from '../../middlewares/auth.middleware'; 
import { uploadMiddleware } from '../../middlewares/uploadMiddleware';

const Adminrouter = express.Router();

// Route: /api/docs/upload
Adminrouter.post(
  '/upload',
  AdminAuthenticate,
  uploadMiddleware.single('file'),
  handleDocumentUpload
);

Adminrouter.delete(
  '/delete/:doc_id',
  AdminAuthenticate,
  deleteDocument
);

Adminrouter.get('/chats', AdminAuthenticate, getAllChats);


export default Adminrouter;
