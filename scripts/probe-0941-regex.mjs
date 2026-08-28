const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const html = await (
  await fetch("https://finance.yahoo.com/quote/0941.HK", {
    headers: YAHOO_HEADERS,
  })
).text();

const titled = html.match(
  /Forward Dividend[\s\S]{0,500}?title="([0-9.]+) \(([0-9.]+)%\)"/i
);
console.log("titled", titled?.slice(1));

const loose = html.match(
  /Forward Dividend &amp; Yield[\s\S]{0,200}?([0-9.]+)\s*\(([0-9.]+)%\)/i
);
console.log("loose", loose?.slice(1));
