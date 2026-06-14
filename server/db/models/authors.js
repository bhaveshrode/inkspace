import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

export async function getAuthors() {
    const pool = getPool();
    const res = await pool.query('SELECT id,name,email,bio,avatar,banner,location,website,twitter,instagram,facebook,linkedin,github,followers,created_at FROM authors ORDER BY created_at DESC');
    return res.rows;
}

export async function getAuthorById(id) {
    const pool = getPool();
    const res = await pool.query('SELECT id,name,email,bio,avatar,banner,location,website,twitter,instagram,facebook,linkedin,github,followers,created_at FROM authors WHERE id = $1', [id]);
    return res.rows[0] || null;
}

export async function getAuthorByEmail(email) {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM authors WHERE email = $1', [email]);
    return res.rows[0] || null;
}

export async function createAuthor({ name, email, password, bio = '', avatar = '' }) {
    const pool = getPool();
    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO authors (id,name,email,password_hash,bio,avatar) VALUES ($1,$2,$3,$4,$5,$6)', [id, name, email, hash, bio, avatar]);
    return getAuthorById(id);
}

export function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

export async function updateAuthorProfile(authorId, profileData) {
    const pool = getPool();
    const {
        name,
        bio,
        avatar,
        banner,
        location,
        website,
        twitter,
        instagram,
        facebook,
        linkedin,
        github
    } = profileData;

    const res = await pool.query(`
        UPDATE authors SET
                           name = COALESCE($2, name),
                           bio = COALESCE($3, bio),
                           avatar = COALESCE($4, avatar),
                           banner = COALESCE($5, banner),
                           location = COALESCE($6, location),
                           website = COALESCE($7, website),
                           twitter = COALESCE($8, twitter),
                           instagram = COALESCE($9, instagram),
                           facebook = COALESCE($10, facebook),
                           linkedin = COALESCE($11, linkedin),
                           github = COALESCE($12, github)
        WHERE id = $1
            RETURNING id,name,email,bio,avatar,banner,location,website,twitter,instagram,facebook,linkedin,github,followers,created_at
    `, [authorId, name, bio, avatar, banner, location, website, twitter, instagram, facebook, linkedin, github]);

    return res.rows[0];
}

// Discovery: Most followed authors
export async function getMostFollowedAuthors(limit = 20) {
    const pool = getPool();
    const res = await pool.query(`
        SELECT a.id, a.name, a.email, a.bio, a.avatar, a.banner, a.location, a.website,
               a.twitter, a.instagram, a.facebook, a.linkedin, a.github, a.followers, a.created_at,
               COUNT(DISTINCT b.id) as book_count,
               COALESCE(SUM(b.views), 0) as total_views
        FROM authors a
                 LEFT JOIN books b ON a.id = b.author_id
        GROUP BY a.id
        ORDER BY a.followers DESC, COUNT(DISTINCT b.id) DESC
            LIMIT $1
    `, [limit]);
    return res.rows.map(a => ({ ...a, bookCount: parseInt(a.book_count) || 0, totalViews: parseInt(a.total_views) || 0 }));
}
