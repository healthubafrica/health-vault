import { adminApi } from './api'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadCmsImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, or WebP images are allowed')
  }

  const { uploadUrl, publicUrl } = await adminApi.cms.requestUploadUrl(file.type, file.size)

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) throw new Error('Upload failed')

  return publicUrl
}

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
