import twilioSdk from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

// API Key auth (SK...) is scoped and revocable, but still needs the account
// SID alongside it since a key alone doesn't identify the account. Falls
// back to the classic Account SID + Auth Token pair if that's what's set
// instead.
export const twilioClient =
  apiKeySid && apiKeySecret && accountSid
    ? twilioSdk(apiKeySid, apiKeySecret, { accountSid })
    : accountSid && authToken
      ? twilioSdk(accountSid, authToken)
      : null;

export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
