import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

type NavItem = {
  readonly label: string;
  readonly route: string;
  readonly icon: string;
};

@Component({
  selector: 'app-dashboard-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: 'space_dashboard' },
    { label: 'Receipt', route: '/app/receipt', icon: 'receipt_long' },
    { label: 'History', route: '/app/history', icon: 'history' },
    { label: 'Analytics', route: '/app/analytics', icon: 'monitoring' },
    { label: 'AI Assistant', route: '/app/assistant', icon: 'smart_toy' },
    { label: 'Settings', route: '/app/settings', icon: 'settings' }
  ];

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 767px)').pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  readonly activeRoute = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.split('?')[0])
    ),
    { initialValue: '/app/dashboard' }
  );

  readonly currentPageTitle = computed(() => {
    const route = this.activeRoute();

    switch (route) {
      case '/app/dashboard':
        return 'Financial Overview';
      case '/app/receipt':
        return 'Receipt Upload';
      case '/app/history':
        return 'Expense History';
      case '/app/analytics':
        return 'Spending Analytics';
      case '/app/assistant':
        return 'AI Budget Assistant';
      case '/app/settings':
        return 'Account Settings';
      default:
        return 'Home Finance Console';
    }
  });

  readonly currentPageIcon = computed(() => {
    const route = this.activeRoute();
    const activeItem = this.navItems.find((item) => item.route === route);

    return activeItem?.icon ?? 'dashboard';
  });

  readonly currentPageSubtitle = computed(() => {
    const route = this.activeRoute();

    switch (route) {
      case '/app/dashboard':
        return 'Track your spending, balances, and monthly performance in one place.';
      case '/app/receipt':
        return 'Capture receipts quickly and keep records organized for budgeting.';
      case '/app/history':
        return 'Review and refine historical transactions with smart filters.';
      case '/app/analytics':
        return 'Explore trends and category insights to improve spending decisions.';
      case '/app/assistant':
        return 'Get AI-guided budgeting suggestions and personalized next steps.';
      case '/app/settings':
        return 'Manage account preferences, profile settings, and integrations.';
      default:
        return 'Your personal finance command center.';
    }
  });

  readonly currentYear = new Date().getFullYear();

  constructor(private readonly authService: AuthService) {}

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
