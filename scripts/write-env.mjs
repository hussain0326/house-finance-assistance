import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadLocalEnv(resolve(rootDir, '.env.local'));

const supabaseUrl = readRequiredEnv('SUPABASE_URL');
const supabaseAnonKey = readRequiredEnv('SUPABASE_ANON_KEY');
const appUrl = readOptionalEnv('APP_URL');

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

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Create .env.local from .env.example for local development, or set ${name} in Vercel project environment variables.`
    );
  }
  return value;
}

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? '';
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