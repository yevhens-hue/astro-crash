export async function verifyTelegramAuth(initData: string, botToken: string): Promise<{valid: boolean, reason?: string}> {
  console.log('[TELEGRAM_AUTH] Starting auth verification');
  console.log('[TELEGRAM_AUTH] Token length:', botToken?.length);
  
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  const authDate = urlParams.get("auth_date");
  
  urlParams.delete("hash");
  urlParams.delete("signature");

  if (authDate) {
    const authTimestamp = parseInt(authDate, 10);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60;
    if (now - authTimestamp > maxAge) {
      return { valid: false, reason: 'Telegram auth expired' };
    }
  } else {
    return { valid: false, reason: 'No auth_date' };
  }

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const cleanBotToken = botToken.trim();

  try {
    const encoder = new TextEncoder();
    
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
      encoder.encode(cleanBotToken)
    );

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
      console.log(`[TELEGRAM_AUTH] Hash mismatch! Extracted string:\n${dataCheckString}`);
      return { valid: false, reason: `Hash mismatch. Expected ${hash}, got ${calculatedHash}` };
    }

    return { valid: true };
  } catch (error: any) {
    console.error("[TELEGRAM_AUTH] Crypto error:", error);
    return { valid: false, reason: 'Crypto hash generation failed' };
  }

  return { valid: true };
}
