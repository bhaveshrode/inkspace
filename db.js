// PostgreSQL-backed database layer with auto-database creation
const { Pool, Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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

module.exports = {
  // Authors
  async getAuthors() {
    const res = await pool.query('SELECT id,name,email,bio,avatar,followers,created_at FROM authors ORDER BY created_at DESC');
    return res.rows;
  },
  async getAuthorById(id) {
    const res = await pool.query('SELECT id,name,email,bio,avatar,followers,created_at FROM authors WHERE id = $1', [id]);
    return res.rows[0] || null;
  },
  async getAuthorByEmail(email) {
    const res = await pool.query('SELECT * FROM authors WHERE email = $1', [email]);
    return res.rows[0] || null;
  },
  async createAuthor({ name, email, password, bio = '', avatar = '' }) {
    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO authors (id,name,email,password_hash,bio,avatar) VALUES ($1,$2,$3,$4,$5,$6)', [id, name, email, hash, bio, avatar]);
    return this.getAuthorById(id);
  },
  verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  },

  // Books
  async getBooks() {
    const res = await pool.query('SELECT id, author_id, title, genre, series, tags, cover, description, status, views, created_at FROM books ORDER BY created_at DESC');
    return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [] }));
  },
  async createBook({ authorId, title, genre = '', series = '', tags = [], cover = '', description = '', status = 'published' }) {
    const id = uuidv4();
    await pool.query('INSERT INTO books (id, author_id, title, genre, series, tags, cover, description, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, authorId, title, genre, series, JSON.stringify(tags), cover, description, status]);
    return this.getBookById(id);
  },
  async getBookById(id) {
    const res = await pool.query('SELECT id, author_id, title, genre, series, tags, cover, description, status, views, created_at FROM books WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const b = res.rows[0];
    const chRes = await pool.query('SELECT idx,title,content,created_at FROM chapters WHERE book_id = $1 ORDER BY idx ASC', [id]);
    return { ...b, tags: b.tags ? JSON.parse(b.tags) : [], chapters: chRes.rows };
  },
  async updateBook(id, fields) {
    const bookRes = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (bookRes.rows.length === 0) return null;
    const book = bookRes.rows[0];
    const updated = { ...book, ...fields };
    if (fields.tags && Array.isArray(fields.tags)) updated.tags = JSON.stringify(fields.tags);
    await pool.query('UPDATE books SET title=$1, genre=$2, series=$3, tags=$4, cover=$5, description=$6, status=$7 WHERE id=$8', [updated.title, updated.genre, updated.series, updated.tags || book.tags, updated.cover, updated.description, updated.status, id]);
    return this.getBookById(id);
  },
  async deleteBook(id) {
    const res = await pool.query('DELETE FROM books WHERE id = $1', [id]);
    return res.rowCount > 0;
  },

  // Chapters
  async createChapter(bookId, { title, content }) {
    const bookRes = await pool.query('SELECT id FROM books WHERE id = $1', [bookId]);
    if (bookRes.rows.length === 0) return null;
    const idxRes = await pool.query('SELECT COALESCE(MAX(idx), -1) as m FROM chapters WHERE book_id = $1', [bookId]);
    const idx = parseInt(idxRes.rows[0].m, 10) + 1;
    const id = uuidv4();
    await pool.query('INSERT INTO chapters (id, book_id, idx, title, content) VALUES ($1,$2,$3,$4,$5)', [id, bookId, idx, title, content]);
    return { id, bookId, idx, title, content };
  },
  async updateChapter(bookId, idx, { title, content }) {
    const rowRes = await pool.query('SELECT id FROM chapters WHERE book_id = $1 AND idx = $2', [bookId, idx]);
    if (rowRes.rows.length === 0) return false;
    await pool.query('UPDATE chapters SET title=$1, content=$2 WHERE book_id=$3 AND idx=$4', [title, content, bookId, idx]);
    return true;
  },
  async deleteChapter(bookId, idx) {
    const delRes = await pool.query('DELETE FROM chapters WHERE book_id = $1 AND idx = $2', [bookId, idx]);
    if (delRes.rowCount > 0) {
      const rows = await pool.query('SELECT id, idx FROM chapters WHERE book_id = $1 AND idx > $2 ORDER BY idx ASC', [bookId, idx]);
      for (const r of rows.rows) {
        await pool.query('UPDATE chapters SET idx = $1 WHERE id = $2', [r.idx - 1, r.id]);
      }
      return true;
    }
    return false;
  },

  // Comments
  async getComments(bookId) {
    const res = await pool.query('SELECT user_name as user, text, created_at as date FROM comments WHERE book_id = $1 ORDER BY created_at ASC', [bookId]);
    return res.rows;
  },
  async addComment(bookId, { user, text }) {
    const id = uuidv4();
    await pool.query('INSERT INTO comments (id, book_id, user_name, text) VALUES ($1,$2,$3,$4)', [id, bookId, user || 'Guest', text]);
    return { id, user: user || 'Guest', text, date: new Date().toISOString() };
  },

  // Follows (toggle)
  async toggleFollow(followerId, authorId) {
    const existsRes = await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND author_id = $2', [followerId, authorId]);
    if (existsRes.rows.length > 0) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND author_id = $2', [followerId, authorId]);
      await pool.query('UPDATE authors SET followers = followers - 1 WHERE id = $1', [authorId]);
      return false;
    } else {
      await pool.query('INSERT INTO follows (follower_id, author_id) VALUES ($1,$2)', [followerId, authorId]);
      await pool.query('UPDATE authors SET followers = followers + 1 WHERE id = $1', [authorId]);
      return true;
    }
  },

  // Bookmarks (toggle)
  async toggleBookmark(userId, bookId, chapterIndex = null) {
    const existsRes = await pool.query('SELECT id FROM bookmarks WHERE user_id = $1 AND book_id = $2 AND ((chapter_index IS NULL AND $3 IS NULL) OR chapter_index = $3)', [userId, bookId, chapterIndex]);
    if (existsRes.rows.length > 0) {
      await pool.query('DELETE FROM bookmarks WHERE id = $1', [existsRes.rows[0].id]);
      return false;
    } else {
      const id = uuidv4();
      await pool.query('INSERT INTO bookmarks (id, user_id, book_id, chapter_index) VALUES ($1,$2,$3,$4)', [id, userId, bookId, chapterIndex]);
      return true;
    }
  },

  // Reading
  async addReading(userId, bookId, chapterIndex = null) {
    const id = uuidv4();
    await pool.query('INSERT INTO reading_history (id, user_id, book_id, chapter_index) VALUES ($1,$2,$3,$4)', [id, userId, bookId, chapterIndex]);
  },
  async getUserFollowing(followerId) {
    const res = await pool.query('SELECT author_id FROM follows WHERE follower_id = $1', [followerId]);
    return res.rows.map(r => r.author_id);
  },
  async getUserBookmarks(userId) {
    const res = await pool.query('SELECT book_id, chapter_index FROM bookmarks WHERE user_id = $1', [userId]);
    return res.rows;
  },
  async getUserReadingHistory(userId) {
    const res = await pool.query('SELECT book_id, chapter_index, MAX(read_at) as last_read FROM reading_history WHERE user_id = $1 GROUP BY book_id, chapter_index ORDER BY last_read DESC', [userId]);
    return res.rows;
  }
};

