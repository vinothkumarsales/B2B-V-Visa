import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SupplierImportSource, SupplierProductInput } from "../types.ts";
import {
  type LoadSupplierCatalogueInput,
  type LoadSupplierCatalogueResult,
  type SupplierCatalogueProvider,
} from "./provider.ts";

const SAMPLE_SOURCE = "data/supplier-imports/samples/stampmyvisa.sample.json";
const LIVE_CAPTURE_URL = "https://stampmyvisa.com/home/create-visa";

export const stampMyVisaProvider: SupplierCatalogueProvider = {
  id: "stamp-my-visa",
  name: "StampMyVisa",
  supportsLiveLogin: true,
  async loadCatalogue(input: LoadSupplierCatalogueInput): Promise<LoadSupplierCatalogueResult> {
    if (input.mode === "saved-html") {
      if (!input.sourceFile) {
        throw new Error("StampMyVisa saved-html mode requires --source-file with a saved HTML fixture");
      }
      return loadSavedHtmlSupplierSource(input.sourceFile, input.supplierId);
    }

    if (input.mode === "live") {
      return loadLiveSupplierSource(input);
    }

    return loadLocalSupplierSource(input.sourceFile ?? SAMPLE_SOURCE, input.supplierId);
  },
};

export const stampmyvisaProvider: SupplierCatalogueProvider = {
  ...stampMyVisaProvider,
  id: "stampmyvisa",
};

async function loadLocalSupplierSource(
  sourcePath: string,
  requestedSupplierId: string,
): Promise<LoadSupplierCatalogueResult> {
  const sourceFile = resolve(sourcePath);
  const parsed = JSON.parse(await readFile(sourceFile, "utf8")) as SupplierImportSource;
  assertSupplierSource(parsed, sourceFile, requestedSupplierId);
  return { source: parsed, sourceFile };
}

async function loadSavedHtmlSupplierSource(
  sourcePath: string,
  requestedSupplierId: string,
): Promise<LoadSupplierCatalogueResult> {
  const sourceFile = resolve(sourcePath);
  const source = parseSavedHtml(await readFile(sourceFile, "utf8"), sourceFile);
  assertSupplierSource(source, sourceFile, requestedSupplierId);
  return { source, sourceFile };
}

async function loadLiveSupplierSource(
  input: LoadSupplierCatalogueInput,
): Promise<LoadSupplierCatalogueResult> {
  const playwright = await importOptionalPlaywright();
  if (!playwright) {
    throw new Error("StampMyVisa live mode requires Playwright. Install it before running --mode live.");
  }

  const browser = await playwright.chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(LIVE_CAPTURE_URL, { waitUntil: "domcontentloaded" });

  console.log([
    "stampmyvisa_live_login_ready=true",
    "browser=visible",
    "otp_pause=manual",
    "secrets_printed=false",
    "next_step=complete_login_then_save_html_and_rerun_saved_html",
  ].join(" "));

  await page.pause();
  const html = await page.content();
  await browser.close();

  const source = parseSavedHtml(html, LIVE_CAPTURE_URL);
  assertSupplierSource(source, LIVE_CAPTURE_URL, input.supplierId);
  return { source, sourceFile: LIVE_CAPTURE_URL };
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
          newPage(): Promise<{
            goto(url: string, options: { waitUntil: "domcontentloaded" }): Promise<unknown>;
            pause(): Promise<void>;
            content(): Promise<string>;
          }>;
          close(): Promise<void>;
        }>;
      };
    }
  | null
> {
  try {
    return await import("playwright");
  } catch {
    return null;
  }
}
