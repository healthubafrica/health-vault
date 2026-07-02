'use client'

// Upload queue for vault documents: presign → direct XHR PUT to S3 (for
// progress events, which fetch() can't report on request bodies) → finalize.
// Files upload with limited concurrency so a big batch doesn't saturate the
// connection or trip the presign throttle.

import { useCallback, useRef, useState } from 'react'
import { documents, type DocumentCategory, type VaultDocument } from '../api'
import { isVaultMimeSupported } from '../vault'
import { formatBytes } from '../utils'

const MAX_CONCURRENT_UPLOADS = 3

export type UploadStatus = 'pending' | 'uploading' | 'saving' | 'done' | 'error'

export interface UploadEntryInput {
  file: File
  title: string
  category: DocumentCategory
  tags: string[]
  description?: string
  documentDate?: string
}

export interface UploadEntry extends UploadEntryInput {
  id: string
  status: UploadStatus
  progress: number // 0–100, upload phase only
  error?: string
  document?: VaultDocument
}

function putWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Storage upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))
    xhr.send(file)
  })
}

export function useDocumentUpload(options?: {
  maxFileSizeBytes?: number | null
  onEntryDone?: (doc: VaultDocument) => void
}) {
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [isUploading, setIsUploading] = useState(false)
  // Options live in a ref so in-flight uploads always see current values.
  const optionsRef = useRef(options)
  optionsRef.current = options

  const patch = useCallback((id: string, changes: Partial<UploadEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)))
  }, [])

  const validate = useCallback((file: File): string | null => {
    if (!isVaultMimeSupported(file.type)) {
      return `Unsupported file type${file.type ? ` (${file.type})` : ''}`
    }
    const max = optionsRef.current?.maxFileSizeBytes
    if (max != null && file.size > max) {
      return `File exceeds your plan's ${formatBytes(max)} per-file limit`
    }
    if (file.size === 0) return 'File is empty'
    return null
  }, [])

  const processEntry = useCallback(
    async (entry: UploadEntry) => {
      try {
        patch(entry.id, { status: 'uploading', progress: 0, error: undefined })

        const ticketRes = await documents.getUploadUrl({
          fileName: entry.file.name,
          contentType: entry.file.type,
          sizeBytes: entry.file.size,
        })
        const ticket = ticketRes.data

        await putWithProgress(ticket.uploadUrl, entry.file, (pct) =>
          patch(entry.id, { progress: pct }),
        )

        patch(entry.id, { status: 'saving', progress: 100 })

        const created = await documents.create({
          objectKey: ticket.objectKey,
          fileName: entry.file.name,
          title: entry.title.trim() || entry.file.name,
          category: entry.category,
          tags: entry.tags,
          description: entry.description?.trim() || undefined,
          documentDate: entry.documentDate,
        })

        patch(entry.id, { status: 'done', document: created.data })
        optionsRef.current?.onEntryDone?.(created.data)
      } catch (err) {
        patch(entry.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        })
      }
    },
    [patch],
  )

  const runQueue = useCallback(
    async (queue: UploadEntry[]) => {
      setIsUploading(true)
      try {
        // Simple worker pool: N workers pull from a shared cursor.
        let cursor = 0
        const worker = async () => {
          while (cursor < queue.length) {
            const entry = queue[cursor]
            cursor += 1
            await processEntry(entry)
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, queue.length) }, worker),
        )
      } finally {
        setIsUploading(false)
      }
    },
    [processEntry],
  )

  /** Validates and enqueues files, then starts uploading immediately. */
  const start = useCallback(
    (inputs: UploadEntryInput[]) => {
      const newEntries: UploadEntry[] = inputs.map((input) => {
        const error = validate(input.file)
        return {
          ...input,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          status: error ? 'error' : 'pending',
          progress: 0,
          error: error ?? undefined,
        }
      })
      setEntries((prev) => [...prev, ...newEntries])
      const runnable = newEntries.filter((e) => e.status === 'pending')
      if (runnable.length > 0) void runQueue(runnable)
      return newEntries
    },
    [validate, runQueue],
  )

  const retry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const entry = prev.find((e) => e.id === id)
        if (entry && entry.status === 'error' && !validate(entry.file)) {
          void runQueue([entry])
        }
        return prev
      })
    },
    [runQueue, validate],
  )

  const reset = useCallback(() => setEntries([]), [])

  return { entries, isUploading, start, retry, reset }
}
