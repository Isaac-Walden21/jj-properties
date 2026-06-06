import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const [, , username, email, password, role = "admin"] = process.argv;
if (!username || !email || !password) {
  console.error("Usage: node scripts/create-user.mjs <username> <email> <password> [admin|staff]");
  process.exit(1);
}
if (!["admin", "staff"].includes(role)) {
  console.error(`Invalid role '${role}' — must be admin or staff`);
  process.exit(1);
}

const dbPath = process.env.SQLITE_DB_PATH || "./data/crm.db";
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const hash = bcrypt.hashSync(password, Number(process.env.BCRYPT_COST ?? 12));
db.prepare(
  "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)"
).run(username, email, hash, role);

console.log(`Created ${role} '${username}' (${email}) in ${dbPath}`);
