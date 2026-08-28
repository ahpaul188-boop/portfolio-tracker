"use client";

import { useI18n } from "@/components/LocaleProvider";
import { signOutAction } from "@/lib/auth-actions";

type Props = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
};

export function AuthButtonClient({ user }: Props) {
  const { t } = useI18n();

  if (!user) {
    return (
      <a
        href="/login"
        className="rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900"
      >
        {t("nav.signIn")}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          className="h-8 w-8 rounded-full border border-stone-200"
        />
      )}
      <div className="hidden text-right sm:block">
        <p className="max-w-[10rem] truncate text-sm font-medium text-stone-900">
          {user.name ?? t("nav.user")}
        </p>
        <p className="max-w-[10rem] truncate text-xs text-stone-500">
          {user.email}
        </p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-md border border-stone-400 bg-[var(--panel)] px-3 py-2 text-sm font-medium hover:bg-white"
        >
          {t("nav.signOut")}
        </button>
      </form>
    </div>
  );
}
