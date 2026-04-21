import { find } from 'geo-tz';
import { db } from './index'; 

async function runFix() {
  console.log("🛠️ Starting internal timezone fix...");
  
  try {
    const airports = await db
      .selectFrom('airport')
      .select(['id', 'lat', 'lon', 'icao'])
      .where('tz', 'like', 'Etc/GMT%')
      .limit(5000) // Process in chunks to avoid Render timeouts
      .execute();

    if (airports.length === 0) {
      console.log("✅ No placeholder timezones found. Database is clean!");
      return;
    }

    console.log(`Updating ${airports.length} airports...`);

    for (const airport of airports) {
      const [realTz] = find(airport.lat, airport.lon);
      if (realTz) {
        await db
          .updateTable('airport')
          .set({ tz: realTz })
          .where('id', '=', airport.id)
          .execute();
      }
    }
    console.log("🚀 Chunk complete!");
  } catch (err) {
    console.error("❌ Fix failed:", err);
  }
}

runFix().then(() => process.exit(0));