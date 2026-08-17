import twilioSdk from "twilio";

export const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilioSdk(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
