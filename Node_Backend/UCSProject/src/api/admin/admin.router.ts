import express from 'express';
import { handleDocumentUpload , deleteDocument, getAllChats, getfailedchat } from '../admin/admin.services';
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

Adminrouter.post('/allchats', AdminAuthenticate, getAllChats);

Adminrouter.get('/failed-queries', AdminAuthenticate, getfailedchat);


export default Adminrouter;
