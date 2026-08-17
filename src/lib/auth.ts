import NextAuth, { type NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const providers: NextAuthConfig["providers"] = [
  Resend({
    apiKey: process.env.RESEND_API_KEY,
    from: "Wedding App <onboarding@resend.dev>",
  }),
];

// Dev-only passwordless sign-in so the app can be exercised end-to-end
// without a configured email provider. Never enabled in production.
if (process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login (no email required)",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        if (!email) return null;
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
