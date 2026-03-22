export async function verifyTelegramAuth(initData: string, botToken: string): Promise<{valid: boolean, reason?: string}> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  const authDate = urlParams.get("auth_date");
  urlParams.delete("hash");
  urlParams.delete("signature"); // Telegram added a new Ed25519 signature parameter that must be excluded

  if (authDate) {
    const authTimestamp = parseInt(authDate, 10);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours in seconds
    if (now - authTimestamp > maxAge) {
      return { valid: false, reason: 'Telegram auth expired (older than 24h)' };
    }
  } else {
    return { valid: false, reason: 'No auth_date in initData' };
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

  const calculatedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  if (calculatedHash !== hash) {
    return { valid: false, reason: `Hash mismatch (V2). Expected ${hash}, got ${calculatedHash}. DataString=[${dataCheckString}], TokenLen=${botToken?.length}` };
  }

  return { valid: true };
}
