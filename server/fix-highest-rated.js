// Quick fix to ensure published books have ratings for "Highest Rated" section
import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/storyhub';
const pool = new Pool({ connectionString });

async function fix() {
  console.log('[Fix] Checking book statuses and ratings...');

  try {
    // Check which books have ratings and what their status is
    const result = await pool.query(`
      SELECT b.id, b.title, b.status, COUNT(r.id) as rating_count, AVG(r.rating) as avg_rating
      FROM books b
      LEFT JOIN ratings r ON b.id = r.book_id
      GROUP BY b.id
      ORDER BY b.created_at
    `);

    console.log('\n[Fix] Current book status:');
    result.rows.forEach(book => {
      console.log(`  - ${book.title}: status="${book.status}", ratings=${book.rating_count}, avg=${parseFloat(book.avg_rating || 0).toFixed(2)}`);
    });

    // Count published books with 3+ ratings
    const publishedWithRatings = result.rows.filter(b =>
      b.status === 'published' && parseInt(b.rating_count) >= 3
    );

    console.log(`\n[Fix] Published books with 3+ ratings: ${publishedWithRatings.length}`);

    if (publishedWithRatings.length === 0) {
      console.log('[Fix] ❌ No published books have 3+ ratings!');
      console.log('[Fix] 💡 Solution: Change "Neon Dreams" back to published, or add more published books');

      // Check if Neon Dreams has ratings
      const neonDreams = result.rows.find(b => b.title === 'Neon Dreams');
      if (neonDreams && parseInt(neonDreams.rating_count) >= 3) {
        console.log('\n[Fix] 🔧 "Neon Dreams" has ratings but is completed. Options:');
        console.log('   1. Keep it completed (Completed Stories section works)');
        console.log('   2. Change it back to published (Highest Rated section works)');
        console.log('   3. Add ratings to other published books');
      }
    } else {
      console.log('[Fix] ✅ "Highest Rated" section should work!');
      console.log('[Fix] Published books that will appear:');
      publishedWithRatings.forEach(b => {
        console.log(`  - ${b.title} (${parseFloat(b.avg_rating).toFixed(2)}★)`);
      });
    }

  } catch (error) {
    console.error('[Fix] Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();
