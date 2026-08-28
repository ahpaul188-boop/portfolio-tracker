import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getDictionary, getLocale, localeToHtmlLang } from "@/i18n/server";
import "./globals.css";

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = getDictionary(locale);
  const session = await auth();

  return (
    <html lang={localeToHtmlLang(locale)}>
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <LocaleProvider locale={locale} messages={messages}>
          <AppShell user={session?.user}>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
