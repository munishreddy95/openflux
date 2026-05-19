import path from 'node:path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { getConfig } from '../services/config.service.js';

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, getConfig().uploadDir);
  },
  filename: (_request, file, callback) => {
    callback(null, `${nanoid()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

function createUploadMiddleware({ allowedExtensions, maxFileSize, errorMessage }) {
  return multer({
    storage,
    limits: {
      fileSize: maxFileSize
    },
    fileFilter: (_request, file, callback) => {
      if (!allowedExtensions.has(path.extname(file.originalname).toLowerCase())) {
        callback(new Error(errorMessage));
        return;
      }

      callback(null, true);
    }
  });
}

export const torrentUploadMiddleware = createUploadMiddleware({
  allowedExtensions: new Set(['.torrent']),
  maxFileSize: 2 * 1024 * 1024,
  errorMessage: 'Only .torrent files are allowed'
});

export const subtitleUploadMiddleware = createUploadMiddleware({
  allowedExtensions: new Set(['.srt', '.vtt', '.webvtt']),
  maxFileSize: 5 * 1024 * 1024,
  errorMessage: 'Only .srt, .vtt, and .webvtt subtitle files are allowed'
});
