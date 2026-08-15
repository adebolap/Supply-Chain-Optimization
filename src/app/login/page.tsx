import Link from "next/link";
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
    <div className="flex flex-1 items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <Link
          href="/"
          className="font-display mb-4 block text-center text-2xl font-semibold tracking-tight"
        >
          Aisle
        </Link>
        <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          We&apos;ll email you a magic sign-in link. No password needed.
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
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Send magic link
          </button>
        </form>

        {isDev && (
          <>
            <div className="my-6 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              dev shortcut
              <div className="h-px flex-1 bg-border" />
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
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium "
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
