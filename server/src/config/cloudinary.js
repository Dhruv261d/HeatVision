import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[cloudinary]: Cloudinary configured');
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'app/Alex-Morgan',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mkv', 'avi', 'mov'],
  },
});

export { storage };
export default connectCloudinary;