import { TestBed } from '@angular/core/testing';
import { SettingsPageComponent } from './settings-page.component';
import { AuthService } from '../../../../core/auth/auth.service';

describe('SettingsPageComponent', () => {
  const authService = {
    getProfile: jasmine.createSpy('getProfile').and.returnValue({
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex@example.com'
    }),
    updateProfile: jasmine.createSpy('updateProfile').and.resolveTo({ error: null }),
    updatePassword: jasmine.createSpy('updatePassword').and.resolveTo({ error: null })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [{ provide: AuthService, useValue: authService }]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should update the password when confirmation matches', async () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    const component = fixture.componentInstance;
    component.passwordForm.setValue({ password: 'New-password123!', confirmPassword: 'New-password123!' });

    await component.changePassword();

    expect(authService.updatePassword).toHaveBeenCalledWith('New-password123!');
  });
});
