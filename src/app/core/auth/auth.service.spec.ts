import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let router: any;
  let mockAuth: any;
  let mockSupabaseService: any;

  beforeEach(() => {
    mockAuth = {
      signInWithPassword: jasmine.createSpy('signInWithPassword').and.resolveTo({ error: null }),
      signUp: jasmine.createSpy('signUp').and.resolveTo({ data: { session: null }, error: null }),
      resetPasswordForEmail: jasmine.createSpy('resetPasswordForEmail').and.resolveTo({ error: null }),
      signOut: jasmine.createSpy('signOut').and.resolveTo({}),
      getSession: jasmine.createSpy('getSession').and.resolveTo({ data: { session: null } }),
      onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.callFake(() => ({
        data: { subscription: { unsubscribe: () => undefined } }
      }))
    };

    mockSupabaseService = {
      client: { auth: mockAuth },
      testConnection: jasmine.createSpy('testConnection').and.resolveTo({ ok: true, details: 'ok' }),
      supabaseUrl: 'https://demo.supabase.co'
    };

    router = {
      url: '/auth',
      navigate: jasmine.createSpy('navigate').and.resolveTo(true)
    };

    service = new AuthService(mockSupabaseService, router);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should map invalid credentials error on sign in', async () => {
    mockAuth.signInWithPassword.and.resolveTo({
      error: { message: 'Invalid login credentials' }
    });

    const result = await service.signIn('a@b.com', 'password123');

    expect(result.error).toBe('Invalid email or password.');
  });

  it('should return confirmation-required message on sign up when no session', async () => {
    const result = await service.signUp('a@b.com', 'password123');

    expect(result.error).toBeNull();
    expect(result.needsEmailConfirmation).toBeTrue();
  });

  it('should proxy testConnection', async () => {
    const result = await service.testConnection();

    expect(mockSupabaseService.testConnection).toHaveBeenCalled();
    expect(result.ok).toBeTrue();
  });

  it('should sign out and navigate to auth', async () => {
    await service.signOut();

    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth']);
  });
});
