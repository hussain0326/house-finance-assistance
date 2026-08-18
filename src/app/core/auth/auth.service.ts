import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

export type AuthActionResult = {
  error: string | null;
  needsEmailConfirmation?: boolean;
  message?: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly loadingSignal = signal(true);

  readonly session = this.sessionSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {
    void this.initialize();
  }

  get isAuthenticated(): boolean {
    return !!this.sessionSignal();
  }

  async signIn(email: string, password: string): Promise<AuthActionResult> {
    if (!this.isConfigurationReady()) {
      return { error: this.getConfigurationError() };
    }

    const { error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
    return { error: this.mapAuthError(error?.message) };
  }

  async signUp(email: string, password: string): Promise<AuthActionResult> {
    if (!this.isConfigurationReady()) {
      return { error: this.getConfigurationError() };
    }

    const emailRedirectTo = `${window.location.origin}/auth`;
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo }
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

    const redirectTo = `${window.location.origin}/auth`;
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      return { error: this.mapAuthError(error.message) };
    }

    return {
      error: null,
      message: 'Password reset instructions have been sent if the account exists.'
    };
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

    if (event === 'SIGNED_IN' && this.router.url === '/auth') {
      void this.router.navigate(['/app/dashboard']);
    }
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
    if (value.includes('password should be at least')) {
      return 'Password must be at least 8 characters long.';
    }
    if (value.includes('for security purposes')) {
      return 'Too many attempts. Please wait and try again.';
    }

    return rawMessage;
  }

  private isConfigurationReady(): boolean {
    return this.supabaseService.isConfigured ?? true;
  }

  private getConfigurationError(): string {
    return (
      this.supabaseService.configurationMessage ??
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment file.'
    );
  }
}
