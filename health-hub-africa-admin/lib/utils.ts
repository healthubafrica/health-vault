import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = '₦') {
  return `${currency}${amount.toLocaleString()}`
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function formatKoboToNaira(kobo: number) {
  return formatCurrency(kobo / 100)
}
