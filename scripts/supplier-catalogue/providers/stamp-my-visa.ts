import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { SupplierImportSource, SupplierProductInput } from "../types.ts";
import {
  type LoadSupplierCatalogueInput,
  type LoadSupplierCatalogueResult,
  type SupplierCatalogueProvider,
} from "./provider.ts";

const DEFAULT_FIXTURE = "scripts/supplier-catalogue/providers/fixtures/stamp-my-visa.saved.html";
const LIVE_CAPTURE_URL = "https://stampmyvisa.com/home/create-visa";

export const stampMyVisaProvider: SupplierCatalogueProvider = {
  id: "stamp-my-visa",
  name: "StampMyVisa",
  supportsLiveLogin: true,
  async loadCatalogue(input: LoadSupplierCatalogueInput): Promise<LoadSupplierCatalogueResult> {
    if (input.mode === "saved-html") {
      return loadSavedHtmlSupplierSource(input.sourceFile ?? input.fixture ?? DEFAULT_FIXTURE, input.supplierId);
    }

    if (input.mode === "live") {
      return loadLiveSupplierSource(input);
    }
    throw new Error("--mode must be saved-html or live for StampMyVisa imports");
  },
};

export const stampmyvisaProvider: SupplierCatalogueProvider = {
  ...stampMyVisaProvider,
  id: "stampmyvisa",
};

async function loadSavedHtmlSupplierSource(
  sourcePath: string,
  requestedSupplierId: string,
): Promise<LoadSupplierCatalogueResult> {
  const sourceFile = resolve(sourcePath);
  const source = await loadSavedHtmlPath(sourceFile);
  assertSupplierSource(source, sourceFile, requestedSupplierId);
  return { source, sourceFile };
}

async function loadSavedHtmlPath(sourceFile: string): Promise<SupplierImportSource> {
  const metadata = await stat(sourceFile);
  if (!metadata.isDirectory()) {
    return parseSavedHtml(await readFile(sourceFile, "utf8"), sourceFile);
  }

  const entries = (await readdir(sourceFile))
    .filter((entry) => /\.(html?|json)$/i.test(entry))
    .sort();
  const products: SupplierProductInput[] = [];
  let supplierSource: SupplierImportSource | null = null;

  for (const entry of entries) {
    const parsed = parseSavedHtml(await readFile(join(sourceFile, entry), "utf8"), join(sourceFile, entry));
    supplierSource ??= parsed;
    products.push(...parsed.products);
  }

  if (!supplierSource) {
    throw new Error(`StampMyVisa saved-html fixture directory has no .html or .json files: ${sourceFile}`);
  }

  return {
    ...supplierSource,
    supplier: {
      ...supplierSource.supplier,
      source: `saved-html:${sourceFile}`,
    },
    products,
  };
}

async function loadLiveSupplierSource(
  input: LoadSupplierCatalogueInput,
): Promise<LoadSupplierCatalogueResult> {
  const credentials = await loadStampMyVisaCredentials();
  const playwright = await importOptionalPlaywright();
  if (!playwright) {
    throw new Error("StampMyVisa live mode requires Playwright. Install it before running --mode live.");
  }

  const browser = await playwright.chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(LIVE_CAPTURE_URL, { waitUntil: "domcontentloaded" });
  await attemptCredentialFill(page, credentials);

  console.log([
    "stampmyvisa_live_login_ready=true",
    "browser=visible",
    `credentials_loaded=${Boolean(credentials.username)}`,
    "otp_pause=manual",
    "secrets_printed=false",
    "next_step=complete_login_or_security_challenge_in_browser",
  ].join(" "));

  await page.pause();
  const html = await page.content();
  await browser.close();

  const source = parseSavedHtml(html, LIVE_CAPTURE_URL);
  assertSupplierSource(source, LIVE_CAPTURE_URL, input.supplierId);
  return { source, sourceFile: LIVE_CAPTURE_URL };
}

async function attemptCredentialFill(
  page: LivePage,
  credentials: { username: string; password: string },
): Promise<void> {
  const usernameSelectors = [
    "input[name='username']",
    "input[name='mobile']",
    "input[name='phone']",
    "input[type='tel']",
    "input[type='text']",
  ];
  const passwordSelectors = [
    "input[name='password']",
    "input[type='password']",
  ];

  const usernameFilled = await fillFirstAvailable(page, usernameSelectors, credentials.username);
  const passwordFilled = credentials.password
    ? await fillFirstAvailable(page, passwordSelectors, credentials.password)
    : true;

  if (usernameFilled && passwordFilled) {
    await clickFirstAvailable(page, [
      "button[type='submit']",
      "button:has-text('Login')",
      "button:has-text('Sign in')",
      "button:has-text('Continue')",
    ]);
  }
}

async function fillFirstAvailable(page: LivePage, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.count()) {
        await locator.fill(value);
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

async function clickFirstAvailable(page: LivePage, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.count()) {
        await locator.click();
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

async function loadStampMyVisaCredentials(): Promise<{ username: string; password: string }> {
  const envLocal = await readEnvLocal();
  const username = envLocal.STAMP_MY_VISA_USERNAME ?? process.env.STAMP_MY_VISA_USERNAME ?? "";
  const password = envLocal.STAMP_MY_VISA_PASSWORD ?? process.env.STAMP_MY_VISA_PASSWORD ?? "";

  if (!username) {
    throw new Error("StampMyVisa live mode requires STAMP_MY_VISA_USERNAME in .env.local");
  }

  return { username, password };
}

async function readEnvLocal(): Promise<Record<string, string>> {
  const envPath = resolve(".env.local");
  let contents = "";
  try {
    contents = await readFile(envPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }

  const parsed: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    parsed[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return parsed;
}

function parseSavedHtml(raw: string, sourceFile: string): SupplierImportSource {
  const asJson = tryParseJson(raw);
  if (asJson && isSupplierImportSource(asJson)) return asJson;
  if (asJson && typeof asJson === "object" && "data" in asJson) {
    const data = (asJson as { data?: { html?: unknown } }).data;
    if (typeof data?.html === "string") return parseSavedHtml(data.html, sourceFile);
  }

  const embedded = extractEmbeddedCatalogueJson(raw);
  if (embedded) return embedded;

  const products = extractProductDataAttributes(raw);
  if (products.length > 0) {
    return buildSource(products, "saved-html:data-attributes");
  }

  throw new Error(
    `StampMyVisa saved HTML fixture did not contain catalogue JSON or data-supplier-product entries: ${sourceFile}`,
  );
}

function extractEmbeddedCatalogueJson(html: string): SupplierImportSource | null {
  const scriptPattern =
    /<script\b[^>]*(?:id=["']supplier-catalogue-data["']|type=["']application\/vnd\.vvisa\.supplier-catalogue\+json["'])[^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(scriptPattern);
  if (!match) return null;

  const parsed = tryParseJson(decodeHtmlEntities(match[1].trim()));
  if (parsed && isSupplierImportSource(parsed)) return parsed;
  if (Array.isArray(parsed)) return buildSource(parsed as SupplierProductInput[], "saved-html:embedded-products");
  return null;
}

function extractProductDataAttributes(html: string): SupplierProductInput[] {
  const products: SupplierProductInput[] = [];
  const attributePattern = /data-supplier-product=(["'])([\s\S]*?)\1/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(html)) !== null) {
    const parsed = tryParseJson(decodeHtmlEntities(match[2]));
    if (parsed && typeof parsed === "object") products.push(parsed as SupplierProductInput);
  }

  return products;
}

function buildSource(products: SupplierProductInput[], source: string): SupplierImportSource {
  return {
    supplier: {
      id: "stampmyvisa",
      name: "StampMyVisa",
      source,
    },
    capturedAt: new Date().toISOString(),
    products,
  };
}

function assertSupplierSource(
  parsed: SupplierImportSource,
  sourceFile: string,
  requestedSupplierId: string,
): void {
  if (!parsed?.supplier?.id || !Array.isArray(parsed.products)) {
    throw new Error(`Invalid supplier import source: ${sourceFile}`);
  }

  if (parsed.supplier.id !== requestedSupplierId && requestedSupplierId !== "stamp-my-visa") {
    throw new Error(`Supplier mismatch: expected ${requestedSupplierId}, found ${parsed.supplier.id}`);
  }
}

function isSupplierImportSource(value: unknown): value is SupplierImportSource {
  return Boolean(
    value &&
      typeof value === "object" &&
      "supplier" in value &&
      "products" in value &&
      Array.isArray((value as SupplierImportSource).products),
  );
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function importOptionalPlaywright(): Promise<
  | {
      chromium: {
        launch(options: { headless: boolean }): Promise<{
          newPage(): Promise<LivePage>;
          close(): Promise<void>;
        }>;
      };
    }
  | null
> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<unknown>;
    return (await dynamicImport("playwright")) as Awaited<ReturnType<typeof importOptionalPlaywright>>;
  } catch {
    return null;
  }
}

interface LivePage {
  goto(url: string, options: { waitUntil: "domcontentloaded" }): Promise<unknown>;
  pause(): Promise<void>;
  content(): Promise<string>;
  locator(selector: string): {
    first(): {
      count(): Promise<number>;
      fill(value: string): Promise<void>;
      click(): Promise<void>;
    };
  };
}
