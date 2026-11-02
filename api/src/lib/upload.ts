import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import sharp from "sharp";
import { config } from "../config";
import { HttpError } from "./http";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, "Only JPEG, PNG, WebP or HEIC images are allowed"));
  },
});

/**
 * Resizes + compresses to WebP (mobile photos are huge) and stores on local disk.
 * Swap this function for S3/Cloudinary in production; callers only depend on the returned URL.
 */
export async function saveImage(buffer: Buffer, opts: { maxWidth?: number } = {}) {
  const name = `${crypto.randomUUID()}.webp`;
  await sharp(buffer)
    .rotate()
    .resize({ width: opts.maxWidth ?? 1600, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(UPLOAD_DIR, name));
  return `${config.apiUrl}/uploads/${name}`;
}
