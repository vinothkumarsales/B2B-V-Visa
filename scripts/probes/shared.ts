import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type ProbeResult = Record<string, string | number | boolean | null | string[]>;

export function loadLocalEnv() {
  for (const file of ['.env', '.env.local']) {
    const path = resolve(file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] ??= value;
    }
  }
}

export function boolEnv(name: string, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function requiredEnvPresent(keys: string[]) {
  return keys.map((key) => `${key}:${process.env[key] ? 'configured' : 'missing'}`);
}

export function printProbe(name: string, result: ProbeResult) {
  console.log(JSON.stringify({ probe: name, ...result }, null, 2));
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getZohoCrmAccessTokenForProbe() {
  const missing = ['ZOHO_CRM_CLIENT_ID', 'ZOHO_CRM_CLIENT_SECRET', 'ZOHO_CRM_REFRESH_TOKEN']
    .filter((key) => !process.env[key]);
  if (missing.length) {
    return { ok: false as const, missing };
  }

  const accountsUrl = process.env.ZOHO_CRM_ACCOUNTS_URL || 'https://accounts.zoho.in';
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_CRM_REFRESH_TOKEN || '',
    client_id: process.env.ZOHO_CRM_CLIENT_ID || '',
    client_secret: process.env.ZOHO_CRM_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
  });

  const response = await fetchWithTimeout(`${accountsUrl}/oauth/v2/token`, {
    method: 'POST',
    body: params,
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
  return {
    ok: response.ok && Boolean(data.access_token),
    status: response.status,
    token: data.access_token,
    errorCode: response.ok ? null : data.error || 'token_refresh_failed',
  };
}

export function probeStorageRoot(root = process.env.STORAGE_PRIVATE_ROOT || 'upload/private') {
  const absoluteRoot = resolve(root);
  const probeDir = join(absoluteRoot, '.probe');
  const probeFile = join(probeDir, `storage-probe-${Date.now()}.txt`);
  try {
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(probeFile, 'vvisa-storage-probe\n', 'utf8');
    const exists = existsSync(probeFile);
    rmSync(probeFile, { force: true });
    return {
      storage_root: absoluteRoot,
      write_probe_passed: exists,
      cleanup_verified: !existsSync(probeFile),
      error_code: null,
    };
  } catch (error) {
    return {
      storage_root: absoluteRoot,
      write_probe_passed: false,
      cleanup_verified: false,
      error_code: error instanceof Error ? error.message.split(':')[0] : 'storage_probe_failed',
    };
  }
}
