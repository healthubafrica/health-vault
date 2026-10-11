import {
  statusLabel, statusPill, urgencyPill, reviewTypeLabel, sortEvents, caseTitle,
  validateForm, buildPayload, noteText, documentName,
} from './expertReview';

const valid = {
  reviewType: 'second_opinion' as const,
  urgency: 'routine' as const,
  clinicalSummary: '  Persistent chest pain for two weeks.  ',
  specificQuestions: '',
  requestedSpecialization: '',
};

describe('expertReview helpers', () => {
  it('labels statuses and review types', () => {
    expect(statusLabel('specialist_assigned')).toBe('Specialist Assigned');
    expect(reviewTypeLabel('imaging_review')).toBe('Imaging Review');
  });

  it('maps pills like the portal', () => {
    expect(statusPill('submitted')).toBe('amber');
    expect(statusPill('report_ready')).toBe('green');
    expect(statusPill('closed')).toBe('new');
    expect(statusPill('cancelled')).toBe('red');
    expect(statusPill('weird')).toBe('new');
    expect(urgencyPill('urgent')).toBe('amber');
    expect(urgencyPill('emergency')).toBe('red');
    expect(urgencyPill('routine')).toBe('new');
  });

  it('prefers the diagnosis as the case title', () => {
    expect(caseTitle({ primaryDiagnosis: 'Asthma', clinicalQuestion: 'Q' })).toBe('Asthma');
    expect(caseTitle({ primaryDiagnosis: null, clinicalQuestion: 'Q' })).toBe('Q');
  });

  it('sorts events oldest first without mutating', () => {
    const input = [
      { toStatus: 'b', occurredAt: '2026-10-02T00:00:00Z' },
      { toStatus: 'a', occurredAt: '2026-10-01T00:00:00Z' },
    ];
    expect(sortEvents(input).map((e) => e.toStatus)).toEqual(['a', 'b']);
    expect(input[0].toStatus).toBe('b');
    expect(sortEvents(undefined)).toEqual([]);
  });

  it('reads note text and document names tolerantly', () => {
    expect(noteText({ notes: 'hi' })).toBe('hi');
    expect(noteText({})).toBe('');
    expect(documentName({ fileName: 'scan.pdf' })).toBe('scan.pdf');
    expect(documentName({})).toBe('Document');
  });

  it('validates the form', () => {
    expect(validateForm(valid)).toEqual({});
    const errs = validateForm({ ...valid, reviewType: null, urgency: null, clinicalSummary: 'too short' });
    expect(Object.keys(errs).sort()).toEqual(['clinicalSummary', 'reviewType', 'urgency']);
  });

  it('builds a whitelisted payload omitting blank optionals', () => {
    expect(buildPayload(valid)).toEqual({
      reviewType: 'second_opinion',
      urgency: 'routine',
      clinicalSummary: 'Persistent chest pain for two weeks.',
    });
    expect(buildPayload({ ...valid, specificQuestions: ' Is surgery needed? ', requestedSpecialization: 'Cardiology' })).toEqual({
      reviewType: 'second_opinion',
      urgency: 'routine',
      clinicalSummary: 'Persistent chest pain for two weeks.',
      specificQuestions: 'Is surgery needed?',
      requestedSpecialization: 'Cardiology',
    });
  });
});
