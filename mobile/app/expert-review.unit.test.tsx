import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpertReviewScreen from './expert-review';
import ExpertReviewCaseScreen from './expert-review-case';
import ExpertReviewNewScreen from './expert-review-new';

jest.setTimeout(30000);

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({ id: 'e1' }),
}));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    expertReview: { list: jest.fn(), get: jest.fn(), create: jest.fn(), acknowledgeDisclaimer: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { expertReview, ApiError } = require('@/lib/api');

function wrap(el: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = jest.spyOn(client, 'invalidateQueries');
  return { ...render(<QueryClientProvider client={client}>{el}</QueryClientProvider>), spy };
}

const baseCase = {
  id: 'e1',
  hhaRef: 'ER-2026-0001',
  reviewType: 'second_opinion',
  urgency: 'urgent',
  status: 'under_review',
  clinicalQuestion: 'Is surgery needed?',
  primaryDiagnosis: 'Knee osteoarthritis',
  submittedAt: '2026-10-01T10:00:00Z',
};

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  Object.values(expertReview).forEach((f) => (f as jest.Mock).mockReset());
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('Expert Review list', () => {
  it('lists cases with status and urgency pills and opens the detail', async () => {
    expertReview.list.mockResolvedValue([baseCase]);
    const r = wrap(<ExpertReviewScreen />);
    expect(await r.findByText('Knee osteoarthritis')).toBeTruthy();
    expect(r.getByText('Under Review')).toBeTruthy();
    expect(r.getByText('Urgent')).toBeTruthy();
    fireEvent.press(r.getByText('Knee osteoarthritis'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/expert-review-case', params: { id: 'e1' } });
  });

  it('shows the empty state with booking and submit actions', async () => {
    expertReview.list.mockResolvedValue([]);
    const r = wrap(<ExpertReviewScreen />);
    expect(await r.findByText('No Expert Review Cases')).toBeTruthy();
    fireEvent.press(r.getByText('Book Expert Review'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/book-appointment-step1', params: { preselect: 'expert-review' } });
    fireEvent.press(r.getByText('Submit a case'));
    expect(mockPush).toHaveBeenCalledWith('/expert-review-new');
  });

  it('shows an error state when loading fails', async () => {
    expertReview.list.mockRejectedValue(new ApiError(500, 'boom'));
    const r = wrap(<ExpertReviewScreen />);
    expect(await r.findByText('Failed to load data')).toBeTruthy();
  });
});

describe('Expert Review case detail', () => {
  it('renders timeline, specialist notes, documents and the report', async () => {
    expertReview.get.mockResolvedValue({
      ...baseCase,
      status: 'report_ready',
      statusEvents: [
        { toStatus: 'under_review', occurredAt: '2026-10-02T10:00:00Z' },
        { toStatus: 'submitted', occurredAt: '2026-10-01T10:00:00Z' },
      ],
      specialistNotes: [{ id: 'n1', note: 'Please send the MRI.' }],
      documents: [{ id: 'd1', title: 'MRI report' }],
      finalReport: { summary: 'All good overall.', recommendations: 'Physio.', followUpRequired: true },
      reportRequiresDisclaimer: false,
    });
    const r = wrap(<ExpertReviewCaseScreen />);
    expect(await r.findByText('Please send the MRI.')).toBeTruthy();
    expect(r.getByText('• MRI report')).toBeTruthy();
    expect(r.getByText('All good overall.')).toBeTruthy();
    expect(r.getByText('Follow-up is recommended.')).toBeTruthy();
    expect(r.queryByText('Acknowledge')).toBeNull();
  });

  it('shows the disclaimer instead of the report until acknowledged, then refetches', async () => {
    expertReview.get
      .mockResolvedValueOnce({ ...baseCase, status: 'report_ready', finalReport: null, reportRequiresDisclaimer: true })
      .mockResolvedValue({
        ...baseCase,
        status: 'report_ready',
        finalReport: { summary: 'Unlocked summary.' },
        reportRequiresDisclaimer: false,
      });
    expertReview.acknowledgeDisclaimer.mockResolvedValue({});
    const r = wrap(<ExpertReviewCaseScreen />);
    fireEvent.press(await r.findByText('Acknowledge'));
    await waitFor(() => expect(expertReview.acknowledgeDisclaimer).toHaveBeenCalledWith('e1'));
    expect(await r.findByText('Unlocked summary.')).toBeTruthy();
    expect(expertReview.get).toHaveBeenCalledTimes(2);
  });

  it('shows a friendly message when the case is not found', async () => {
    expertReview.get.mockRejectedValue(new ApiError(404, 'Not Found'));
    const r = wrap(<ExpertReviewCaseScreen />);
    expect(await r.findByText('Case not found')).toBeTruthy();
  });
});

describe('Expert Review new case form', () => {
  const summary = 'Persistent knee pain for six months.';

  it('sends no request when the form is invalid', async () => {
    const r = wrap(<ExpertReviewNewScreen />);
    fireEvent.changeText(r.getByPlaceholderText(/Describe your condition/), 'too short');
    fireEvent.press(r.getByText('Submit case'));
    expect(await r.findByText('Choose a review type.')).toBeTruthy();
    expect(r.getByText('Choose an urgency.')).toBeTruthy();
    expect(r.getByText(/at least 20 characters/)).toBeTruthy();
    expect(expertReview.create).not.toHaveBeenCalled();
  });

  it('sends the exact payload, then shows the reference and refreshes the list', async () => {
    expertReview.create.mockResolvedValue({ ...baseCase, hhaRef: 'ER-2026-0099' });
    const r = wrap(<ExpertReviewNewScreen />);
    fireEvent.press(r.getByText('Surgical Review'));
    fireEvent.press(r.getByText('Urgent'));
    fireEvent.changeText(r.getByPlaceholderText(/Describe your condition/), `  ${summary}  `);
    fireEvent.changeText(r.getByPlaceholderText(/What do you want the specialist/), 'Is surgery needed?');
    fireEvent.press(r.getByText('Submit case'));
    await waitFor(() =>
      expect(expertReview.create).toHaveBeenCalledWith({
        reviewType: 'surgical_review',
        urgency: 'urgent',
        clinicalSummary: summary,
        specificQuestions: 'Is surgery needed?',
      }),
    );
    expect(await r.findByText(/ER-2026-0099/)).toBeTruthy();
    expect(r.spy).toHaveBeenCalledWith({ queryKey: ['expert-review', 'cases'] });
  });

  it('keeps the form and alerts when submission fails', async () => {
    expertReview.create.mockRejectedValue(new ApiError(500, 'Server down'));
    const r = wrap(<ExpertReviewNewScreen />);
    fireEvent.press(r.getByText('Second Opinion'));
    fireEvent.press(r.getByText('Routine'));
    fireEvent.changeText(r.getByPlaceholderText(/Describe your condition/), summary);
    fireEvent.press(r.getByText('Submit case'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Could not submit your case', 'Server down'));
    expect(r.getByText('Submit case')).toBeTruthy();
  });
});
