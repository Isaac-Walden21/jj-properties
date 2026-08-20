// Runs before any test module is imported.
//
// getDb() reads SQLITE_DB_PATH lazily on first call, so setting it here is
// enough to keep every test on an in-memory database and off ./data/crm.db.
process.env.SQLITE_DB_PATH = ":memory:";

// Fixed, obviously-fake values so tests never depend on a developer's .env.
// UNSUB_SECRET and NEXT_PUBLIC_SITE_URL are read at call time by the unsub
// token helpers; MARKETING_* are read by the sender and the campaign preflight.
process.env.UNSUB_SECRET = "test-unsub-secret-not-a-real-key";
process.env.NEXT_PUBLIC_SITE_URL = "https://portal.test";
process.env.MARKETING_FROM_EMAIL = "J & J Resort Properties <news@portal.test>";
process.env.MARKETING_BUSINESS_ADDRESS = "1 Main St, Cedarville, MI 49719";
process.env.SES_CONFIGURATION_SET = "jj-marketing-test";
process.env.BCRYPT_COST = "4"; // keep bcrypt tests fast
