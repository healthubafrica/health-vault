'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function getCroppedImageBlob(imageSrc: string, area: Area, outputType: string): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = area.width
  canvas.height = area.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser')
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate cropped image'))), outputType, 0.92)
  })
}

interface PhotoCropModalProps {
  imageSrc: string
  outputType: string
  saving?: boolean
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export function PhotoCropModal({ imageSrc, outputType, saving, onCancel, onConfirm }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, outputType)
      onConfirm(blob)
    } catch {
      // onConfirm is skipped; caller keeps its current photo unchanged.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onCancel} />
      <div
        className="relative w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Adjust photo</h2>
          <button onClick={onCancel} style={{ color: 'var(--color-text-muted)' }} aria-label="Cancel">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative w-full" style={{ height: 320, background: '#000' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} disabled={!croppedAreaPixels} onClick={handleSave}>
              Save photo
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
