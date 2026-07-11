import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('should allow access when authenticated', async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isLoading: () => false,
            isAuthenticated: true
          }
        },
        {
          provide: Router,
          useValue: {
            parseUrl: jasmine.createSpy('parseUrl').and.callFake((arg: string) => arg)
          }
        }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    await expectAsync(Promise.resolve(result)).toBeResolvedTo(true);
  });

  it('should redirect to auth when not authenticated', async () => {
    const parseUrl = jasmine.createSpy('parseUrl').and.returnValue('/auth-tree' as any);

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isLoading: () => false,
            isAuthenticated: false
          }
        },
        {
          provide: Router,
          useValue: { parseUrl }
        }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    await expectAsync(Promise.resolve(result)).toBeResolvedTo('/auth-tree' as any);
    expect(parseUrl).toHaveBeenCalledWith('/auth');
  });
});
