// PostgreSQL-backed database layer with auto-database creation
import pkg from 'pg';
const { Pool, Client } = pkg;
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Helper to parse connection string and ensure DB exists
async function ensureDatabaseExists() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/storyhub';
  const url = new URL(connectionString);
  const dbName = url.pathname.slice(1) || 'storyhub';
  const adminConnStr = connectionString.replace(`/${dbName}`, '/postgres');

  try {
    // Try connecting to target DB first
    const testPool = new Pool({ connectionString });
    await testPool.query('SELECT 1');
    testPool.end();
    console.log(`[DB] Connected to database: ${dbName}`);
    return connectionString;
  } catch (err) {
    if (err.message.includes('does not exist')) {
      console.log(`[DB] Database ${dbName} does not exist. Creating...`);
      const adminClient = new Client(adminConnStr);
      try {
        await adminClient.connect();
        await adminClient.query(`CREATE DATABASE ${dbName};`);
        console.log(`[DB] Created database: ${dbName}`);
        await adminClient.end();
        return connectionString;
      } catch (createErr) {
        console.error('[DB] Failed to create database:', createErr.message);
        throw createErr;
      }
    } else {
      throw err;
    }
  }
}

let connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/storyhub';
let pool = null;

// Initialize pool after ensuring DB exists
async function initPool() {
  connectionString = await ensureDatabaseExists();
  pool = new Pool({ connectionString });
}

async function init() {
  // Create tables
  await pool.query(`CREATE TABLE IF NOT EXISTS authors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT,
    avatar TEXT,
    followers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    genre TEXT,
    series TEXT,
    tags TEXT,
    cover TEXT,
    description TEXT,
    status TEXT DEFAULT 'published',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY(author_id) REFERENCES authors(id) ON DELETE CASCADE
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY(follower_id, author_id)
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS reading_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    chapter_index INTEGER,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    chapter_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    chapter_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );`);

  // Seed demo data if no authors
  const res = await pool.query('SELECT count(1) as c FROM authors');
  if (parseInt(res.rows[0].c, 10) === 0) await seed();
  console.log('[DB] Tables created and initialized');
}

async function seed() {
  const a1 = uuidv4();
  const a2 = uuidv4();
  await pool.query('INSERT INTO authors (id,name,email,password_hash,bio,avatar,followers) VALUES ($1,$2,$3,$4,$5,$6,$7)', [a1, 'Elena Fisher', 'elena@inkspace.com', bcrypt.hashSync('password', 10), 'Fantasy writer and coffee enthusiast.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', 142]);
  await pool.query('INSERT INTO authors (id,name,email,password_hash,bio,avatar,followers) VALUES ($1,$2,$3,$4,$5,$6,$7)', [a2, 'Marcus Chen', 'marcus@inkspace.com', bcrypt.hashSync('password', 10), 'Sci-fi nerd and physicist.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80', 89]);

  const b1 = uuidv4();
  const b2 = uuidv4();
  const b3 = uuidv4();
  await pool.query('INSERT INTO books (id, author_id, title, genre, series, tags, cover, description, status, views, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [b1, a1, 'The Last Starlight', 'Sci-Fi', 'Starlight Saga', JSON.stringify(['Space','Adventure','AI']), 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 'In a galaxy where stars are dying, one pilot must find the source of the darkness.', 'published', 1205, new Date(Date.now() - 86400000 * 2).toISOString()]);
  await pool.query('INSERT INTO books (id, author_id, title, genre, series, tags, cover, description, status, views, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [b2, a2, 'Neon Dreams', 'Cyberpunk', '', JSON.stringify(['Future','Dystopia','Hacking']), 'https://images.unsplash.com/photo-1515630278258-407f66498911?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 'In 2084, dreams are currency.', 'published', 850, new Date().toISOString()]);
  await pool.query('INSERT INTO books (id, author_id, title, genre, series, tags, cover, description, status, views, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [b3, a1, 'Shadows of the Old World', 'Fantasy', '', JSON.stringify(['Magic','Dragons']), 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 'Ancient magic awakens.', 'published', 2300, new Date(Date.now() - 86400000 * 5).toISOString()]);

  await pool.query('INSERT INTO chapters (id, book_id, idx, title, content) VALUES ($1,$2,$3,$4,$5)', [uuidv4(), b1, 0, 'Prologue', 'The sky was bleeding. Not the red of sunset...']);
  await pool.query('INSERT INTO chapters (id, book_id, idx, title, content) VALUES ($1,$2,$3,$4,$5)', [uuidv4(), b1, 1, 'Chapter 1', 'Commander Vane stood before the map...']);
  await pool.query('INSERT INTO chapters (id, book_id, idx, title, content) VALUES ($1,$2,$3,$4,$5)', [uuidv4(), b2, 0, 'The Dream Market', 'Sarah plugged the cable into her temple...']);
  await pool.query('INSERT INTO chapters (id, book_id, idx, title, content) VALUES ($1,$2,$3,$4,$5)', [uuidv4(), b3, 0, 'The Awakening', 'The subway trembled...']);
}

// Initialize immediately
(async () => {
  try {
    await initPool();
    await init();
    console.log('[DB] Database initialization complete');
  } catch (err) {
    console.error('[DB] Initialization failed:', err.message);
  }
})();

// Export pool getter for models
export function getPool() {
  return pool;
}
