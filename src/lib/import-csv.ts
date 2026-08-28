import { normalizeSymbol, validateHolding, type HoldingInput } from "@/lib/types";
import type { Market } from "@/lib/types";
import {
  normalizeBrokerCsv,
  type BrokerId,
} from "@/lib/import-brokers";

export const IMPORT_HEADERS = [
  "assetType",
  "market",
  "symbol",
  "name",
  "isin",
  "quantity",
  "costBasis",
  "manualPrice",
  "currency",
  "couponRate",
  "maturityDate",
  "purchasedAt",
  "notes",
] as const;

export function holdingsImportTemplate(): string {
  const header = IMPORT_HEADERS.join(",");
  const example =
    'Stock,US,AAPL,Apple Inc,,10,150,,USD,,,2024-01-15,';
  return `${header}\r\n${example}\r\n`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export type ParsedImportRow = HoldingInput & { row: number };

export type ImportParseResult =
  | { ok: true; rows: ParsedImportRow[] }
  | { ok: false; errors: string[] };

export function parseHoldingsCsv(
  text: string,
  broker: BrokerId = "generic"
): ImportParseResult {
  const normalized = normalizeBrokerCsv(text, broker);
  const lines = normalized
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { ok: false, errors: ["CSV file is empty"] };
  }

  const headerCells = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const headerMap: Record<string, number> = {};
  for (let i = 0; i < headerCells.length; i++) {
    headerMap[headerCells[i]] = i;
  }

  const required = ["assettype", "market", "symbol", "name", "quantity", "costbasis", "currency"];
  const missing = required.filter((h) => headerMap[h] === undefined);
  if (missing.length) {
    return {
      ok: false,
      errors: [`Missing columns: ${missing.join(", ")}`],
    };
  }

  const rows: ParsedImportRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const get = (key: string) => cells[headerMap[key]]?.trim() ?? "";

    const market = get("market").toUpperCase() as Market;
    const input: Partial<HoldingInput> = {
      assetType: get("assettype") as HoldingInput["assetType"],
      market: market === "HK" ? "HK" : "US",
      symbol: normalizeSymbol(get("symbol"), market === "HK" ? "HK" : "US"),
      name: get("name"),
      isin: get("isin") || undefined,
      quantity: Number(get("quantity")),
      costBasis: Number(get("costbasis")),
      manualPrice: get("manualprice") ? Number(get("manualprice")) : undefined,
      currency: get("currency").toUpperCase(),
      couponRate: get("couponrate") ? Number(get("couponrate")) : undefined,
      maturityDate: get("maturitydate") || undefined,
      purchasedAt: get("purchasedat") || undefined,
      notes: get("notes") || undefined,
    };

    const err = validateHolding(input);
    if (err) {
      errors.push(`Row ${i + 1}: ${err}`);
      continue;
    }
    rows.push({ ...(input as HoldingInput), row: i + 1 });
  }

  if (errors.length && !rows.length) {
    return { ok: false, errors };
  }

  return { ok: true, rows };
}

export function exportRowPreview(row: ParsedImportRow): string {
  return `${row.assetType} ${row.symbol} x${row.quantity}`;
}
