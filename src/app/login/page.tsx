import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) redirect(callbackUrl || "/dashboard");

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-950">
        <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ll email you a magic sign-in link — no password needed.
        </p>

        <form
          action={async (formData) => {
            "use server";
            const email = formData.get("email") as string;
            await signIn("resend", { email, redirectTo: callbackUrl || "/dashboard" });
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
          />
          <button
            type="submit"
            className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
          >
            Send magic link
          </button>
        </form>

        {isDev && (
          <>
            <div className="my-6 flex items-center gap-2 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              dev shortcut
              <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            </div>
            <form
              action={async (formData) => {
                "use server";
                const email = formData.get("email") as string;
                await signIn("dev-login", {
                  email,
                  redirectTo: callbackUrl || "/dashboard",
                });
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-black"
              />
              <button
                type="submit"
                className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium dark:border-white/10"
              >
                Continue without email (dev only)
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
