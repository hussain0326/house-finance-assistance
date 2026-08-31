import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonTabBar,
  IonTabButton,
  IonToolbar
} from '@ionic/angular/standalone';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  analyticsOutline,
  homeOutline,
  logOutOutline,
  receiptOutline,
  settingsOutline,
  sparklesOutline,
  timeOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
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
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuButton,
    IonMenuToggle,
    IonTabBar,
    IonTabButton,
    IonToolbar
  ],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardShellComponent {
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: 'home-outline' },
    { label: 'Receipt', route: '/app/receipt', icon: 'receipt-outline' },
    { label: 'Receipt History', route: '/app/history', icon: 'time-outline' },
    { label: 'Analytics', route: '/app/analytics', icon: 'analytics-outline' },
    { label: 'AI Assistant', route: '/app/assistant', icon: 'sparkles-outline' },
    { label: 'Settings', route: '/app/settings', icon: 'settings-outline' }
  ];
  readonly mobileNavItems = this.navItems.filter((item) => item.route !== '/app/settings');

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
        return 'Receipt History';
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

    return activeItem?.icon ?? 'home-outline';
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

  constructor(private readonly authService: AuthService) {
    addIcons({
      analyticsOutline,
      homeOutline,
      logOutOutline,
      receiptOutline,
      settingsOutline,
      sparklesOutline,
      timeOutline
    });
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
