// Migration script to add discovery feature data to existing database
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/storyhub';
const pool = new Pool({ connectionString });

async function migrate() {
  console.log('[Migration] Starting discovery features migration...');

  try {
    // 1. Add third reader if not exists
    const readerCheck = await pool.query("SELECT id FROM readers WHERE email = 'reader3@inkspace.com'");
    let r3;

    if (readerCheck.rows.length === 0) {
      r3 = uuidv4();
      await pool.query(
        'INSERT INTO readers (id,name,email,password_hash,bio,avatar) VALUES ($1,$2,$3,$4,$5,$6)',
        [r3, 'Jordan Pages', 'reader3@inkspace.com', bcrypt.hashSync('password', 10), 'Story enthusiast', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80']
      );
      console.log('[Migration] ✓ Added third reader: Jordan Pages');
    } else {
      r3 = readerCheck.rows[0].id;
      console.log('[Migration] ✓ Third reader already exists');
    }

    // 2. Update one book to 'completed' status
    const completedCheck = await pool.query("SELECT COUNT(*) as count FROM books WHERE status = 'completed'");
    if (parseInt(completedCheck.rows[0].count) === 0) {
      await pool.query("UPDATE books SET status = 'completed' WHERE title = 'Neon Dreams'");
      console.log('[Migration] ✓ Updated "Neon Dreams" to completed status');
    } else {
      console.log('[Migration] ✓ Completed book already exists');
    }

    // 3. Add ratings if they don't exist
    const ratingsCheck = await pool.query('SELECT COUNT(*) as count FROM ratings');
    if (parseInt(ratingsCheck.rows[0].count) === 0) {
      // Get all readers and books
      const readers = await pool.query('SELECT id FROM readers ORDER BY created_at LIMIT 3');
      const books = await pool.query('SELECT id FROM books ORDER BY created_at LIMIT 3');

      if (readers.rows.length >= 3 && books.rows.length >= 3) {
        const r1 = readers.rows[0].id;
        const r2 = readers.rows[1].id;
        const r3 = readers.rows[2].id;
        const b1 = books.rows[0].id;
        const b2 = books.rows[1].id;
        const b3 = books.rows[2].id;

        // Add 3 ratings per book with 4.0+ average
        const ratingsData = [
          // Book 1: 5, 4, 5 = avg 4.67
          [r1, b1, 5],
          [r2, b1, 4],
          [r3, b1, 5],
          // Book 2: 5, 5, 4 = avg 4.67
          [r1, b2, 5],
          [r2, b2, 5],
          [r3, b2, 4],
          // Book 3: 4, 5, 5 = avg 4.67
          [r1, b3, 4],
          [r2, b3, 5],
          [r3, b3, 5],
        ];

        for (const [readerId, bookId, rating] of ratingsData) {
          await pool.query(
            'INSERT INTO ratings (id, reader_id, book_id, rating) VALUES ($1, $2, $3, $4)',
            [uuidv4(), readerId, bookId, rating]
          );
        }
        console.log('[Migration] ✓ Added 9 ratings (3 per book, avg 4.67 stars)');
      } else {
        console.log('[Migration] ⚠ Not enough readers or books to add ratings');
      }
    } else {
      console.log('[Migration] ✓ Ratings already exist');
    }

    console.log('[Migration] ✅ Migration completed successfully!');
    console.log('\n[Next Steps] Refresh your browser to see all 4 discovery sections:');
    console.log('  • Trending This Week');
    console.log('  • Highest Rated (now shows all books with 4.67★)');
    console.log('  • Recently Updated');
    console.log('  • Completed Stories (now shows "Neon Dreams")');

  } catch (error) {
    console.error('[Migration] ❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
