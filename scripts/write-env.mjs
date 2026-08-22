import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadLocalEnv(resolve(rootDir, '.env.local'));

const supabaseUrl = readRequiredEnv('SUPABASE_URL', [
  'PUBLIC_SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'NG_APP_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL'
]);
const supabaseAnonKey = readRequiredEnv('SUPABASE_ANON_KEY', [
  'SUPABASE_PUBLISHABLE_KEY',
  'PUBLIC_SUPABASE_ANON_KEY',
  'PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'NG_APP_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]);
const appUrl = readOptionalEnv('APP_URL', [
  'PUBLIC_APP_URL',
  'VITE_APP_URL',
  'NG_APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'VERCEL_PROJECT_PRODUCTION_URL'
]);

writeEnvironmentFile('src/environments/environment.generated.ts', false, {
  supabaseUrl,
  supabaseAnonKey,
  appUrl: readOptionalEnv('LOCAL_APP_URL')
});

writeEnvironmentFile('src/environments/environment.generated.prod.ts', true, {
  supabaseUrl,
  supabaseAnonKey,
  appUrl
});

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const entries = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] ??= value;
  }
}

function readRequiredEnv(name, aliases = []) {
  const value = readOptionalEnv(name, aliases);
  if (!value) {
    const supportedNames = [name, ...aliases].join(', ');
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Create .env.local from .env.example for local development, or set one of these in Vercel project environment variables: ${supportedNames}.`
    );
  }
  return value;
}

function readOptionalEnv(name, aliases = []) {
  for (const candidate of [name, ...aliases]) {
    const value = process.env[candidate]?.trim();
    if (value) {
      return candidate === 'VERCEL_PROJECT_PRODUCTION_URL' ? normalizeVercelUrl(value) : value;
    }
  }

  return '';
}

function normalizeVercelUrl(value) {
  return value.startsWith('http') ? value : `https://${value}`;
}

function writeEnvironmentFile(relativePath, production, values) {
  const content = `export const environment = {\n` +
    `  production: ${production},\n` +
    `  supabaseUrl: ${JSON.stringify(values.supabaseUrl)},\n` +
    `  supabaseAnonKey: ${JSON.stringify(values.supabaseAnonKey)},\n` +
    `  appUrl: ${JSON.stringify(values.appUrl)}\n` +
    `};\n`;

  writeFileSync(resolve(rootDir, relativePath), content);
}