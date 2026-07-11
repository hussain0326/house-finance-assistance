import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardShellComponent } from './dashboard-shell.component';
import { AuthService } from '../../core/auth/auth.service';

describe('DashboardShellComponent', () => {
  let authService: any;

  beforeEach(async () => {
    authService = {
      signOut: jasmine.createSpy('signOut').and.resolveTo()
    };

    await TestBed.configureTestingModule({
      imports: [DashboardShellComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose nav items', () => {
    const fixture = TestBed.createComponent(DashboardShellComponent);
    const component = fixture.componentInstance;

    expect(component.navItems.length).toBe(6);
  });
});
