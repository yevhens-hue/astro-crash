const crypto = require('crypto');
const botToken = "8684605867:AAH4Fda_o8koGs8aoZKUWOWAZk7eA6j4nEs";

// Generate a valid Telegram initData
const authDate = Math.floor(Date.now() / 1000);
const user = JSON.stringify({id: 123456, first_name: "Yevhen"});
let dataCheckString = `auth_date=${authDate}\nquery_id=AAH1H68uAAAA\nuser=${user}`;

const secretNode = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
const hashStr = crypto.createHmac("sha256", secretNode).update(dataCheckString).digest("hex");

const initData = `query_id=AAH1H68uAAAA&user=${encodeURIComponent(user)}&auth_date=${authDate}&hash=${hashStr}`;

console.log("Mock initData:", initData);
console.log("Expected Hash:", hashStr);

// Now simulate WebCrypto parser:
const parts = initData.split('&');
let hash = '';
const cleanParts = [];
for (const part of parts) {
  if (part.startsWith('hash=')) hash = part.substring(5);
  else if (!part.startsWith('signature=')) cleanParts.push(part);
}
cleanParts.sort();
const calculatedDataCheckString = cleanParts.map(p => {
  const eqIdx = p.indexOf('=');
  const key = p.substring(0, eqIdx);
  const val = decodeURIComponent(p.substring(eqIdx + 1));
  return `${key}=${val}`;
}).join('\n');

console.log("Calculated DataCheckString:\n" + calculatedDataCheckString);
console.log("Matches?", calculatedDataCheckString === dataCheckString);
