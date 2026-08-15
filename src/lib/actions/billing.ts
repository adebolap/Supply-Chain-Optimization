"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { stripe, PREMIUM_PRICE_USD } from "@/lib/stripe";

export async function startPremiumCheckout(weddingId: string) {
  const { wedding } = await requireWeddingOwner(weddingId);

  if (!stripe) {
    throw new Error(
      "Stripe isn't configured yet. Set STRIPE_SECRET_KEY to enable real checkout."
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: PREMIUM_PRICE_USD * 100,
          product_data: {
            name: `Premium unlock: ${wedding.title}`,
            description:
              "Unlimited guests, multi-event support, custom branding, SMS reminders, coordinator mode.",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { weddingId },
    success_url: `${baseUrl}/dashboard/w/${weddingId}/settings?upgraded=1`,
    cancel_url: `${baseUrl}/dashboard/w/${weddingId}/settings`,
  });

  redirect(checkoutSession.url!);
}

// Dev-only shortcut so the premium flow can be exercised without live Stripe
// keys. Never enabled in production.
export async function simulatePremiumUpgrade(weddingId: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Not available in production.");
  }
  await requireWeddingOwner(weddingId);
  await prisma.wedding.update({ where: { id: weddingId }, data: { tier: "PREMIUM" } });
  revalidatePath(`/dashboard/w/${weddingId}/settings`);
}
