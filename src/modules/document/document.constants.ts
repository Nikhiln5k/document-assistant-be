import { extname } from 'node:path';
import { DocumentFileType } from './entities/document.entity';

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const FILE_TYPES_BY_EXTENSION: Record<string, DocumentFileType> = {
  '.pdf': DocumentFileType.Pdf,
  '.xlsx': DocumentFileType.Excel,
  '.csv': DocumentFileType.Excel,
  '.docx': DocumentFileType.Word,
  '.png': DocumentFileType.Image,
  '.jpg': DocumentFileType.Image,
  '.jpeg': DocumentFileType.Image,
  '.webp': DocumentFileType.Image,
  '.txt': DocumentFileType.Text,
  '.md': DocumentFileType.Text,
};

export const SUPPORTED_EXTENSIONS = Object.keys(FILE_TYPES_BY_EXTENSION);

export const resolveFileType = (
  fileName: string,
): DocumentFileType | undefined =>
  FILE_TYPES_BY_EXTENSION[extname(fileName).toLowerCase()];
