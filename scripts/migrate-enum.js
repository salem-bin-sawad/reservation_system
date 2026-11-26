import pg from 'pg';

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'reservation_db',
});

async function run() {
  await client.connect();
  console.log('Connected to reservation_db');

  try {
    await client.query("ALTER TYPE trips_status_enum ADD VALUE IF NOT EXISTS 'DRAFT';");
    console.log("Added 'DRAFT' to trips_status_enum");
  } catch (err) {
    console.log("Error or already exists in enum:", err.message);
  }

  try {
    await client.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_name varchar(255);");
    await client.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS issued_date date;");
    await client.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS source varchar(255);");
    console.log("Ensured new columns exist in trips table");
  } catch (err) {
    console.log("Error altering columns:", err.message);
  }

  await client.end();
}

run();
