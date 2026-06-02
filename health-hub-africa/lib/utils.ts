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

export function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str
}
