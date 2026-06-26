import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { productionApprovedProducts } from "../../src/lib/production-approved-products.ts";
import { stampMyVisaApprovedProducts } from "../../src/lib/stampmyvisa-approved-products.ts";

const products = [...stampMyVisaApprovedProducts, ...productionApprovedProducts]
  .filter((product) => product.status === "APPROVED");
const version = readVersion(process.argv.slice(2)) ?? "catalogue-v1-proof";
const output = resolve("data", "supplier-imports", "approved", `${version}.published.json`);

const published = {
  metadata: {
    generatedAt: new Date().toISOString(),
    version,
    status: "PUBLISHED",
    approvedOnly: true,
    productionReadyGate: "jurisdiction-and-official-source-review-still-required-before-live-filing",
  },
  products,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(published, null, 2)}\n`, "utf8");
console.log(`catalogue_publish_created=true output=${output} products=${products.length}`);

function readVersion(args: string[]): string | null {
  const index = args.indexOf("--version");
  if (index < 0) return null;
  return args[index + 1] ?? null;
}
