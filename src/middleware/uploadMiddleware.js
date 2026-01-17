import multer from 'multer';

const SLIDE_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png'
]);

const MAX_SLIDE_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_MEDIA_FILE_SIZE_BYTES = 500 * 1024 * 1024;

const isAudioVideoMimeType = (mimetype) =>
  mimetype?.startsWith('audio/') || mimetype?.startsWith('video/');

const createFileFilter = (predicate, errorMessage) => (req, file, cb) => {
  if (predicate(file)) {
    return cb(null, true);
  }
  const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
  error.message = errorMessage;
  return cb(error);
};

const memoryStorage = multer.memoryStorage();

export const uploadSlide = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_SLIDE_FILE_SIZE_BYTES },
  fileFilter: createFileFilter(
    (file) => SLIDE_MIME_TYPES.has(file.mimetype),
    'Unsupported slide file type'
  )
});

export const uploadMedia = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_MEDIA_FILE_SIZE_BYTES },
  fileFilter: createFileFilter(
    (file) => isAudioVideoMimeType(file.mimetype),
    'Unsupported media file type'
  )
});

export const uploadErrorHandler = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  if (err instanceof multer.MulterError) {
    let message = err.message || 'Upload failed';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the allowed limit';
    }
    return res.status(400).json({ success: false, message });
  }

  return res.status(400).json({
    success: false,
    message: err.message || 'Upload failed'
  });
};
