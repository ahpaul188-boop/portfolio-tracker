async function main() {
  const urls = [
    "https://finance.yahoo.com/quote/3416.HK/",
    "https://finance.yahoo.com/quote/3416.HK/history/",
    "https://query1.finance.yahoo.com/v8/finance/chart/3416.HK?interval=1d&range=5d",
    "https://www.globalxetfs.com.hk/funds/hscei-covered-call-etf/",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await res.text();
      console.log("\nURL", url, "status", res.status, "len", html.length);
      const y = html.match(/Annualized Yield[^0-9]*([0-9.]+)\s*%/i);
      const f = html.match(/([0-9.]+)\s*\(([0-9.]+)%\)/);
      const title = html.match(/title="([0-9.]+)\s*\(([0-9.]+)%\)"/);
      console.log({ annualized: y?.[1], paren: f?.slice(1), title: title?.slice(1) });
    } catch (e) {
      console.log(url, e.message);
    }
  }
}

main().catch(console.error);
