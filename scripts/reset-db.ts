import { resetDatabase } from "../src/lib/server/db";

resetDatabase().then(() => { console.log("Database reset and seeded with demo data."); process.exit(0); }, (e) => { console.error(e); process.exit(1); });
