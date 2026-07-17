import * as Sentry from '@sentry/react-native';
jest.mock('../../global.css', () => ({})); // Mock CSS
import '../../App'; // Triggers Sentry.init

describe('Sentry beforeSend PII Scrubber', () => {
  it('should scrub PANs and bearer tokens from exception values and messages', () => {
    // App.tsx calls Sentry.init({ beforeSend: ... })
    const initCall = (Sentry.init as jest.Mock).mock.calls[0];
    expect(initCall).toBeDefined();
    const beforeSend = initCall[0].beforeSend;
    expect(beforeSend).toBeDefined();

    const mockEvent: any = {
      message: 'Failed to process card 4242-4242-4242-4242 due to network error',
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Error charging card 1234 5678 1234 5678 with token Bearer abcdef123',
          },
        ],
      },
      extra: {
        rawError: 'Card 1111222233334444 declined',
        token: 'Bearer xyz',
      },
    };

    const scrubbedEvent = beforeSend(mockEvent);

    expect(scrubbedEvent.message).toBe('Failed to process card [REDACTED_PAN] due to network error');
    expect(scrubbedEvent.exception.values[0].value).toBe('Error charging card [REDACTED_PAN] with token Bearer [REDACTED_BEARER_TOKEN]');
    expect(scrubbedEvent.extra.rawError).toBe('Card [REDACTED_PAN] declined');
    // For object keys containing 'token', the entire value is scrubbed in App.tsx
    expect(scrubbedEvent.extra.token).toBe('[SCRUBBED_PII]');
  });
});
