import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Set your upload folder path
const UPLOAD_DIR = path.join(__dirname, '../../uploads'); // adjust relative path as needed

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`✅ Created upload directory at: ${UPLOAD_DIR}`);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueSuffix);
  }
});

// Export multer instance with single file upload support
export const uploadMiddleware = multer({ storage });
