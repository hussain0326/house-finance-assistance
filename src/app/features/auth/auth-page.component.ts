import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthPageComponent {
  private readonly isSignInModeSignal = signal(true);
  private readonly isSubmittingSignal = signal(false);
  private readonly feedbackSignal = signal<string | null>(null);
  private readonly connectionStatusSignal = signal<string>('Checking Supabase connection...');

  readonly isSignInMode = this.isSignInModeSignal.asReadonly();
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();
  readonly feedback = this.feedbackSignal.asReadonly();
  readonly connectionStatus = this.connectionStatusSignal.asReadonly();
  readonly supportsPasswordReset = computed(() => this.isSignInModeSignal());
  readonly heading = computed(() =>
    this.isSignInModeSignal() ? 'Welcome Back' : 'Create Your Finance Account'
  );
  readonly authIcon = computed(() => (this.isSignInModeSignal() ? 'login' : 'person_add'));
  readonly submitLabel = computed(() => (this.isSignInModeSignal() ? 'Sign In' : 'Sign Up'));

  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.form = this.formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    void this.checkConnection();
  }

  toggleMode(): void {
    this.feedbackSignal.set(null);
    this.isSignInModeSignal.update((mode) => !mode);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.feedbackSignal.set(null);
    this.isSubmittingSignal.set(true);

    const { email, password } = this.form.getRawValue();
    const result = this.isSignInModeSignal()
      ? await this.authService.signIn(email, password)
      : await this.authService.signUp(email, password);

    this.isSubmittingSignal.set(false);

    if (result.error) {
      this.feedbackSignal.set(result.error);
      return;
    }

    if (!this.isSignInModeSignal()) {
      this.feedbackSignal.set(
        result.message ?? 'Account created. Check your email if confirmation is required.'
      );
      return;
    }

    await this.router.navigate(['/app/dashboard']);
  }

  async sendPasswordReset(): Promise<void> {
    const email = this.form.controls.email.value;
    if (!email) {
      this.feedbackSignal.set('Enter your email to reset your password.');
      return;
    }

    this.isSubmittingSignal.set(true);
    const result = await this.authService.requestPasswordReset(email);
    this.isSubmittingSignal.set(false);

    if (result.error) {
      this.feedbackSignal.set(result.error);
      return;
    }

    this.feedbackSignal.set(result.message ?? 'Password reset email sent.');
  }

  private async checkConnection(): Promise<void> {
    const result = await this.authService.testConnection();
    this.connectionStatusSignal.set(
      result.ok
        ? `Supabase connected: ${this.authService.getResolvedSupabaseUrl()}`
        : `Supabase connection issue: ${result.details}`
    );
  }
}
