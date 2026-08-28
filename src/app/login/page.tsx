import { signIn } from "@/auth";
import { googleConfigured } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { getGoogleRedirectUri } from "@/lib/env";
import {
  createTranslator,
  getDictionary,
  getLocale,
} from "@/i18n/server";

type Props = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    reason?: string;
  }>;
};

function errorMessage(
  code: string | undefined,
  t: ReturnType<typeof createTranslator>
): string | null {
  if (!code) return null;
  switch (code) {
    case "Configuration":
      return t("login.errorConfiguration");
    case "AccessDenied":
      return t("login.errorAccessDenied");
    case "CredentialsSignin":
      return t("login.errorCredentials");
    default:
      return t("login.errorDefault", { code });
  }
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl ?? "/";
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(dict);
  const error =
    errorMessage(sp.error, t) ??
    (sp.reason === "stale-session" ? t("login.errorStaleSession") : null);
  const showEmailLogin = !googleConfigured;

  return (
    <LoginForm
      callbackUrl={callbackUrl}
      error={error}
      showEmailLogin={showEmailLogin}
      googleConfigured={googleConfigured}
      googleRedirectUri={getGoogleRedirectUri()}
      signInWithEmail={async (email: string) => {
        "use server";
        await signIn("dev-email", { email, redirectTo: callbackUrl });
      }}
      signInWithGoogle={async () => {
        "use server";
        await signIn("google", { redirectTo: callbackUrl });
      }}
    />
  );
}
