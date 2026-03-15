import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { hex } from "https://deno.land/std@0.177.0/encoding/hex.ts";

export async function verifyTelegramAuth(initData: string, botToken: string): Promise<boolean> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  const authDate = urlParams.get("auth_date");
  urlParams.delete("hash");

  // Check if auth_date exists and is not expired (24 hours max)
  if (authDate) {
    const authTimestamp = parseInt(authDate, 10);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours in seconds
    if (now - authTimestamp > maxAge) {
      console.warn('Telegram auth expired');
      return false;
    }
  } else {
    console.warn('No auth_date in initData');
    return false;
  }

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const encoder = new TextEncoder();
  
  // 1. Create secret key
  const secretKeyBuffer = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const secretKey = await crypto.subtle.sign(
    "HMAC",
    secretKeyBuffer,
    encoder.encode(botToken)
  );

  // 2. Calculate hash
  const signatureKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    signatureKey,
    encoder.encode(dataCheckString)
  );

  const calculatedHash = new TextDecoder().decode(hex.encode(new Uint8Array(signature)));
  
  return calculatedHash === hash;
}
