import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthPageComponent } from './auth-page.component';
import { AuthService } from '../../core/auth/auth.service';

describe('AuthPageComponent', () => {
  let authService: any;

  beforeEach(async () => {
    authService = {
      signIn: jasmine.createSpy('signIn').and.resolveTo({ error: null }),
      signUp: jasmine.createSpy('signUp').and.resolveTo({ error: null, message: 'ok' }),
      requestPasswordReset: jasmine
        .createSpy('requestPasswordReset')
        .and.resolveTo({ error: null, message: 'reset' }),
      updatePassword: jasmine.createSpy('updatePassword').and.resolveTo({ error: null }),
      isPasswordRecovery: jasmine.createSpy('isPasswordRecovery').and.returnValue(false),
      testConnection: jasmine.createSpy('testConnection').and.resolveTo({ ok: true, details: 'ok' }),
      getResolvedSupabaseUrl: jasmine.createSpy('getResolvedSupabaseUrl').and.returnValue('https://demo')
    };

    await TestBed.configureTestingModule({
      imports: [AuthPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AuthPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should toggle mode', () => {
    const fixture = TestBed.createComponent(AuthPageComponent);
    const component = fixture.componentInstance;
    expect(component.isSignInMode()).toBeTrue();

    component.toggleMode();

    expect(component.isSignInMode()).toBeFalse();
  });

  it('should open an email-only password reset flow', async () => {
    const fixture = TestBed.createComponent(AuthPageComponent);
    const component = fixture.componentInstance;
    component.openForgotPassword();
    component.form.controls.email.setValue('user@example.com');

    await component.submit();

    expect(component.isForgotPassword()).toBeTrue();
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
  });
});
