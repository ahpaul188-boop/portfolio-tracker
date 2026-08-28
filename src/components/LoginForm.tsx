"use client";

import { useI18n } from "@/components/LocaleProvider";

type Props = {
  callbackUrl: string;
  error?: string | null;
  showEmailLogin: boolean;
  googleConfigured: boolean;
  googleRedirectUri: string;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
};

export function LoginForm({
  error,
  showEmailLogin,
  googleConfigured,
  googleRedirectUri,
  signInWithEmail,
  signInWithGoogle,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center">
      <div className="ui-card w-full p-8">
        <h1
          className="text-center text-3xl font-semibold text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {t("login.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          {t("login.subtitle")}
        </p>

        {!googleConfigured && (
          <p className="mt-4 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-deep)]">
            {t("login.emailNotSetup")}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {showEmailLogin && (
          <div className="mt-6">
            <form
              className="space-y-3"
              action={async (formData) => {
                const email = String(formData.get("email") ?? "").trim();
                await signInWithEmail(email);
              }}
            >
              <label className="block text-sm font-medium text-[var(--ink)]">
                {t("login.email")}
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t("login.emailPlaceholder")}
                  className="ui-input mt-1.5"
                />
              </label>
              <button type="submit" className="ui-btn-primary w-full py-3">
                {t("login.continueEmail")}
              </button>
            </form>
          </div>
        )}

        {googleConfigured && (
          <>
            <form
              className={showEmailLogin ? "mt-5" : "mt-6"}
              action={signInWithGoogle}
            >
              <button type="submit" className="ui-btn-ghost w-full py-3">
                {t("login.continueGoogle")}
              </button>
            </form>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {t("login.googleBlockedHint")}
            </p>
          </>
        )}

        <details className="mt-6 text-sm text-[var(--muted)]">
          <summary className="cursor-pointer font-medium text-[var(--ink)]">
            {t("login.googleSetup")}
          </summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs">
            <li>
              <a
                className="text-[var(--accent-deep)] underline"
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Cloud → Credentials
              </a>{" "}
              {t("login.googleStep1")}
            </li>
            <li>
              {t("login.googleStep2")}{" "}
              <code className="rounded bg-[var(--bg-soft)] px-1">
                {googleRedirectUri}
              </code>
            </li>
            <li>{t("login.googleStep3")}</li>
            <li>{t("login.googleStep4")}</li>
            <li>{t("login.googleProdHint")}</li>
          </ol>
        </details>
      </div>
    </div>
  );
}
