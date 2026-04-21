import { find } from 'geo-tz';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
// Import only the TYPE, not the actual DB object
import type { DB } from './index'; 

async function runFix() {
  console.log("🛠️ Starting independent timezone fix...");

  // Manually create a DB connection to bypass SvelteKit $env
  const database = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
  });

  try {
    const airports = await database
      .selectFrom('airport')
      .select(['id', 'lat', 'lon', 'icao'])
      .where('tz', 'like', 'Etc/GMT%')
      .limit(5000) 
      .execute();

    if (airports.length === 0) {
      console.log("✅ No placeholders found!");
      return;
    }

    console.log(`Updating ${airports.length} airports...`);

    for (const airport of airports) {
      const [realTz] = find(airport.lat, airport.lon);
      if (realTz) {
        await database
          .updateTable('airport')
          .set({ tz: realTz })
          .where('id', '=', airport.id)
          .execute();
      }
    }
    console.log("🚀 Chunk complete!");
  } catch (err) {
    console.error("❌ Fix failed:", err);
  } finally {
    await database.destroy(); // Close the pool
  }
}

runFix().then(() => process.exit(0));