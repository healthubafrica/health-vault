'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { UploadDropzone } from '@/components/vault/UploadDropzone'
import { UploadQueueModal } from '@/components/vault/UploadQueueModal'
import { EditDocumentModal } from '@/components/vault/EditDocumentModal'
import { DocumentRow } from '@/components/vault/DocumentRow'
import { VaultToolbar } from '@/components/vault/VaultToolbar'
import { useApi } from '@/lib/hooks/useApi'
import { useDocumentUpload } from '@/lib/hooks/useDocumentUpload'
import { documents as documentsApi, records as recordsApi, type VaultDocument, type DocumentListParams } from '@/lib/api'
import { formatBytes } from '@/lib/utils'

export function VaultScreen() {
  const [query, setQuery] = useState<DocumentListParams>({ sort: 'createdAt', order: 'desc' })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [editingDoc, setEditingDoc] = useState<VaultDocument | null>(null)
  // nonce forces the picker-open effect to re-fire even when replacing the
  // same document twice in a row (e.g. the user cancelled the first picker).
  const [replaceRequest, setReplaceRequest] = useState<{ doc: VaultDocument; nonce: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<VaultDocument | null>(null)
  const [deleting, setDeleting] = useState(false)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const {
    data: listRes,
    isInitialLoad,
    error,
    refetch,
  } = useApi(() => documentsApi.list(query), [JSON.stringify(query)])

  const { data: storageRes, refetch: refetchStorage } = useApi(() => recordsApi.getStorageUsage())
  const storage = storageRes?.data

  const { entries, start, retry, reset } = useDocumentUpload({
    maxFileSizeBytes: storage?.maxFileSizeBytes ?? null,
    onEntryDone: () => {
      refetch()
      refetchStorage()
    },
  })

  const docs: VaultDocument[] = listRes?.data ?? []
  const total = listRes?.meta.total ?? 0

  const storagePct = storage?.quotaBytes ? Math.min(100, (storage.usedBytes / storage.quotaBytes) * 100) : 0
  const atFileLimit = storage?.maxFiles != null && storage.fileCount >= storage.maxFiles

  const closeUploadModal = () => {
    setPendingFiles([])
    reset()
  }

  // Opens the native file picker as soon as a replace target is set. The
  // nonce guarantees this fires even when re-replacing the same document.
  useEffect(() => {
    if (replaceRequest) replaceInputRef.current?.click()
  }, [replaceRequest])

  const requestReplace = (doc: VaultDocument) =>
    setReplaceRequest({ doc, nonce: Date.now() })

  const handleDownload = async (doc: VaultDocument) => {
    if (!doc.fileUrl) return
    try {
      const res = await recordsApi.getDownloadUrl(doc.fileUrl)
      window.open(res.data.downloadUrl, '_blank')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const handleReplaceFile = async (file: File) => {
    const target = replaceRequest?.doc
    if (!target) return
    try {
      const ticketRes = await documentsApi.getReplaceUrl(target.id, {
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })
      const ticket = ticketRes.data
      const putRes = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error('Storage upload failed')
      await documentsApi.replace(target.id, { objectKey: ticket.objectKey, fileName: file.name })
      toast.success('File replaced')
      refetch()
      refetchStorage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Replace failed')
    } finally {
      setReplaceRequest(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await documentsApi.remove(confirmDelete.id)
      toast.success('Document deleted')
      setConfirmDelete(null)
      refetch()
      refetchStorage()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading your vault" showAction />
  if (error && !listRes) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1
          className="text-xl font-bold flex items-center gap-2"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
        >
          <Lock className="w-5 h-5" style={{ color: '#6DC43F' }} />
          My Vault
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Your personal document library — {total} file{total === 1 ? '' : 's'}
        </p>
      </div>

      {storage?.quotaBytes != null && (
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--color-text-muted)' }}>Storage Used</span>
            <span style={{ color: 'var(--color-text)' }}>
              {formatBytes(storage.usedBytes)} of {formatBytes(storage.quotaBytes)}
              {storage.maxFiles != null && <> · {storage.fileCount} of {storage.maxFiles} files</>}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${storagePct}%`, background: storagePct >= 90 ? '#EF4444' : '#6DC43F' }}
            />
          </div>
          {(storagePct >= 100 || atFileLimit) && (
            <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
              You have reached your plan&apos;s {storagePct >= 100 ? 'storage' : 'file count'} limit.{' '}
              <a href="/subscriptions" style={{ color: '#6DC43F', fontWeight: 700 }}>
                Upgrade to continue uploading.
              </a>
            </p>
          )}
        </div>
      )}

      <UploadDropzone
        onFilesSelected={setPendingFiles}
        disabled={storagePct >= 100 || atFileLimit}
        disabledMessage="You've reached your plan's storage/file limit — upgrade to add more documents."
      />

      <VaultToolbar query={query} onChange={setQuery} />

      <Card padding="none">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Lock size={32} style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {query.q || query.category ? 'No documents match your filters' : 'No documents yet — upload your first file above'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {docs.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onDownload={handleDownload}
                onEdit={setEditingDoc}
                onReplace={requestReplace}
                onDelete={setConfirmDelete}
              />
            ))}
          </div>
        )}
      </Card>

      {pendingFiles.length > 0 && (
        <UploadQueueModal
          files={pendingFiles}
          entries={entries}
          defaultCategory={query.category}
          onStartUpload={start}
          onRetry={retry}
          onClose={closeUploadModal}
        />
      )}

      <EditDocumentModal
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onSaved={() => refetch()}
      />

      <input
        key={replaceRequest?.nonce ?? 'none'}
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleReplaceFile(file)
          else setReplaceRequest(null)
        }}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setConfirmDelete(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Delete document?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>{confirmDelete.title}</span>{' '}
              will be permanently removed. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: '#C0392B' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
