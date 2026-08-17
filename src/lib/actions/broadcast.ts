"use server";

import { revalidatePath } from "next/cache";
import { requireWeddingOwner } from "@/lib/actions/weddings";
import { prisma } from "@/lib/prisma";
import { twilioClient, TWILIO_FROM_NUMBER } from "@/lib/twilio";

export interface BroadcastState {
  error: string | null;
  sent?: number;
}

export type BroadcastAudience = "ALL" | "ATTENDING" | "NOT_RESPONDED" | "DECLINED";

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  ALL: "All guests",
  ATTENDING: "Attending",
  NOT_RESPONDED: "Haven't responded yet",
  DECLINED: "Declined",
};

function classifyGuest(rsvpStatuses: string[]): BroadcastAudience {
  if (rsvpStatuses.length === 0 || rsvpStatuses.every((s) => s === "PENDING")) {
    return "NOT_RESPONDED";
  }
  if (rsvpStatuses.includes("ATTENDING")) return "ATTENDING";
  return "DECLINED";
}

async function getAudienceGuests(weddingId: string, audience: BroadcastAudience) {
  const guests = await prisma.guest.findMany({
    where: { weddingId },
    include: { rsvps: true },
  });

  if (audience === "ALL") return guests;
  return guests.filter((g) => classifyGuest(g.rsvps.map((r) => r.status)) === audience);
}

async function sendEmail(to: string, subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) throw new Error("Resend isn't configured.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Aisle <hello@theweddingguest.space>",
      to,
      subject,
      text: body,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function sendSms(to: string, body: string) {
  if (!twilioClient || !TWILIO_FROM_NUMBER) throw new Error("Twilio isn't configured.");
  await twilioClient.messages.create({ to, from: TWILIO_FROM_NUMBER, body });
}

export async function sendBroadcast(
  weddingId: string,
  _prevState: BroadcastState,
  formData: FormData
): Promise<BroadcastState> {
  await requireWeddingOwner(weddingId);

  const channel = String(formData.get("channel") || "EMAIL") as "EMAIL" | "SMS";
  const audience = String(formData.get("audience") || "ALL") as BroadcastAudience;
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!body) return { error: "Message body is required." };
  if (channel === "EMAIL" && !subject) {
    return { error: "Subject is required for email." };
  }

  const guests = await getAudienceGuests(weddingId, audience);
  const recipients = guests.filter((g) => (channel === "EMAIL" ? g.email : g.phone));

  const results = await Promise.allSettled(
    recipients.map((guest) =>
      channel === "EMAIL"
        ? sendEmail(guest.email!, subject, body)
        : sendSms(guest.phone!, body)
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  await prisma.broadcastMessage.create({
    data: {
      weddingId,
      channel,
      subject: channel === "EMAIL" ? subject : null,
      body,
      audience: AUDIENCE_LABELS[audience],
      recipientCount: sent,
      failureCount: failed,
    },
  });

  revalidatePath(`/dashboard/w/${weddingId}/broadcast`);
  return { error: null, sent };
}

export async function getBroadcastHistory(weddingId: string) {
  return prisma.broadcastMessage.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getAudienceCounts(weddingId: string) {
  const guests = await prisma.guest.findMany({
    where: { weddingId },
    include: { rsvps: true },
  });

  const counts: Record<BroadcastAudience, number> = {
    ALL: guests.length,
    ATTENDING: 0,
    NOT_RESPONDED: 0,
    DECLINED: 0,
  };
  for (const g of guests) {
    counts[classifyGuest(g.rsvps.map((r) => r.status))]++;
  }
  return counts;
}
