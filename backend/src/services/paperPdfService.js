const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const Paper = require('../models/Paper');

const uploadPaperPdf = async ({ paperId, userId, file }) => {
  if (!file) {
    const err = new Error('PDF file is required. Use multipart/form-data field name "pdf".');
    err.statusCode = 400;
    throw err;
  }

  const paper = await Paper.findById(paperId);
  if (!paper) {
    await fs.unlink(file.path).catch(() => {});
    const err = new Error('Paper not found');
    err.statusCode = 404;
    throw err;
  }

  const fileUrl = `/uploads/pdfs/${file.filename}`;
  const uploadedPdf = {
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    url: fileUrl,
    uploadedBy: userId,
    uploadedAt: new Date(),
    textExtracted: false,
    extractionError: null,
  };

  let extractedText = '';
  try {
    const buffer = await fs.readFile(file.path);
    const parsed = await pdfParse(buffer);
    extractedText = String(parsed.text || '').trim().slice(0, 200000);
    uploadedPdf.textExtracted = Boolean(extractedText);
  } catch (parseError) {
    uploadedPdf.extractionError = parseError.message;
  }

  paper.pdfUrl = fileUrl;
  paper.uploadedPdf = uploadedPdf;
  if (extractedText) paper.fullText = extractedText;
  await paper.save();

  return {
    paper,
    pdfUrl: paper.pdfUrl,
    uploadedPdf: paper.uploadedPdf,
    fullTextExtracted: uploadedPdf.textExtracted,
    fullTextLength: extractedText.length,
  };
};

module.exports = {
  uploadPaperPdf,
};
