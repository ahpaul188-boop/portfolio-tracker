async function main() {
  for (const s of ["0941.HK", "3416.HK"]) {
    const url = `https://finance.yahoo.com/quote/${s}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    console.log(s, "status", res.status);
    const html = await res.text();
    const m4 = html.match(/"dividendYield"\s*:\s*\{[^}]*"raw"\s*:\s*([0-9.]+)/);
    const m5 = html.match(
      /"trailingAnnualDividendYield"\s*:\s*\{[^}]*"raw"\s*:\s*([0-9.]+)/
    );
    const m6 = html.match(/"yield"\s*:\s*\{[^}]*"raw"\s*:\s*([0-9.]+)/);
    const idx = html.indexOf("Forward Dividend");
    console.log({
      dividendYieldRaw: m4?.[1],
      trailingYieldRaw: m5?.[1],
      yieldRaw: m6?.[1],
      len: html.length,
      forwardSnippet:
        idx >= 0 ? html.slice(idx, idx + 250).replace(/\s+/g, " ") : null,
    });
  }
}

main().catch(console.error);
