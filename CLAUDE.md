# InkSpace - Project Coding Guidelines

## Project Overview

InkSpace (Story-Hub) is a full-stack web application for reading, writing, and discovering stories. It uses a PostgreSQL database, Express.js REST API, and vanilla JavaScript SPA frontend.

**Tech Stack:**
- Backend: Node.js + Express.js + PostgreSQL
- Frontend: Vanilla JavaScript (no framework)
- Authentication: JWT with bcryptjs
- Styling: Tailwind CSS (CDN)
- Rich Text: Quill.js editor
- PWA: Service Worker enabled

---

## Code Organization

### File Structure (New Modular Architecture)
```
inkspace/
├── index.html         # HTML entry point (at root - Vite standard)
├── server/            # Backend code (ES6 modules)
│   ├── index.js       # Main server entry point
│   ├── routes/        # API route handlers
│   │   ├── index.js   # Health check routes
│   │   ├── authors.js # Author auth & management
│   │   ├── books.js   # Book CRUD operations
│   │   ├── chapters.js# Chapter management
│   │   └── user.js    # User interactions
│   ├── middleware/    # Express middleware
│   │   └── auth.js    # JWT authentication
│   └── db/            # Database layer
│       ├── index.js   # DB connection & initialization
│       └── models/    # Data access layer
│           ├── authors.js
│           ├── books.js
│           ├── chapters.js
│           └── interactions.js
├── src/               # Frontend source (bundled by Vite)
│   ├── main.js        # Application entry point
│   ├── router/        # SPA routing
│   │   └── index.js
│   ├── store/         # State management & API client
│   │   └── index.js
│   ├── views/         # Page components (10 files)
│   │   └── *.js
│   ├── components/    # Reusable UI components
│   │   ├── workCard.js
│   │   ├── notFound.js
│   │   └── toast.js
│   └── utils/         # Utility functions
├── public/            # Static assets (served at /public/)
│   ├── styles.css     # Custom CSS
│   └── sw.js          # Service Worker
├── dist/              # Production build output (Vite generates)
├── vite.config.js     # Vite configuration
└── package.json       # Dependencies & scripts
```

**Important:** `index.html` is at the project root (Vite standard convention). Static assets in `public/` are served at `/public/` URLs (e.g., `/public/styles.css`).

### Separation of Concerns
- **server/routes/**: Route definitions only - delegate to models
- **server/middleware/**: Reusable middleware (auth, error handling)
- **server/db/models/**: All database operations, queries, and data transformations
- **src/views/**: Page-level components - one file per route
- **src/components/**: Reusable UI components
- **src/store/**: Centralized state management and API client
- **src/router/**: SPA routing logic only

### Module System
- **Backend**: ES6 modules (`import`/`export`)
- **Frontend**: ES6 modules bundled by Vite
- All files use `import`/`export` syntax (no CommonJS)

---

## Backend Standards

### Creating New Routes

#### Location
Place route handlers in appropriate files under `server/routes/`:
- Author-related: `server/routes/authors.js`
- Book-related: `server/routes/books.js`
- Chapter-related: `server/routes/chapters.js`
- User interactions: `server/routes/user.js`

#### Pattern for Route Files
```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as Model from '../db/models/modelName.js';

const router = express.Router();

// Public route
router.get('/resource', async (req, res) => {
  try {
    const data = await Model.getResource();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected route
router.post('/resource', authenticate, async (req, res) => {
  try {
    const authorId = req.user.id;
    const data = await Model.createResource({ ...req.body, authorId });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

#### Registering Routes
In `server/index.js`, import and mount the router:
```javascript
import authorsRoutes from './routes/authors.js';
app.use('/api', authorsRoutes);
```

### API Route Conventions

#### Naming
- Use RESTful conventions: `/api/resource` or `/api/resource/:id`
- Plural nouns for collections: `/api/books`, `/api/authors`
- Use hyphens for multi-word resources: `/api/reading-history`

#### Protected Routes
Always use the `authenticate` middleware for protected endpoints:
```javascript
app.post('/api/books', authenticate, async (req, res) => {
  // req.user is available: { id, email, name }
  const authorId = req.user.id;
  // ... implementation
});
```

#### Ownership Validation
For update/delete operations, always verify ownership:
```javascript
const resource = await db.getResourceById(req.params.id);
if (!resource) return res.status(404).json({ error: 'Not found' });
if (resource.author_id !== req.user.id) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

#### Response Formats
- **Success (200)**: `res.json({ data })`
- **Created (201)**: Not currently used, but acceptable
- **Bad Request (400)**: `res.status(400).json({ error: 'Missing fields' })`
- **Unauthorized (401)**: `res.status(401).json({ error: 'Unauthorized' })`
- **Forbidden (403)**: `res.status(403).json({ error: 'Forbidden' })`
- **Not Found (404)**: `res.status(404).json({ error: 'Resource not found' })`
- **Conflict (409)**: `res.status(409).json({ error: 'Already exists' })`
- **Server Error (500)**: `res.status(500).json({ error: 'Server error' })`

### Database Models (server/db/models/)

#### Creating New Models
Place database operations in appropriate model files:
- `server/db/models/authors.js` - Author CRUD
- `server/db/models/books.js` - Book CRUD
- `server/db/models/chapters.js` - Chapter CRUD
- `server/db/models/interactions.js` - Follows, bookmarks, reading history

#### Model File Pattern
```javascript
import pool from '../index.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function getResource() {
  const res = await pool.query('SELECT * FROM table ORDER BY created_at DESC');
  return res.rows;
}

export async function getResourceById(id) {
  const res = await pool.query('SELECT * FROM table WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createResource(data) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO table (id, field1, field2) VALUES ($1, $2, $3)',
    [id, data.field1, data.field2]
  );
  return getResourceById(id);
}

// Export all functions
```

#### Query Conventions
- Always use parameterized queries: `pool.query('SELECT * FROM table WHERE id = $1', [id])`
- Never concatenate user input into SQL strings
- Use transactions for multi-step operations (if needed)

#### Function Naming
- `get<Resource>()` - Retrieve multiple records
- `get<Resource>ById(id)` - Retrieve single record by ID
- `create<Resource>(data)` - Insert new record
- `update<Resource>(id, data)` - Update existing record
- `delete<Resource>(id)` - Delete record
- `toggle<Action>()` - For toggle operations (follows, bookmarks)

#### Return Patterns
```javascript
// Single record - return null if not found
async getAuthorById(id) {
  const res = await pool.query('SELECT ... WHERE id = $1', [id]);
  return res.rows[0] || null;
}

// Multiple records - return array (empty if none)
async getAuthors() {
  const res = await pool.query('SELECT ... ORDER BY created_at DESC');
  return res.rows;
}

// Boolean operations
async deleteBook(id) {
  const res = await pool.query('DELETE FROM books WHERE id = $1', [id]);
  return res.rowCount > 0;
}
```

#### UUID Generation
Always use `uuid` package for IDs:
```javascript
const { v4: uuidv4 } = require('uuid');
const id = uuidv4();
```

#### Password Hashing
Always hash passwords with bcryptjs (10 rounds):
```javascript
const hash = bcrypt.hashSync(password, 10);
// Verify: bcrypt.compareSync(password, hash)
```

### Environment Variables
```javascript
// Always provide defaults for development
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'inkspace-secret-key-for-dev-only';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/storyhub';
```

**IMPORTANT:** Document when defaults should NOT be used in production (like JWT_SECRET).

---

## Frontend Standards

### Creating New Views

#### Location
All view components go in `src/views/` directory.

#### View File Pattern
```javascript
import { store } from '../store/index.js';
import { router } from '../router/index.js';
import { WorkCard } from '../components/workCard.js';
import { showToast } from '../components/toast.js';

export async function viewName(params) {
  // Fetch data if needed
  const data = await store.getSomeData();

  // Create container
  const container = document.createElement('div');
  container.className = 'fade-in max-w-7xl mx-auto px-4 py-8';

  // Build HTML
  container.innerHTML = `
    <h1 class="text-3xl font-bold">Title</h1>
    <div id="content-area"></div>
  `;

  // Attach event listeners
  const contentArea = container.querySelector('#content-area');
  contentArea.appendChild(someComponent);

  return container;
}
```

#### Registering Views
Export from `src/views/index.js`:
```javascript
export { viewName } from './viewName.js';
```

Import in router:
```javascript
import * as views from '../views/index.js';
```

### Creating New Components

#### Location
Reusable components go in `src/components/`.

#### Component File Pattern
```javascript
export function ComponentName(props) {
  const element = document.createElement('div');
  element.className = 'component-styles';

  element.innerHTML = `
    <div class="content">${props.title}</div>
  `;

  // Event listeners
  element.addEventListener('click', () => {
    // Handle click
  });

  return element;
}
```

Export and import as needed:
```javascript
import { ComponentName } from '../components/componentName.js';
```

### State Management (src/store/index.js)

#### LocalStorage Keys
Use `ink_` prefix for all localStorage keys:
- `ink_lists` - User's favorite/reading lists
- `ink_current_user` - Current user object
- `ink_dark_mode` - Dark mode preference
- `ink_token` - JWT authentication token

#### Store Methods Pattern
```javascript
const store = {
  // Properties
  currentUser: null,
  darkMode: false,

  // Persistence
  saveLocal() {
    localStorage.setItem('ink_key', JSON.stringify(this.property));
  },

  // API methods
  async apiFetch(path, options = {}) {
    // Centralized fetch with token injection
  },

  // Resource methods
  async getResource() { return this.apiFetch('/api/resource'); },
  async createResource(data) {
    return this.apiFetch('/api/resource', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
```

### Router Conventions

#### Page Navigation
```javascript
// From HTML
onclick="router.navigate('page-name', {param: 'value'})"

// From JavaScript
router.navigate('work-detail', {id: work.id});
```

#### Route Naming
- Use kebab-case: `work-detail`, `author-login`, `edit-chapter`
- Protected routes should check authentication:
```javascript
case 'author-dashboard':
  if (!store.currentUser) {
    this.navigate('author-login');
    return;
  }
  view = await views.authorDashboard();
  break;
```

#### View Function Pattern
```javascript
// In views object
async workDetail(id) {
  const work = await store.getWorkById(id);
  if (!work) return components.notFound();

  const container = document.createElement('div');
  container.className = 'fade-in max-w-5xl mx-auto px-4 py-8';
  container.innerHTML = `...`;

  // Attach event listeners if needed
  container.querySelector('#some-button').addEventListener('click', handler);

  return container;
}
```

### Component Conventions

#### Component Function Pattern
```javascript
// In components object
workCard(work, isContinue = false, authorName = 'Unknown') {
  const div = document.createElement('div');
  div.className = 'bg-white dark:bg-slate-800 rounded-xl ...';
  div.onclick = () => router.navigate('work-detail', {id: work.id});
  div.innerHTML = `...`;
  return div;
}
```

#### Event Handlers
- Inline handlers for simple navigation: `onclick="router.navigate(...)"`
- Named functions for complex logic: `onclick="handleSubmit(event)"`
- Add event listeners in view functions for dynamic content

### Styling Guidelines

#### Tailwind Classes
- Use Tailwind utility classes as primary styling method
- Follow existing patterns for consistency
- Dark mode: Use `dark:` prefix for dark mode variants

#### Common Patterns
```
Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Card: bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700
Button (Primary): px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700
Button (Secondary): px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50
Input: block w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2
```

#### Custom CSS
- Keep custom CSS minimal in styles.css
- Use CSS variables for theme values:
```css
:root {
    --bg-color: #f8fafc;
    --text-color: #1e293b;
    --card-bg: #ffffff;
}
```

### Utility Functions

#### Toast Notifications
```javascript
showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  // ... show toast
}
```

#### Data Mapping
When API returns snake_case, map to camelCase in store:
```javascript
_mapWork(w) {
  return w ? {
    ...w,
    authorId: w.author_id,
    createdAt: w.created_at
  } : null;
}
```

---

## Security Guidelines

### Authentication
1. **Never** store passwords in plaintext
2. Always hash with bcryptjs (10 rounds minimum)
3. JWT tokens expire in 7 days
4. Store JWT in localStorage as `ink_token`
5. Include Authorization header: `Bearer ${token}`

### Input Sanitization
1. Use DOMPurify for all rich text content from Quill editor
2. Validate required fields before API calls
3. Escape HTML in user-generated content display

### Authorization
1. Check ownership on all update/delete operations
2. Validate `req.user.id` matches resource owner
3. Return 403 Forbidden (not 404) for unauthorized access to existing resources

### Error Handling
- **Never** expose internal errors to users
- Generic messages: "Server error", "Not found", "Unauthorized"
- Log detailed errors server-side: `console.error(err)`

---

## Database Guidelines

### Schema Conventions
- Primary keys: `id TEXT PRIMARY KEY` (UUID)
- Foreign keys: `<resource>_id` (e.g., `author_id`, `book_id`)
- Timestamps: `created_at TIMESTAMP WITH TIME ZONE DEFAULT now()`
- Naming: snake_case for columns and tables

### Table Relationships
```sql
FOREIGN KEY(author_id) REFERENCES authors(id) ON DELETE CASCADE
```

### JSON Fields
Store arrays as JSON strings:
```javascript
// Insertion
JSON.stringify(['tag1', 'tag2'])

// Retrieval
tags: row.tags ? JSON.parse(row.tags) : []
```

### Initialization
- Auto-create database if not exists (see db.js `ensureDatabaseExists()`)
- Auto-create tables on first run
- Seed demo data if empty

---

## PWA & Offline

### Service Worker
- Cache static assets (index.html, app.js, styles.css)
- Cache-first strategy for same-origin requests
- Update cache version when deploying: `CACHE_NAME = 'inkspace-v2'`

### Installation Prompt
```javascript
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    // Show install button
});
```

---

## Testing Accounts

Always maintain these demo accounts in seed data:
- **elena@inkspace.com** / password
- **marcus@inkspace.com** / password

---

## Common Patterns

### Async Operations
Always use async/await (not promises with .then):
```javascript
// Good
async function getData() {
  const data = await store.getWorks();
  return data;
}

// Avoid
function getData() {
  return store.getWorks().then(data => data);
}
```

### Error Boundaries
```javascript
try {
  const result = await someOperation();
  // success handling
} catch (err) {
  console.error(err);
  showToast(err.message, 'error');
}
```

### Form Handling
```javascript
async function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);

  try {
    await store.createResource(data);
    showToast('Created successfully');
    router.navigate('target-page');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
```

---

## Performance Best Practices

1. **Minimize DOM operations** - Build HTML strings, then assign once
2. **Lazy load** - Only fetch data when view is rendered
3. **Cache API responses** - Store in `store` object when appropriate
4. **Debounce search** - For global search input
5. **Optimize images** - Use appropriate sizes in cover URLs

---

## Git Workflow

### Commit Messages
Follow conventional commits:
```
feat: Add chapter bookmarking feature
fix: Resolve login redirect issue
docs: Update API documentation
refactor: Simplify router navigation logic
style: Format code with prettier
```

### Branch Strategy
- `main` - Production-ready code
- Feature branches: `feature/bookmark-system`
- Bug fixes: `fix/login-redirect`

---

## Environment Setup

### Development
```bash
# Start PostgreSQL
docker run --name storyhub-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:15

# Install dependencies
npm install

# Start server
npm start
```

### Production Considerations
1. Set `JWT_SECRET` environment variable (not default)
2. Use strong PostgreSQL credentials
3. Enable HTTPS
4. Set appropriate CORS origins
5. Add rate limiting middleware
6. Implement request logging
7. Set up database backups

---

## Code Review Checklist

- [ ] No SQL injection vulnerabilities (parameterized queries)
- [ ] No XSS vulnerabilities (DOMPurify used for rich text)
- [ ] Authentication required for protected routes
- [ ] Ownership validated for update/delete operations
- [ ] Error messages are user-friendly, not exposing internals
- [ ] Passwords are hashed (never stored plaintext)
- [ ] Database queries use transactions if multi-step
- [ ] Frontend code is properly scoped (no global pollution)
- [ ] Dark mode classes included where appropriate
- [ ] Mobile responsive (Tailwind responsive utilities)
- [ ] console.log statements removed (use console.error for errors only)

---

## Useful Commands

```bash
# Start development server
npm start

# Start static file server
npm run serve

# PostgreSQL connection
psql postgresql://postgres:postgres@localhost:5432/storyhub

# Check database
docker exec -it storyhub-db psql -U postgres -d storyhub

# View logs
docker logs storyhub-db
```

---

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Quill Editor](https://quilljs.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Questions or Issues?

When working on InkSpace:
1. Follow these guidelines for consistency
2. Update this document when patterns evolve
3. Ask for clarification before deviating from established patterns
4. Consider backwards compatibility with existing data

**Last Updated:** 2026-06-09
