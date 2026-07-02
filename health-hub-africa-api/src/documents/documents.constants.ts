// SEC-008 (same rationale as records.service.ts): the extension is always
// derived from the allowlisted MIME type, never from a client-supplied
// filename, to prevent path traversal / extension spoofing.
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'image/jpeg',
  'image/png',
  'text/csv',
  'application/xml',
  'text/xml',
  'application/json',
] as const;

export const DOCUMENT_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'text/csv': 'csv',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'application/json': 'json',
};

export const PRESIGNED_UPLOAD_EXPIRY_SECONDS = 600; // 10 min, matches S3Service PUT expiry
