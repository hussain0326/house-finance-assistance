import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService, STRONG_PASSWORD_PATTERN } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly isSaving = signal(false);
  readonly isChangingPassword = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly passwordFeedback = signal<string | null>(null);
  readonly profile = this.authService.getProfile();
  readonly form = this.formBuilder.nonNullable.group({
    firstName: [this.profile.firstName, [Validators.required, Validators.maxLength(60)]],
    lastName: [this.profile.lastName, [Validators.required, Validators.maxLength(60)]]
  });
  readonly passwordForm = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD_PATTERN)]],
    confirmPassword: ['', [Validators.required]]
  });

  async saveProfile(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.feedback.set(null);
    const { firstName, lastName } = this.form.getRawValue();
    const result = await this.authService.updateProfile(firstName, lastName);
    this.isSaving.set(false);
    this.feedback.set(result.error ?? result.message ?? 'Profile updated.');
  }

  async changePassword(): Promise<void> {
    const { password, confirmPassword } = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    if (password !== confirmPassword) {
      this.passwordForm.controls.confirmPassword.setErrors({ passwordMismatch: true });
      return;
    }

    this.isChangingPassword.set(true);
    this.passwordFeedback.set(null);
    const result = await this.authService.updatePassword(password);
    this.isChangingPassword.set(false);

    if (result.error) {
      this.passwordFeedback.set(result.error);
      return;
    }

    this.passwordForm.reset();
    this.passwordFeedback.set(result.message ?? 'Password updated successfully.');
  }
}
