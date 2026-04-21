import { find } from 'geo-tz';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
// We only import the Type, which won't trigger SvelteKit environment errors
import type { DB } from './index'; 

async function runFix() {
  console.log("🛠️ Starting independent timezone fix...");

  // Manually create a DB connection using the environment variable
  // This bypasses $env/dynamic/private
  const database = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
  });

  try {
    // Look for rows where tz is empty, null, or a GMT placeholder
    const airports = await database
      .selectFrom('airport')
      .select(['id', 'lat', 'lon', 'icao', 'name'])
      .where((eb) => eb.or([
        eb('tz', 'like', 'Etc/GMT%'),
        eb('tz', '=', ''),
        eb('tz', 'is', null)
      ]))
      .limit(5000) // Chunking to prevent Render timeouts
      .execute();

    if (airports.length === 0) {
      console.log("✅ No placeholder or empty timezones found. Database is clean!");
      return;
    }

    console.log(`Updating ${airports.length} airports...`);

    let updatedCount = 0;
    for (const airport of airports) {
      // geo-tz returns an array; we take the first result
      const [realTz] = find(airport.lat, airport.lon);
      
      if (realTz) {
        await database
          .updateTable('airport')
          .set({ tz: realTz })
          .where('id', '=', airport.id)
          .execute();
        updatedCount++;
      }
    }
    
    console.log(`🚀 Chunk complete! Successfully updated ${updatedCount} airports.`);
    
  } catch (err) {
    console.error("❌ Fix failed:", err);
  } finally {
    // Crucial: close the connection so the build doesn't hang
    await database.destroy();
    console.log("Cleanup: Database connection closed.");
  }
}

runFix().then(() => {
  process.exit(0);
});