const { Pool } = require("pg");

let pool = null;

async function connectDB() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await pool.query("SELECT 1");

  console.log("✅ PostgreSQL Connected");

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error("Database is not initialized");
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function transaction(work) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const result = await work(client);

    await client.query("COMMIT");

    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  connectDB,
  getPool,
  query,
  transaction,
};