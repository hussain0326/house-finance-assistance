import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from '../supabase/supabase.service';

const AUTH_CALLBACK_URL = 'expenseintel://auth';

@Injectable({
  providedIn: 'root'
})
export class AuthDeepLinkService {
  constructor(
    private readonly router: Router,
    private readonly supabaseService: SupabaseService
  ) {}

  initialize(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    void CapacitorApp.addListener('appUrlOpen', ({ url }) => this.handleUrl(url));
  }

  private async handleUrl(url: string): Promise<void> {
    if (!url.startsWith(AUTH_CALLBACK_URL)) {
      return;
    }

    const callbackUrl = new URL(url.replace(AUTH_CALLBACK_URL, 'http://localhost/auth'));
    const accessToken = callbackUrl.hash ? new URLSearchParams(callbackUrl.hash.slice(1)).get('access_token') : null;
    const refreshToken = callbackUrl.hash ? new URLSearchParams(callbackUrl.hash.slice(1)).get('refresh_token') : null;
    if (accessToken && refreshToken) {
      await this.supabaseService.client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
    await this.router.navigate(['/auth']);
  }
}