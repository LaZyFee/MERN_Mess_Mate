import multer from 'multer';

// Images only, max 5MB, kept in memory then streamed to Cloudinary
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only JPEG, PNG and WebP images are allowed'));
    },
});

export default upload;
