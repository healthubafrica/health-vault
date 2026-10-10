import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecordsHubScreen from './records';

jest.setTimeout(30000);

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('@/components/TopHeaderEmergency', () => () => null);

const mockPick = jest.fn();
jest.mock('expo-document-picker', () => ({ getDocumentAsync: (...a: unknown[]) => mockPick(...a) }));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    analytics: { track: jest.fn() },
    records: { getStorageUsage: jest.fn(), prescriptions: jest.fn(), list: jest.fn(), requestRefill: jest.fn() },
    labs: { listOrders: jest.fn() },
    documents: { list: jest.fn(), update: jest.fn(), create: jest.fn(), getUploadUrl: jest.fn(), remove: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { documents, records } = require('@/lib/api');

const doc = {
  id: 'd1',
  title: 'Old title',
  category: 'laboratory',
  description: null,
  providerVisibility: true,
  recordedAt: '2026-10-01T00:00:00Z',
  fileMimeType: 'application/pdf',
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecordsHubScreen />
    </QueryClientProvider>,
  );
}

describe('RecordsHubScreen documents', () => {
  beforeEach(() => {
    documents.list.mockReset().mockResolvedValue({ data: [doc], meta: { total: 1 } });
    documents.update.mockReset().mockResolvedValue({ data: doc });
    documents.create.mockReset().mockResolvedValue({ data: doc });
    documents.getUploadUrl.mockReset().mockResolvedValue({ data: { uploadUrl: 'https://up', objectKey: 'k1', expiresIn: 60 } });
    records.getStorageUsage.mockReset().mockResolvedValue({ data: { usedBytes: 0, quotaBytes: 1000, fileCount: 0, maxFiles: 10 } });
    mockPick.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({ size: 10 }),
    });
  });

  afterEach(() => (Alert.alert as jest.Mock).mockRestore());

  it('shows an error with retry when the documents request fails', async () => {
    documents.list.mockRejectedValueOnce(new Error('network'));
    const r = renderScreen();
    fireEvent.press(await r.findByText('Try Again'));
    expect(await r.findByText('Old title')).toBeTruthy();
  });

  it('edits title, category and provider visibility', async () => {
    const r = renderScreen();
    await r.findByText('Old title');
    fireEvent.press(r.getByLabelText('Edit document'));
    const input = await r.findByPlaceholderText('Document title');
    fireEvent.changeText(input, 'New title');
    fireEvent.press(r.getAllByText('Imaging').slice(-1)[0]);
    fireEvent.press(r.getByText('Save'));
    await waitFor(() =>
      expect(documents.update).toHaveBeenCalledWith('d1', {
        title: 'New title',
        category: 'imaging',
        description: '',
        providerVisibility: true,
      }),
    );
  });

  it('prompts for title and category before uploading', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ name: 'scan.pdf', uri: 'file://scan.pdf', size: 10, mimeType: 'application/pdf' }],
    });
    const r = renderScreen();
    await r.findByText('Old title');
    fireEvent.press(r.getByText('Upload Document'));
    const input = await r.findByDisplayValue('scan.pdf');
    expect(documents.create).not.toHaveBeenCalled();
    fireEvent.changeText(input, 'Chest X-ray');
    fireEvent.press(r.getByText('Upload'));
    await waitFor(() =>
      expect(documents.create).toHaveBeenCalledWith({
        objectKey: 'k1',
        fileName: 'scan.pdf',
        title: 'Chest X-ray',
        category: 'miscellaneous',
      }),
    );
  });
});
