import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AuthService,
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_PASSWORD,
  STRONG_PASSWORD_PATTERN,
  SUPPORTED_CURRENCIES
} from '../../core/auth/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthPageComponent {
  private readonly authService = inject(AuthService);
  private readonly isSignInModeSignal = signal(true);
  private readonly isForgotPasswordSignal = signal(false);
  private readonly isSubmittingSignal = signal(false);
  private readonly feedbackSignal = signal<string | null>(null);
  private readonly connectionStatusSignal = signal<string>('Checking Supabase connection...');

  readonly isSignInMode = this.isSignInModeSignal.asReadonly();
  readonly isForgotPassword = this.isForgotPasswordSignal.asReadonly();
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();
  readonly feedback = this.feedbackSignal.asReadonly();
  readonly connectionStatus = this.connectionStatusSignal.asReadonly();
  readonly isPasswordRecovery = this.authService.isPasswordRecovery;
  readonly supportsPasswordReset = computed(
    () => this.isSignInModeSignal() && !this.isPasswordRecovery() && !this.isForgotPasswordSignal()
  );
  readonly heading = computed(() =>
    this.isPasswordRecovery()
      ? 'Set a New Password'
      : this.isForgotPasswordSignal()
        ? 'Reset Your Password'
      : this.isSignInModeSignal()
        ? 'Welcome Back'
        : 'Create Your Finance Account'
  );
  readonly authIcon = computed(() =>
    this.isPasswordRecovery() || this.isForgotPasswordSignal()
      ? 'lock_reset'
      : this.isSignInModeSignal()
        ? 'login'
        : 'person_add'
  );
  readonly submitLabel = computed(() =>
    this.isPasswordRecovery()
      ? 'Update Password'
      : this.isForgotPasswordSignal()
        ? 'Send Reset Link'
        : this.isSignInModeSignal()
          ? 'Sign In'
          : 'Create Account'
  );
  readonly currencies = SUPPORTED_CURRENCIES;

  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {
    this.form = this.formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      firstName: ['', [Validators.maxLength(60)]],
      lastName: ['', [Validators.maxLength(60)]],
      defaultCurrency: ['EUR', [Validators.required]]
    });

    if (this.isPasswordRecovery()) {
      this.setPasswordStrengthValidation(true);
    }

    void this.checkConnection();
  }

  async signInWithDemoAccount(): Promise<void> {
    this.feedbackSignal.set(null);
    this.isSubmittingSignal.set(true);

    const result = await this.authService.signIn(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD);

    this.isSubmittingSignal.set(false);

    if (result.error) {
      this.feedbackSignal.set(result.error);
      return;
    }

    await this.router.navigate(['/app/dashboard']);
  }

  toggleMode(): void {
    this.feedbackSignal.set(null);
    this.isForgotPasswordSignal.set(false);
    this.isSignInModeSignal.update((mode) => !mode);
    this.setPasswordStrengthValidation(!this.isSignInModeSignal());
    const nameControls = [this.form.controls.firstName, this.form.controls.lastName];

    for (const control of nameControls) {
      if (this.isSignInModeSignal()) {
        control.removeValidators(Validators.required);
      } else {
        control.addValidators(Validators.required);
      }
      control.updateValueAndValidity();
    }
  }

  openForgotPassword(): void {
    this.feedbackSignal.set(null);
    this.isForgotPasswordSignal.set(true);
    this.setPasswordStrengthValidation(false);
  }

  returnToSignIn(): void {
    this.feedbackSignal.set(null);
    this.isForgotPasswordSignal.set(false);
    this.isSignInModeSignal.set(true);
    this.setPasswordStrengthValidation(false);
  }

  async submit(): Promise<void> {
    const isRecovery = this.isPasswordRecovery();
    const isForgotPassword = this.isForgotPasswordSignal();
    const isInvalid = isRecovery
      ? this.form.controls.password.invalid
      : isForgotPassword
        ? this.form.controls.email.invalid
        : this.form.invalid;

    if (isInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.feedbackSignal.set(null);
    this.isSubmittingSignal.set(true);

    const { email, password, firstName, lastName, defaultCurrency } = this.form.getRawValue();
    const result = isRecovery
      ? await this.authService.updatePassword(password)
      : isForgotPassword
        ? await this.authService.requestPasswordReset(email)
      : this.isSignInModeSignal()
        ? await this.authService.signIn(email, password)
        : await this.authService.signUp(email, password, firstName, lastName, defaultCurrency);

    this.isSubmittingSignal.set(false);

    if (result.error) {
      this.feedbackSignal.set(result.error);
      return;
    }

    if (isRecovery) {
      await this.router.navigate(['/app/dashboard']);
      return;
    }

    if (isForgotPassword) {
      this.feedbackSignal.set(
        result.message ?? 'Check your inbox for a link to choose a new password.'
      );
      return;
    }

    if (!this.isSignInModeSignal()) {
      this.feedbackSignal.set(
        result.message ?? 'Account created. Check your inbox and confirm your email before signing in.'
      );
      return;
    }

    await this.router.navigate(['/app/dashboard']);
  }

  private async checkConnection(): Promise<void> {
    const result = await this.authService.testConnection();
    this.connectionStatusSignal.set(
      result.ok
        ? `Supabase connected: ${this.authService.getResolvedSupabaseUrl()}`
        : `Supabase connection issue: ${result.details}`
    );
  }

  private setPasswordStrengthValidation(required: boolean): void {
    const control = this.form.controls.password;
    control.setValidators(required ? [Validators.required, Validators.pattern(STRONG_PASSWORD_PATTERN)] : [Validators.required]);
    control.updateValueAndValidity();
  }
}
