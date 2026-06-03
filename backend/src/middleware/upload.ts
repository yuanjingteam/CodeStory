import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getOSSClient, OSS_BUCKET } from '../config/oss';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const memoryStorage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 JPG、PNG、GIF、WebP 格式'));
  }
};

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

export const uploadCourseCover = upload.single('coverImage');
export const uploadAvatar = upload.single('avatar');

export async function uploadToOSS(
  file: Express.Multer.File,
  folder: 'avatars' | 'courses'
): Promise<string> {
  const ext = path.extname(file.originalname);
  const timestamp = Date.now();
  const prefix = folder === 'avatars' ? 'avatar_' : '';
  const filename = `${prefix}${timestamp}${ext}`;
  const objectKey = `uploads/${folder}/${filename}`;

  if (OSS_BUCKET) {
    const client = getOSSClient();
    const result = await client.put(objectKey, file.buffer, {
      headers: {
        'Content-Type': file.mimetype,
      },
    });
    return result.url;
  }

  return saveToLocal(file, folder, filename);
}

function saveToLocal(
  file: Express.Multer.File,
  folder: string,
  filename: string
): string {
  const dir = path.join(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/uploads/${folder}/${filename}`;
}

export async function deleteFromOSS(objectKey: string): Promise<void> {
  if (OSS_BUCKET && objectKey.startsWith('uploads/')) {
    try {
      const client = getOSSClient();
      await client.delete(objectKey);
    } catch (error) {
      console.error('删除 OSS 文件失败:', error);
    }
  }
}

export function extractOSSKey(url: string): string | null {
  const match = url.match(/\/(uploads\/(?:avatars|courses)\/.+)/);
  return match ? match[1] : null;
}
