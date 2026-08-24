// Approximate Twilio outbound SMS pricing per country (USD/message), for a
// rough cost estimate before sending a broadcast. Not exact carrier-level
// pricing, close enough to flag when a send skews expensive.
interface CountryRate {
  dialCode: string; // no leading +
  country: string;
  rate: number;
}

const RATES: CountryRate[] = [
  { dialCode: "1", country: "US/Canada", rate: 0.0083 },
  { dialCode: "44", country: "UK", rate: 0.056 },
  { dialCode: "61", country: "Australia", rate: 0.0515 },
  { dialCode: "41", country: "Switzerland", rate: 0.0769 },
  { dialCode: "234", country: "Nigeria", rate: 0.3868 },
].sort((a, b) => b.dialCode.length - a.dialCode.length); // longest prefix first

const DEFAULT_RATE: CountryRate = {
  dialCode: "",
  country: "Other international",
  rate: 0.15,
};

export interface SmsCostBreakdown {
  country: string;
  count: number;
  rate: number;
  subtotal: number;
}

export interface SmsCostEstimate {
  total: number;
  breakdown: SmsCostBreakdown[];
}

export function estimateSmsCost(phones: string[]): SmsCostEstimate {
  const counts = new Map<string, { rate: number; count: number }>();

  for (const raw of phones) {
    const digits = raw.replace(/\D/g, "");
    const match = RATES.find((r) => digits.startsWith(r.dialCode)) || DEFAULT_RATE;
    const existing = counts.get(match.country);
    if (existing) existing.count += 1;
    else counts.set(match.country, { rate: match.rate, count: 1 });
  }

  const breakdown: SmsCostBreakdown[] = Array.from(counts.entries())
    .map(([country, { rate, count }]) => ({
      country,
      count,
      rate,
      subtotal: count * rate,
    }))
    .sort((a, b) => b.subtotal - a.subtotal);

  return {
    total: breakdown.reduce((sum, b) => sum + b.subtotal, 0),
    breakdown,
  };
}
