import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import apiRoutes from './routes/index.js';
import authorsRoutes from './routes/authors.js';
import readersRoutes from './routes/readers.js';
import booksRoutes from './routes/books.js';
import chaptersRoutes from './routes/chapters.js';
import userRoutes from './routes/user.js';
import interactionsRoutes from './routes/interactions.js';

// Initialize database (tables, seed data)
import './db/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files from public directory
app.use(express.static(path.join(__dirname, '../public')));
// Also serve dist directory for built assets
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/authors', authorsRoutes);
app.use('/api/readers', readersRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/books', chaptersRoutes);
app.use('/api', userRoutes);
app.use('/api/interactions', interactionsRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
