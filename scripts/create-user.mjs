// Create a login, or reset one's password. Prints a generated temporary password once;
// the person changes it on their Account page. No password on the command line.
//
//   node scripts/create-user.mjs <username> <email> [admin|staff]
//   node scripts/create-user.mjs --reset <username>
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { dbPath } from "./db-path.mjs";

const args = process.argv.slice(2);
const reset = args[0] === "--reset";
const [username, email, role = "admin"] = reset ? [args[1]] : args;
if (!username || (!reset && !email)) {
  console.error("Usage: node scripts/create-user.mjs <username> <email> [admin|staff]\n       node scripts/create-user.mjs --reset <username>");
  process.exit(1);
}
if (!["admin", "staff"].includes(role)) {
  console.error(`Invalid role '${role}' — must be admin or staff`);
  process.exit(1);
}

const path = dbPath();
const db = new Database(path);
db.pragma("foreign_keys = ON");

const password = randomBytes(9).toString("base64url"); // 12 chars
const hash = bcrypt.hashSync(password, Number(process.env.BCRYPT_COST ?? 12));

if (reset) {
  const { changes } = db.prepare("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE username = ? COLLATE NOCASE").run(hash, username);
  if (!changes) {
    console.error(`No login named '${username}' in ${path}`);
    process.exit(1);
  }
  // A reset signs out every browser session (session_version) and Claude connection, and lifts any lockout.
  db.prepare("DELETE FROM login_attempts WHERE key = ?").run(`user:${username.toLowerCase()}`);
  db.prepare("UPDATE oauth_tokens SET revoked = 1 WHERE user_id = (SELECT id FROM users WHERE username = ? COLLATE NOCASE)").run(username);
  console.log(`Reset '${username}' in ${path}`);
} else {
  db.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)").run(username, email, hash, role);
  console.log(`Created ${role} '${username}' (${email}) in ${path}`);
}
console.log(`Temporary password: ${password}`);
