import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  let service: AssistantService;
  let mockSupabaseService: any;

  beforeEach(() => {
    mockSupabaseService = {
      client: {
        functions: {
          invoke: jasmine.createSpy('invoke')
        }
      }
    };

    service = new AssistantService(mockSupabaseService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('sendMessage should return the reply and conversationId on success', async () => {
    mockSupabaseService.client.functions.invoke.and.resolveTo({
      data: { reply: 'You spent 42.00 on Clothing.', conversationId: 'conversation-1' },
      error: null
    });

    const result = await service.sendMessage('How much did I spend on Clothing?', null);

    expect(mockSupabaseService.client.functions.invoke).toHaveBeenCalledWith('ai-assistant', {
      body: { message: 'How much did I spend on Clothing?', conversationId: null }
    });
    expect(result).toEqual({
      success: true,
      message: 'You spent 42.00 on Clothing.',
      conversationId: 'conversation-1'
    });
  });

  it('sendMessage should fall back to a default reply when data is missing a reply', async () => {
    mockSupabaseService.client.functions.invoke.and.resolveTo({
      data: { conversationId: 'conversation-1' },
      error: null
    });

    const result = await service.sendMessage('Anything unusual?', 'conversation-1');

    expect(result.success).toBeTrue();
    expect(result.message).toBe('I could not find an answer for that.');
  });

  it('sendMessage should surface the JSON error body from the edge function response', async () => {
    const context = {
      clone: () => ({
        json: () => Promise.resolve({ error: 'AI assistant is not configured.' })
      })
    };
    mockSupabaseService.client.functions.invoke.and.resolveTo({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context }
    });

    const result = await service.sendMessage('How much did I spend?', null);

    expect(result.success).toBeFalse();
    expect(result.message).toBe('The assistant could not respond: AI assistant is not configured.');
  });

  it('sendMessage should fall back to the SDK error message when the response has no JSON body', async () => {
    const context = {
      clone: () => ({
        json: () => Promise.reject(new Error('not json'))
      })
    };
    mockSupabaseService.client.functions.invoke.and.resolveTo({
      data: null,
      error: { message: 'Network error', context }
    });

    const result = await service.sendMessage('How much did I spend?', null);

    expect(result.success).toBeFalse();
    expect(result.message).toBe('The assistant could not respond: Network error');
  });

  it('sendMessage should return a generic message when no error details are available', async () => {
    mockSupabaseService.client.functions.invoke.and.resolveTo({
      data: null,
      error: {}
    });

    const result = await service.sendMessage('How much did I spend?', null);

    expect(result.success).toBeFalse();
    expect(result.message).toBe('The assistant could not respond.');
  });
});
