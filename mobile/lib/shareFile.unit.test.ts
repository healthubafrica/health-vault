import { shareHtmlAsPdf, downloadAndShare, ShareUnavailableError } from './shareFile';

const mockPrint = jest.fn();
const mockShare = jest.fn();
const mockAvailable = jest.fn();
const mockDownload = jest.fn();

jest.mock('expo-print', () => ({ printToFileAsync: (...a: unknown[]) => mockPrint(...a) }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockAvailable(),
  shareAsync: (...a: unknown[]) => mockShare(...a),
}));
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: (...a: unknown[]) => mockDownload(...a),
}));

describe('shareFile', () => {
  beforeEach(() => {
    [mockPrint, mockShare, mockAvailable, mockDownload].forEach((m) => m.mockReset());
    mockAvailable.mockResolvedValue(true);
  });

  it('renders html to a pdf and shares it', async () => {
    mockPrint.mockResolvedValue({ uri: 'file:///r.pdf' });
    await shareHtmlAsPdf('<p>hi</p>', 'Receipt');
    expect(mockPrint).toHaveBeenCalledWith({ html: '<p>hi</p>' });
    expect(mockShare).toHaveBeenCalledWith('file:///r.pdf', { mimeType: 'application/pdf', dialogTitle: 'Receipt' });
  });

  it('throws a friendly error when sharing is unavailable', async () => {
    mockPrint.mockResolvedValue({ uri: 'file:///r.pdf' });
    mockAvailable.mockResolvedValue(false);
    await expect(shareHtmlAsPdf('<p/>')).rejects.toBeInstanceOf(ShareUnavailableError);
  });

  it('downloads to a sanitised cache path then shares', async () => {
    mockDownload.mockResolvedValue({ status: 200, uri: 'file:///cache/My_Report.pdf' });
    await downloadAndShare('https://s3/x', 'My Report.pdf');
    expect(mockDownload).toHaveBeenCalledWith('https://s3/x', 'file:///cache/My_Report.pdf');
    expect(mockShare).toHaveBeenCalledWith('file:///cache/My_Report.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  it('rejects a failed download without sharing', async () => {
    mockDownload.mockResolvedValue({ status: 403, uri: 'x' });
    await expect(downloadAndShare('https://s3/x', 'a.pdf')).rejects.toThrow('Download failed');
    expect(mockShare).not.toHaveBeenCalled();
  });
});
