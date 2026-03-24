const { validate, parse } = require('@tma.js/init-data-node');
const { crypto } = require('crypto').webcrypto;

async function test() {
  const botToken = "8684605867:AAH4Fda_o8koGs8aoZKUWOWAZk7eA6j4nEs";
  const user = JSON.stringify({id: 123456, first_name: "Yevhen"});
  const authDate = Math.floor(Date.now() / 1000);
  
  // Create test initData
  // We need a valid hash for validate() to not throw. Let's build it with Node crypto first.
  const nodeCrypto = require('crypto');
  const secretNode = nodeCrypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  
  const parsedString = `auth_date=${authDate}\nquery_id=AAH1H68uAAAA\nuser=${user}`;
  const validHash = nodeCrypto.createHmac("sha256", secretNode).update(parsedString).digest("hex");
  
  const initData = `query_id=AAH1H68uAAAA&user=${encodeURIComponent(user)}&auth_date=${authDate}&hash=${validHash}`;
  
  console.log("Expected Valid Hash:", validHash);

  // Now, test WebCrypto logic exactly as in Edge Function
  const parts = initData.split('&');
  let hash = '';
  const cleanParts = [];
  for (const part of parts) {
    if (part.startsWith('hash=')) hash = part.substring(5);
    else if (!part.startsWith('signature=')) cleanParts.push(part);
  }
  cleanParts.sort();
  const dataCheckString = cleanParts.map(p => {
    const eqIdx = p.indexOf('=');
    const key = p.substring(0, eqIdx);
    const val = decodeURIComponent(p.substring(eqIdx + 1));
    return `${key}=${val}`;
  }).join('\n');

  console.log("Calculated DataCheckString: ", JSON.stringify(dataCheckString));
  
  const encoder = new TextEncoder();
  const secretKeyBuffer = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const secretKey = await crypto.subtle.sign("HMAC", secretKeyBuffer, encoder.encode(botToken));
  
  const signatureKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", signatureKey, encoder.encode(dataCheckString));
  
  const calculatedHash = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  console.log("WebCrypto Hash:", calculatedHash);
  
  try {
     validate(initData, botToken);
     console.log("@tma.js Validated? YES");
  } catch (e) {
     console.log("@tma.js Validated? NO", e.message);
  }
}
test();
