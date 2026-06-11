const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '../../uploads/pdfs');

fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
    const safeBase = path
      .basename(file.originalname || 'paper', ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    cb(null, `${Date.now()}-${safeBase || 'paper'}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    path.extname(file.originalname || '').toLowerCase() === '.pdf';

  if (!isPdf) {
    const err = new Error('Only PDF files are allowed');
    err.statusCode = 400;
    return cb(err);
  }
  return cb(null, true);
};

const uploadPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

module.exports = {
  uploadPdf,
  uploadRoot,
};
