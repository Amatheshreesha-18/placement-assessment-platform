const multer = require('multer');

// Store files in memory so they can be streamed directly to Supabase Storage
const storage = multer.memoryStorage();

// File filter: accept only PDF resumes
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF files (.pdf) are allowed.'), false);
  }
};

const uploadResume = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter,
});

module.exports = {
  uploadResume,
};
