const { validate } = require('@tma.js/init-data-node');
const botToken = "8684605867:AAH4Fda_o8koGs8aoZKUWOWAZk7eA6j4nEs";
const authDate = Math.floor(Date.now() / 1000);

const nodeCrypto = require('crypto');
const secretNode = nodeCrypto.createHmac("sha256", "WebAppData").update(botToken).digest();

// Scenario 1: Hash IS calculated ignoring signature
const parsedStringNoSig = `auth_date=${authDate}\nquery_id=AAH1H68uAAAA\nuser={"id":123456}`;
const validHashNoSig = nodeCrypto.createHmac("sha256", secretNode).update(parsedStringNoSig).digest("hex");
const initDataNoSig = `query_id=AAH1H68uAAAA&user=%7B%22id%22%3A123456%7D&auth_date=${authDate}&hash=${validHashNoSig}&signature=blablabla`;

// Scenario 2: Hash IS calculated including signature
const parsedStringWithSig = `auth_date=${authDate}\nquery_id=AAH1H68uAAAA\nsignature=blablabla\nuser={"id":123456}`;
const validHashWithSig = nodeCrypto.createHmac("sha256", secretNode).update(parsedStringWithSig).digest("hex");
const initDataWithSig = `query_id=AAH1H68uAAAA&user=%7B%22id%22%3A123456%7D&auth_date=${authDate}&hash=${validHashWithSig}&signature=blablabla`;

console.log("No Sig Test:");
try { validate(initDataNoSig, botToken, { expiresIn: 0 }); console.log("Validated!"); } catch(e) { console.log(e.message); }

console.log("\nWith Sig Test:");
try { validate(initDataWithSig, botToken, { expiresIn: 0 }); console.log("Validated!"); } catch(e) { console.log(e.message); }
