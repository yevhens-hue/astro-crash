const botToken = "8684605867:AAH4Fda_o8koGs8aoZKUWOWAZk7eA6j4nEs";
const initData = "query_id=AAH1H68uAAAAAPUfry5e5FZa&user=%7B%22id%22%3A781845237%2C%22first_name%22%3A%22Yevhen%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22yshaforostov%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1711204000&hash=123456";

// Test tma.js parse logic
const { validate } = require('@tma.js/init-data-node');
try {
  validate(initData, botToken, { expiresIn: 0 }); // 0 means don't check expiration
} catch (e) {
  console.log("TMA.JS expected:", e.message);
}
