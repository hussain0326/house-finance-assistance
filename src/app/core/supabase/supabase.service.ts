import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly resolvedUrl = this.resolveSupabaseUrl(environment.supabaseUrl ?? '');
  private readonly resolvedAnonKey = (environment.supabaseAnonKey ?? '').trim();
  private readonly defaultUrl = 'https://example.supabase.co';
  private readonly defaultAnonKey = 'public-anon-key';
  private readonly sourceFile = environment.production ? '.env.production' : '.env.local';

  private readonly clientInstance: SupabaseClient = createClient(
    this.resolvedUrl || this.defaultUrl,
    this.resolvedAnonKey || this.defaultAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  get isConfigured(): boolean {
    const url = this.resolvedUrl.trim();
    const key = this.resolvedAnonKey.trim();

    if (!url || !key) {
      return false;
    }

    if (url === this.defaultUrl || key === this.defaultAnonKey) {
      return false;
    }

    return true;
  }

  get configurationSource(): string {
    return this.sourceFile;
  }

  get configurationMessage(): string {
    return `Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in src/environments/${this.sourceFile}.`;
  }

  get client(): SupabaseClient {
    return this.clientInstance;
  }

  get supabaseUrl(): string {
    return this.resolvedUrl;
  }

  async testConnection(): Promise<{ ok: boolean; details: string }> {
    if (!this.isConfigured) {
      return { ok: false, details: this.configurationMessage };
    }

    const { error } = await this.client.from('profiles').select('id').limit(1);
    if (!error) {
      return { ok: true, details: 'Connection successful.' };
    }

    if (error.code === '42P01') {
      return {
        ok: true,
        details: 'Connected. Table "profiles" does not exist yet, which is expected before migrations.'
      };
    }

    return { ok: false, details: error.message };
  }

  private resolveSupabaseUrl(inputUrl: string): string {
    try {
      const parsed = new URL(inputUrl);
      if (parsed.hostname === 'mcp.supabase.com') {
        const projectRef = parsed.searchParams.get('project_ref');
        if (projectRef) {
          return `https://${projectRef}.supabase.co`;
        }
      }
    } catch {
      return inputUrl;
    }

    return inputUrl;
  }
}
