import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export class ShareUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device.');
    this.name = 'ShareUnavailableError';
  }
}

async function shareUri(uri: string, mimeType: string, dialogTitle?: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new ShareUnavailableError();
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

/** Renders HTML (e.g. a payment receipt) to a PDF and opens the share sheet. */
export async function shareHtmlAsPdf(html: string, dialogTitle?: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  await shareUri(uri, 'application/pdf', dialogTitle);
}

/** Downloads a (presigned) file URL to the cache and opens the share sheet. */
export async function downloadAndShare(url: string, fileName: string, mimeType = 'application/pdf'): Promise<void> {
  const safeName = fileName.replace(/[^\w.\-]+/g, '_') || 'document';
  const target = `${FileSystem.cacheDirectory}${safeName}`;
  const res = await FileSystem.downloadAsync(url, target);
  if (res.status < 200 || res.status >= 300) throw new Error(`Download failed (${res.status})`);
  await shareUri(res.uri, mimeType, fileName);
}
