import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let mockClient: any;
  let service: SupabaseService;

  beforeEach(() => {
    mockClient = {
      from: jasmine.createSpy('from')
    };

    service = new SupabaseService();
    (service as any).clientInstance = mockClient;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve MCP URL into project URL', () => {
    const result = (service as any).resolveSupabaseUrl(
      'https://mcp.supabase.com?project_ref=abc123&read_only=true'
    );

    expect(result).toBe('https://abc123.supabase.co');
  });

  it('testConnection should return ok=true when query succeeds', async () => {
    mockClient.from.and.returnValue({
      select: () => ({
        limit: () => Promise.resolve({ error: null })
      })
    });

    const result = await service.testConnection();

    expect(result.ok).toBeTrue();
  });

  it('testConnection should treat missing profiles table as ok', async () => {
    mockClient.from.and.returnValue({
      select: () => ({
        limit: () => Promise.resolve({ error: { code: '42P01', message: 'missing table' } })
      })
    });

    const result = await service.testConnection();

    expect(result.ok).toBeTrue();
    expect(result.details).toContain('does not exist yet');
  });

  it('testConnection should return failure for other errors', async () => {
    mockClient.from.and.returnValue({
      select: () => ({
        limit: () => Promise.resolve({ error: { code: '500', message: 'boom' } })
      })
    });

    const result = await service.testConnection();

    expect(result.ok).toBeFalse();
    expect(result.details).toBe('boom');
  });
});
