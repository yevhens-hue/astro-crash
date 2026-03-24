const { validate } = require('@tma.js/init-data-node');
const botToken = "8684605867:AAH4Fda_o8koGs8aoZKUWOWAZk7eA6j4nEs";
const authDate = Math.floor(Date.now() / 1000);

// We build a valid hash ignoring signature
const nodeCrypto = require('crypto');
const secretNode = nodeCrypto.createHmac("sha256", "WebAppData").update(botToken).digest();
const parsedString = `auth_date=${authDate}\nquery_id=AAH1H68uAAAA\nuser={"id":123456}`;
const validHash = nodeCrypto.createHmac("sha256", secretNode).update(parsedString).digest("hex");

// Now we ADD signature to initData but its hash was calculated ignoring signature!
const initData = `query_id=AAH1H68uAAAA&user=%7B%22id%22%3A123456%7D&auth_date=${authDate}&hash=${validHash}&signature=blablabla`;

try {
  // We use expiresIn: 0 to force an instantaneous error. BUT if the signature was required to be in the hash, it would throw "Sign invalid" BEFORE expiry check!
  // Wait, if it throws "Sign invalid", we'll catch it. If it throws "Init data expired", the Hash is VALID!
  validate(initData, botToken, { expiresIn: 0 });
} catch(e) {
  console.log("Error:", e.message);
}
