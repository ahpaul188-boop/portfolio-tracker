import { IMPORT_HEADERS } from "@/lib/import-csv";

export type BrokerId = "generic" | "ibkr" | "futu";

export const BROKER_OPTIONS: { id: BrokerId; label: string }[] = [
  { id: "generic", label: "Generic template" },
  { id: "ibkr", label: "Interactive Brokers" },
  { id: "futu", label: "Futu / Moomoo" },
];

const REQUIRED = [
  "assettype",
  "market",
  "symbol",
  "name",
  "quantity",
  "costbasis",
  "currency",
] as const;

const BROKER_ALIASES: Record<
  BrokerId,
  Partial<Record<(typeof IMPORT_HEADERS)[number], string[]>>
> = {
  generic: {},
  ibkr: {
    assetType: ["asset class", "assetclass", "type", "sec type"],
    market: ["listing exchange", "exchange", "market"],
    symbol: ["symbol", "ticker"],
    name: ["description", "security name", "name"],
    isin: ["isin"],
    quantity: ["quantity", "qty", "position"],
    costBasis: ["cost basis", "average cost", "avg cost", "costbasis"],
    manualPrice: ["mark price", "price", "market price"],
    currency: ["currency", "cur.", "cur"],
    couponRate: ["coupon", "coupon rate"],
    maturityDate: ["maturity", "maturity date"],
    purchasedAt: ["report date", "date", "purchase date"],
    notes: ["notes", "comment"],
  },
  futu: {
    assetType: ["asset type", "type", "资产类型"],
    market: ["market", "市场", "exchange"],
    symbol: ["code", "symbol", "ticker", "股票代码", "stock code"],
    name: ["name", "stock name", "股票名称", "名称"],
    isin: ["isin"],
    quantity: ["qty", "quantity", "持仓数量", "holding qty", "数量"],
    costBasis: [
      "cost",
      "cost price",
      "average cost",
      "avg cost",
      "成本价",
      "平均成本",
    ],
    manualPrice: ["price", "现价", "market price"],
    currency: ["currency", "ccy", "币种"],
    couponRate: ["coupon", "coupon rate", "票息"],
    maturityDate: ["maturity", "maturity date", "到期日"],
    purchasedAt: ["purchase date", "买入日期"],
    notes: ["notes", "备注"],
  },
};

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

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function headerMatches(header: string, aliases: string[]): boolean {
  const h = header.toLowerCase().trim();
  return aliases.some((a) => h === a || h.includes(a));
}

function resolveColumn(
  lowerHeaders: string[],
  aliases: string[]
): number | undefined {
  for (let i = 0; i < lowerHeaders.length; i++) {
    if (headerMatches(lowerHeaders[i], aliases)) return i;
  }
  return undefined;
}

function inferMarket(symbol: string, currency: string): "HK" | "US" {
  if (/\.HK$/i.test(symbol)) return "HK";
  if (currency === "HKD") return "HK";
  return "US";
}

function normalizeAssetType(raw: string): string {
  const v = raw.toLowerCase();
  if (v.includes("bond") || v.includes("债")) return "Bond";
  return "Stock";
}

export function isBrokerId(value: string | null | undefined): value is BrokerId {
  return value === "generic" || value === "ibkr" || value === "futu";
}

/** Rewrite broker-specific CSV exports into the generic import template format. */
export function normalizeBrokerCsv(text: string, broker: BrokerId): string {
  if (broker === "generic") return text;

  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return text;

  const headerCells = parseCsvLine(lines[0]);
  const lowerHeaders = headerCells.map((h) => h.toLowerCase().trim());

  if (REQUIRED.every((h) => lowerHeaders.includes(h))) {
    return text;
  }

  const aliases = BROKER_ALIASES[broker];
  const fieldToCol = new Map<string, number>();

  for (const field of IMPORT_HEADERS) {
    const list = aliases[field];
    if (!list?.length) continue;
    const idx = resolveColumn(lowerHeaders, list);
    if (idx != null) fieldToCol.set(field, idx);
  }

  const outLines = [IMPORT_HEADERS.join(",")];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const get = (field: string) => {
      const idx = fieldToCol.get(field);
      return idx != null ? cells[idx]?.trim() ?? "" : "";
    };

    let symbol = get("symbol");
    let currency = get("currency").toUpperCase();
    let market = get("market").toUpperCase();

    if (symbol && /\.HK$/i.test(symbol)) {
      symbol = symbol.replace(/\.HK$/i, "");
    }

    if (market !== "HK" && market !== "US") {
      market = inferMarket(symbol, currency);
    }

    if (!currency) {
      currency = market === "HK" ? "HKD" : "USD";
    }

    const assetType = normalizeAssetType(get("assetType") || "Stock");
    const name = get("name") || symbol;

    const row = [
      assetType,
      market,
      symbol,
      name,
      get("isin"),
      get("quantity"),
      get("costBasis"),
      get("manualPrice"),
      currency,
      get("couponRate"),
      get("maturityDate"),
      get("purchasedAt"),
      get("notes"),
    ].map(escapeCsvCell);

    outLines.push(row.join(","));
  }

  return outLines.join("\r\n");
}
