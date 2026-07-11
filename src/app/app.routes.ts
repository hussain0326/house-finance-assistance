import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AuthPageComponent } from './features/auth/auth-page.component';
import { DashboardShellComponent } from './features/dashboard/dashboard-shell.component';
import { AnalyticsPageComponent } from './features/dashboard/pages/analytics/analytics-page.component';
import { AssistantPageComponent } from './features/dashboard/pages/assistant/assistant-page.component';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard/dashboard-page.component';
import { ReceiptHistoryPageComponent } from './features/dashboard/pages/history/receipt-history-page.component';
import { ReceiptPageComponent } from './features/dashboard/pages/receipt/receipt-page.component';
import { SettingsPageComponent } from './features/dashboard/pages/settings/settings-page.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'auth' },
	{ path: 'auth', component: AuthPageComponent },
	{
		path: 'app',
		component: DashboardShellComponent,
		canActivate: [authGuard],
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
			{ path: 'dashboard', component: DashboardPageComponent },
			{ path: 'receipt', component: ReceiptPageComponent },
			{ path: 'history', component: ReceiptHistoryPageComponent },
			{ path: 'analytics', component: AnalyticsPageComponent },
			{ path: 'assistant', component: AssistantPageComponent },
			{ path: 'settings', component: SettingsPageComponent }
		]
	},
	{ path: '**', redirectTo: 'auth' }
];
