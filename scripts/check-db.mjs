import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is not set. Check your .env');
  process.exit(1);
}

try {
  const parsed = new URL(url);
  const user = parsed.username || 'root';
  const password = parsed.password || '';
  const host = parsed.hostname;
  const port = parsed.port ? Number(parsed.port) : 3306;
  const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';

  console.log(`Attempting to connect to MySQL at ${host}:${port}, database=${database}`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  const [rows] = await conn.query('SELECT 1 AS ok');
  console.log('Query result:', rows);
  await conn.end();
  console.log('Connection successful');
  process.exit(0);
} catch (err) {
  console.error('Failed to connect to database:', err.message || err);
  process.exit(2);
}
