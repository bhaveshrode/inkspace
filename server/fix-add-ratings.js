// Fix script to add missing ratings to published books
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/storyhub';
const pool = new Pool({ connectionString });

async function fix() {
  console.log('[Fix] Adding missing ratings to published books...\n');

  try {
    // Get all readers
    const readers = await pool.query('SELECT id, name FROM readers ORDER BY created_at');
    if (readers.rows.length < 3) {
      console.log('[Fix] ❌ Need at least 3 readers. Please run migration script first.');
      return;
    }

    const r1 = readers.rows[0].id;
    const r2 = readers.rows[1].id;
    const r3 = readers.rows[2].id;

    console.log(`[Fix] Using readers: ${readers.rows.map(r => r.name).join(', ')}`);

    // Get published books
    const books = await pool.query(`
      SELECT id, title, status
      FROM books
      WHERE status = 'published'
      ORDER BY title
    `);

    console.log(`\n[Fix] Found ${books.rows.length} published books:`);
    books.rows.forEach(b => console.log(`  - ${b.title}`));

    if (books.rows.length < 2) {
      console.log('\n[Fix] ❌ Need at least 2 published books for "Highest Rated" section');
      return;
    }

    // Add ratings to each published book
    for (const book of books.rows) {
      // Check existing ratings
      const existingRatings = await pool.query(
        'SELECT COUNT(*) as count FROM ratings WHERE book_id = $1',
        [book.id]
      );
      const currentCount = parseInt(existingRatings.rows[0].count);

      console.log(`\n[Fix] ${book.title}: currently has ${currentCount} rating(s)`);

      if (currentCount >= 3) {
        console.log(`  ✓ Already has 3+ ratings, skipping`);
        continue;
      }

      // Determine which ratings to add (based on current count)
      const ratingsToAdd = [];

      if (currentCount === 0) {
        // Add all 3 ratings: 5, 4, 5 = avg 4.67
        ratingsToAdd.push([r1, book.id, 5]);
        ratingsToAdd.push([r2, book.id, 4]);
        ratingsToAdd.push([r3, book.id, 5]);
      } else if (currentCount === 1) {
        // Add 2 more ratings
        ratingsToAdd.push([r2, book.id, 5]);
        ratingsToAdd.push([r3, book.id, 4]);
      } else if (currentCount === 2) {
        // Add 1 more rating
        ratingsToAdd.push([r3, book.id, 5]);
      }

      // Insert ratings
      for (const [readerId, bookId, rating] of ratingsToAdd) {
        // Check if this reader already rated this book
        const dupCheck = await pool.query(
          'SELECT id FROM ratings WHERE reader_id = $1 AND book_id = $2',
          [readerId, bookId]
        );

        if (dupCheck.rows.length === 0) {
          await pool.query(
            'INSERT INTO ratings (id, reader_id, book_id, rating) VALUES ($1, $2, $3, $4)',
            [uuidv4(), readerId, bookId, rating]
          );
          console.log(`  + Added ${rating}★ rating`);
        }
      }

      // Verify final count
      const finalCount = await pool.query(
        'SELECT COUNT(*) as count, AVG(rating) as avg FROM ratings WHERE book_id = $1',
        [book.id]
      );
      const count = parseInt(finalCount.rows[0].count);
      const avg = parseFloat(finalCount.rows[0].avg || 0);
      console.log(`  ✓ Now has ${count} ratings, avg ${avg.toFixed(2)}★`);
    }

    console.log('\n[Fix] ✅ All published books now have 3+ ratings!');
    console.log('[Fix] 🎉 Refresh your browser to see the "Highest Rated" section');

  } catch (error) {
    console.error('[Fix] ❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fix().catch(err => {
  console.error('Fix failed:', err);
  process.exit(1);
});
