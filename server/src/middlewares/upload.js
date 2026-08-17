import multer from 'multer';
import { storage } from '../config/cloudinary.js';

const parser = multer({
  storage: storage,
});

export default parser;