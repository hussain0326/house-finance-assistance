import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';

export type AuthActionResult = {
  error: string | null;
  needsEmailConfirmation?: boolean;
  message?: string;
};

export type UserProfile = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly defaultCurrency: string;
};

export const SUPPORTED_CURRENCIES = [
  'EUR',
  'USD',
  'CAD',
  'MXN',
  'BRL',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'GBP',
  'CHF',
  'DKK',
  'SEK',
  'NOK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'TRY',
  'ISK',
  'JPY',
  'CNY',
  'HKD',
  'SGD',
  'INR',
  'KRW',
  'THB',
  'IDR',
  'MYR',
  'PHP',
  'VND',
  'AED',
  'SAR',
  'ILS'
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const STRONG_PASSWORD_MESSAGE =
  'Use at least 8 characters with uppercase, lowercase, a number, and a symbol.';

// Public, shared account to try the app without signing up.
export const DEMO_ACCOUNT_EMAIL = environment.demoAccountEmail;
export const DEMO_ACCOUNT_PASSWORD = environment.demoAccountPassword;
const DEMO_ACCOUNT_RESTRICTED_MESSAGE =
  'This is a shared demo account, so password and profile changes are disabled. Create your own account to save changes.';

const PASSWORD_RESET_COOLDOWN_MS = 60_000;
const PASSWORD_RESET_RATE_LIMIT_MESSAGE =
  'A reset email was recently requested. Please wait one minute before trying again.';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly loadingSignal = signal(true);
  private readonly passwordRecoverySignal = signal(false);
  private passwordResetAvailableAt = 0;

  readonly session = this.sessionSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isPasswordRecovery = this.passwordRecoverySignal.asReadonly();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {
    void this.initialize();
  }

  get isAuthenticated(): boolean {
    return !!this.sessionSignal();
  }

  get isDemoAccount(): boolean {
    return this.sessionSignal()?.user?.email?.toLowerCase() === DEMO_ACCOUNT_EMAIL.toLowerCase();
  }

  async signIn(email: string, password: string): Promise<AuthActionResult> {
    if (!this.isConfigurationReady()) {
      return { error: this.getConfigurationError() };
    }

    const { error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
    return { error: this.mapAuthError(error?.message) };
  }

  getProfile(): UserProfile {
    const user = this.sessionSignal()?.user;
    const metadata = user?.user_metadata ?? {};

    return {
      firstName: typeof metadata['first_name'] === 'string' ? metadata['first_name'] : '',
      lastName: typeof metadata['last_name'] === 'string' ? metadata['last_name'] : '',
      email: user?.email ?? '',
      defaultCurrency: this.normalizeCurrency(metadata['default_currency'])
    };
  }

  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    defaultCurrency = 'EUR'
  ): Promise<AuthActionResult> {
    if (!this.isConfigurationReady()) {
      return { error: this.getConfigurationError() };
    }

    const emailRedirectTo = this.getAuthRedirectUrl();
    const normalizedCurrency = this.normalizeCurrency(defaultCurrency);
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          default_currency: normalizedCurrency
        }
      }
    });
    if (error) {
      return { error: this.mapAuthError(error.message) };
    }

    const needsEmailConfirmation = !data.session;
    return {
      error: null,
      needsEmailConfirmation,
      message: needsEmailConfirmation
        ? 'Account created. Please confirm your email before signing in.'
        : 'Account created successfully.'
    };
  }

  async requestPasswordReset(email: string): Promise<AuthActionResult> {
    if (!this.isConfigurationReady()) {
      return { error: this.getConfigurationError() };
    }

    if (email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL.toLowerCase()) {
      return { error: DEMO_ACCOUNT_RESTRICTED_MESSAGE };
    }

    if (Date.now() < this.passwordResetAvailableAt) {
      return { error: PASSWORD_RESET_RATE_LIMIT_MESSAGE };
    }

    const redirectTo = this.getAuthRedirectUrl();
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      if (error.message.toLowerCase().includes('email rate limit exceeded')) {
        this.passwordResetAvailableAt = Date.now() + PASSWORD_RESET_COOLDOWN_MS;
      }
      return { error: this.mapAuthError(error.message) };
    }

    this.passwordResetAvailableAt = Date.now() + PASSWORD_RESET_COOLDOWN_MS;

    return {
      error: null,
      message: 'Password reset instructions have been sent if the account exists.'
    };
  }

  async updatePassword(password: string): Promise<AuthActionResult> {
    if (!this.isConfigurationReady()) {
      return { error: this.getConfigurationError() };
    }

    if (this.isDemoAccount) {
      return { error: DEMO_ACCOUNT_RESTRICTED_MESSAGE };
    }

    const { error } = await this.supabaseService.client.auth.updateUser({ password });
    if (error) {
      return { error: this.mapAuthError(error.message) };
    }

    this.passwordRecoverySignal.set(false);
    return { error: null, message: 'Password updated successfully.' };
  }

  async updateProfile(
    firstName: string,
    lastName: string,
    defaultCurrency: string
  ): Promise<AuthActionResult> {
    if (!this.isConfigurationReady()) {
      return { error: this.getConfigurationError() };
    }

    if (this.isDemoAccount) {
      return { error: DEMO_ACCOUNT_RESTRICTED_MESSAGE };
    }

    const normalizedCurrency = this.normalizeCurrency(defaultCurrency);
    const { data, error } = await this.supabaseService.client.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        default_currency: normalizedCurrency
      }
    });
    if (error) {
      return { error: this.mapAuthError(error.message) };
    }

    this.sessionSignal.update((session) => (session && data.user ? { ...session, user: data.user } : session));
    return { error: null, message: 'Profile updated.' };
  }

  async testConnection(): Promise<{ ok: boolean; details: string }> {
    if (!this.isConfigurationReady()) {
      return { ok: false, details: this.getConfigurationError() };
    }

    return this.supabaseService.testConnection();
  }

  getResolvedSupabaseUrl(): string {
    return this.supabaseService.supabaseUrl;
  }

  async signOut(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    await this.router.navigate(['/auth']);
  }

  private async initialize(): Promise<void> {
    if (!this.isConfigurationReady()) {
      this.loadingSignal.set(false);
      return;
    }

    this.passwordRecoverySignal.set(this.isPasswordRecoveryCallback());

    const {
      data: { session }
    } = await this.supabaseService.client.auth.getSession();

    this.updateSession('INITIAL_SESSION', session);

    this.supabaseService.client.auth.onAuthStateChange((event, currentSession) => {
      this.updateSession(event, currentSession);
    });
  }

  private updateSession(event: AuthChangeEvent, currentSession: Session | null): void {
    this.sessionSignal.set(currentSession);
    this.loadingSignal.set(false);

    if (event === 'PASSWORD_RECOVERY') {
      this.passwordRecoverySignal.set(true);
      return;
    }

    if (event === 'SIGNED_IN' && this.router.url === '/auth') {
      void this.router.navigate(['/app/dashboard']);
    }
  }

  private isPasswordRecoveryCallback(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const parameters = new URLSearchParams(window.location.hash.slice(1));
    return parameters.get('type') === 'recovery';
  }

  private mapAuthError(rawMessage: string | undefined): string | null {
    if (!rawMessage) {
      return null;
    }

    const value = rawMessage.toLowerCase();
    if (value.includes('invalid login credentials')) {
      return 'Invalid email or password.';
    }
    if (value.includes('email not confirmed')) {
      return 'Please confirm your email before signing in.';
    }
    if (value.includes('already registered')) {
      return 'An account with this email already exists. Try signing in.';
    }
    if (value.includes('password should be at least') || value.includes('password is too weak')) {
      return STRONG_PASSWORD_MESSAGE;
    }
    if (value.includes('for security purposes')) {
      return 'Too many attempts. Please wait and try again.';
    }
    if (value.includes('email rate limit exceeded')) {
      return PASSWORD_RESET_RATE_LIMIT_MESSAGE;
    }

    return rawMessage;
  }

  private isConfigurationReady(): boolean {
    return this.supabaseService.isConfigured ?? true;
  }

  private getAuthRedirectUrl(): string {
    if (Capacitor.isNativePlatform()) {
      return 'expenseintel://auth';
    }

    const configuredAppUrl = (environment.appUrl ?? '').trim().replace(/\/$/, '');
    const origin = configuredAppUrl || (typeof window === 'undefined' ? '' : window.location.origin);
    return `${origin}/auth`;
  }

  private normalizeCurrency(value: unknown): SupportedCurrency {
    return typeof value === 'string' && SUPPORTED_CURRENCIES.includes(value as SupportedCurrency)
      ? (value as SupportedCurrency)
      : 'EUR';
  }

  private getConfigurationError(): string {
    return (
      this.supabaseService.configurationMessage ??
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment file.'
    );
  }
}
