import type { Locale } from "@/i18n/config";

const cache = new Map<string, string>();
const MAX_CACHE = 500;

function cacheKey(text: string, langpair: string): string {
  return `${langpair}:${text}`;
}

function remember(key: string, value: string) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, value);
}

/** True when text is mostly Latin — likely English headlines. */
export function looksLatin(text: string): boolean {
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return latin > cjk;
}

/** True when text is mostly CJK. */
export function looksCjk(text: string): boolean {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return cjk > latin;
}

async function translateOne(
  text: string,
  langpair: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const key = cacheKey(trimmed, langpair);
  const hit = cache.get(key);
  if (hit) return hit;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 480))}&langpair=${langpair}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return text;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText?.trim();
    if (!translated) return text;
    remember(key, translated);
    return translated;
  } catch {
    return text;
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return out;
}

export async function translateTextsForLocale(
  texts: string[],
  locale: Locale
): Promise<string[]> {
  return mapPool(texts, 4, async (text) => {
    if (locale === "en") {
      if (!looksCjk(text)) return text;
      const fromTw = await translateOne(text, "zh-TW|en");
      if (fromTw !== text) return fromTw;
      return translateOne(text, "zh-CN|en");
    }

    if (locale === "zh-Hant") {
      if (!looksLatin(text)) return text;
      return translateOne(text, "en|zh-TW");
    }

    if (locale === "zh-Hans") {
      if (!looksLatin(text)) return text;
      return translateOne(text, "en|zh-CN");
    }

    return text;
  });
}
