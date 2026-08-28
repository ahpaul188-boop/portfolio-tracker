"use client";

import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/LocaleProvider";
import { signOutAction } from "@/lib/auth-actions";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Props = {
  user?: User | null;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();

  const links = [
    { href: "/", label: t("nav.portfolio"), match: (p: string) => p === "/" },
    {
      href: "/holdings/new",
      label: t("nav.addHolding"),
      match: (p: string) => p.startsWith("/holdings"),
    },
    {
      href: "/import",
      label: t("nav.import"),
      match: (p: string) => p.startsWith("/import"),
    },
    {
      href: "/settings",
      label: t("nav.settings"),
      match: (p: string) => p.startsWith("/settings"),
    },
  ];

  const showMobileNav = pathname !== "/login";

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-2 p-2 sm:p-2.5 lg:gap-3">
      <aside className="ui-card sticky top-2 hidden h-[calc(100vh-1.25rem)] w-44 shrink-0 flex-col p-2 lg:flex">
        <div className="mb-4 px-1">
          <p
            className="text-lg font-semibold tracking-tight text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {t("nav.brand")}
            <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--danger)] align-middle" />
          </p>
          <p className="text-[10px] text-[var(--muted)]">{t("nav.markets")}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "ui-nav-active"
                    : "text-[var(--muted)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-[var(--line)] pt-2">
          <LanguageSwitcher />
          {user ? (
            <div className="rounded-lg bg-[var(--accent-soft)] p-2">
              <div className="flex items-center gap-1.5">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="h-7 w-7 rounded-full border border-white"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white">
                    {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[var(--ink)]">
                    {user.name ?? t("nav.user")}
                  </p>
                  <p className="truncate text-[9px] text-[var(--muted)]">
                    {user.email}
                  </p>
                </div>
              </div>
              <form action={signOutAction} className="mt-1.5">
                <button type="submit" className="ui-btn-ghost w-full text-[10px]">
                  {t("nav.signOut")}
                </button>
              </form>
            </div>
          ) : (
            <a href="/login" className="ui-btn-primary w-full">
              {t("nav.signIn")}
            </a>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="ui-card mb-2 flex items-center justify-between gap-2 px-2.5 py-1.5 lg:hidden">
          <p
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {t("nav.brand")}
          </p>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            {user ? (
              <form action={signOutAction}>
                <button type="submit" className="ui-btn-ghost px-2 py-1 text-[10px]">
                  {t("nav.signOut")}
                </button>
              </form>
            ) : (
              <a href="/login" className="ui-btn-primary px-2 py-1 text-[10px]">
                {t("nav.signIn")}
              </a>
            )}
          </div>
        </header>

        <nav className="mb-2 flex gap-1 overflow-x-auto lg:hidden">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                  active
                    ? "ui-nav-active"
                    : "border border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <main className="animate-shell-in min-w-0 flex-1 pb-16 lg:pb-0">{children}</main>
      </div>

      {showMobileNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--line)] bg-white/95 px-1 py-1 backdrop-blur lg:hidden">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`ui-touch-target flex flex-1 flex-col items-center justify-center rounded-md px-1 text-[10px] font-medium ${
                  active
                    ? "text-[var(--accent-deep)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
