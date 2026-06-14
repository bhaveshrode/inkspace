# InkSpace (Story-Hub)

InkSpace is a modern, maintainable full-stack web application for reading, writing, and discovering stories. It features a modular architecture with a PostgreSQL database, RESTful API using Express, and a bundled SPA frontend.

## Key Features
- **Dual Authentication System:** Separate authentication for authors and readers with distinct JWT tokens. Fixed bottom login bar provides clear access to both login options. Prevents dual login (reader + author simultaneously) to avoid session conflicts.
- **Reader Accounts:** Dedicated reader authentication system with bookmarks, reading history tracking, author following, and 1-5 star ratings. Readers can write detailed reviews, post comments on stories, and manage their personal reading library.
- **Reviews & Comments System:**
  - Readers can write comprehensive reviews with title, rating (1-5 stars), and detailed text (50-2000 characters)
  - One review per reader per book with edit/delete capabilities
  - "Helpful" voting system to highlight useful reviews (one vote per reader per review)
  - Comment system for quick feedback on books
  - **Two-way threaded reply system**: Authors and readers can reply to reviews and comments, enabling conversation
  - Authors can respond from their dashboard or the Book Reviews analytics page
- **Comprehensive Search System:**
  - **Multi-category search**: Books, Authors, Genres, and Tags with dedicated tabs
  - **Book Search**: Full-text search across titles and descriptions with cover thumbnails
  - **Author Search**: Search by author name or bio with profile avatars displayed
  - **Genre Search**: Browse books grouped by genre with visual genre cards
  - **Tag Search**: Discover books by tags with expandable book lists
  - **Real-time filtering**: Instant results as you type with query highlighting
  - **URL persistence**: Shareable search URLs with query and tab parameters
  - **Visual polish**: Profile images, book covers, and responsive card layouts
  - Enter key support and mobile-friendly search interface
- **Content Discovery System:**
  - **Trending This Week**: Most read stories with view-based ranking
  - **Highest Rated**: Books with 4.0+ star ratings and minimum 3 ratings
  - **Recently Updated**: Stories with new chapters published in last 30 days
  - **Completed Stories**: Finished tales ready for binge reading
  - **Most Followed Authors**: Top authors by follower count with book statistics
  - Parallel data loading for optimal performance
  - Curated home page with multiple discovery sections
  - Visual icons and color coding for each discovery category
- **Reader Experience:** Browse trending stories, customize reading themes and font sizes, bookmark chapters, follow authors, write reviews and comments with threaded discussions, and download works as PDFs.
- **Author Portal:** Secure JWT-based authentication allows authors to publish works using a rich Quill editor, manage drafts, track reading statistics, view review analytics, and engage with readers through replies.
- **Author Analytics:**
  - Comprehensive review statistics dashboard (total reviews, average rating, rating breakdown)
  - Book Reviews page with filtering (by star rating) and sorting (newest, oldest, highest/lowest rating, most helpful)
  - Recent comments section in dashboard with reply functionality
  - Rating analytics view showing all ratings for each book
- **Professional Author Profiles:**
  - Banner image with gradient overlay for visual appeal
  - Large circular avatar with verified badge (1000+ followers)
  - Comprehensive statistics: total works, followers, total reads, weighted average rating
  - Dynamic achievement badges: Popular Author (1000+ followers), Prolific Writer (10+ works), Highly Rated (4.5+ stars), Best Seller (100k+ views)
  - Social media integration: Website, Twitter, Instagram, Facebook, LinkedIn, GitHub links
  - Recent activity section with activity status indicator (Very Active/Active/Moderately Active/Inactive)
  - Publishing frequency tracking and last 3 published works display
  - Profile editing modal for authors to update bio, avatar, banner, location, and social links
  - Follow/unfollow button for readers with real-time follower count updates
  - Published works grid with cover images and ratings
- **Real-time Notifications:**
  - Database-driven notification system with 30-second polling
  - Notification bell with unread count badge
  - Authors receive notifications for: new followers, new ratings, new comments, comment replies
  - Readers receive notifications for: new chapters from followed authors, author replies, comment replies
  - Click-to-navigate: notifications take you directly to relevant content
  - Automatic tab switching and smooth scrolling to context
  - Separate notification streams for authors and readers
- **RESTful API:** A fully secured Node.js backend using Express that handles structured interactions with the PostgreSQL database.
- **Data Security:** Passwords are cryptographically hashed using `bcryptjs`. Separate JWT tokens for authors and readers. Mutating API endpoints are protected with strict authorization checks and ownership validation.
- **Rate Limiting:** Comprehensive rate limiting protection against brute force attacks and API abuse:
  - **Authentication endpoints**: 5 login attempts per 15 minutes per IP
  - **Registration endpoints**: 3 signups per hour per IP
  - **Password reset requests**: 3 requests per hour per IP
  - **General API reads**: 100 requests per minute per IP
  - **API write operations**: 30 requests per minute per IP
  - Automatic response headers showing remaining requests and reset time
  - Protection against password guessing, spam account creation, and API flooding
- **Password Reset Flow:** Secure password recovery system for both authors and readers:
  - Forgot password links on all login pages
  - Secure token generation using crypto.randomBytes (256-bit entropy)
  - Time-limited tokens with 1-hour expiry
  - One-time use tokens (marked as used after successful reset)
  - Rate limiting prevents abuse (3 requests per hour per IP)
  - Email enumeration protection (always returns success message)
  - Token validation before allowing password reset
  - Client and server-side password validation (minimum 6 characters)
  - Automatic cleanup of old unused tokens
  - Development mode logs reset URLs to console for testing
- **Offline Capabilities:** Uses a Service Worker (`sw.js`) to provide offline caching and PWA installation.

## Tech Stack
- **Frontend:** Vanilla JavaScript (ES6 modules), Vite bundler, HTML5, CSS (Tailwind)
- **Backend:** Node.js, Express.js (ES6 modules)
- **Database:** PostgreSQL (`pg`)
- **Security:** JSON Web Tokens (JWT), `bcryptjs`, `express-rate-limit`
- **Build System:** Vite for development and production builds

## Project Structure

```
inkspace/
├── index.html             # HTML entry point (Vite serves this at /)
├── server/                # Backend code (ES6 modules)
│   ├── index.js           # Main server entry point
│   ├── routes/            # API route handlers
│   │   ├── index.js       # Health check routes
│   │   ├── authors.js     # Author auth & management
│   │   ├── readers.js     # Reader auth & management
│   │   ├── books.js       # Book CRUD operations (includes review/comment replies)
│   │   ├── chapters.js    # Chapter management
│   │   ├── user.js        # User interactions (follows, bookmarks)
│   │   ├── interactions.js # Reader interactions (bookmarks, history, follows, ratings, reviews, comments, replies)
│   │   └── notifications.js # Notification system routes
│   ├── middleware/        # Express middleware
│   │   ├── auth.js        # JWT authentication
│   │   └── rateLimiter.js # Rate limiting configuration
│   └── db/                # Database layer
│       ├── index.js       # DB connection & initialization
│       └── models/        # Data access layer
│           ├── authors.js
│           ├── readers.js
│           ├── books.js
│           ├── chapters.js
│           ├── ratings.js
│           ├── reviews.js         # Review CRUD operations
│           ├── comments.js        # Comment CRUD operations
│           ├── reviewReplies.js   # Review reply operations
│           ├── commentReplies.js  # Comment reply operations
│           ├── notifications.js   # Notification CRUD operations
│           └── interactions.js
├── src/                   # Frontend source (bundled by Vite)
│   ├── main.js            # Application entry point
│   ├── router/            # SPA routing
│   │   └── index.js
│   ├── store/             # State management & API client
│   │   └── index.js
│   ├── views/             # Page components (14 files)
│   │   ├── home.js
│   │   ├── workDetail.js
│   │   ├── read.js
│   │   ├── authorProfile.js
│   │   ├── authorLogin.js
│   │   ├── authorDashboard.js
│   │   ├── bookReviews.js      # Review analytics page for authors
│   │   ├── readerLogin.js
│   │   ├── readerSignup.js
│   │   ├── readerDashboard.js
│   │   ├── addWork.js
│   │   ├── manageWork.js
│   │   ├── editChapter.js
│   │   ├── searchResults.js
│   │   └── index.js       # View exports
│   ├── components/        # Reusable UI components
│   │   ├── workCard.js
│   │   ├── ratingStars.js
│   │   ├── reviewCard.js       # Review display with reply functionality
│   │   ├── reviewForm.js       # Review creation/editing form
│   │   ├── replyThread.js      # Threaded conversation component
│   │   ├── notificationBell.js # Notification bell with dropdown
│   │   ├── notFound.js
│   │   └── toast.js
│   └── utils/             # Utility functions (for future use)
├── public/                # Static assets (served at /public/)
│   ├── styles.css         # Custom CSS
│   └── sw.js              # Service Worker for PWA
├── dist/                  # Production build output (generated by Vite)
├── vite.config.js         # Vite bundler configuration
├── package.json           # Dependencies & scripts
├── CLAUDE.md              # Development guidelines
└── README.md              # This file
```

**Note:** The `index.html` file is at the project root (standard Vite convention). Static assets like CSS and Service Worker files are in the `public/` directory and served at `/public/` URLs.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- A running PostgreSQL instance (e.g., via Docker)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd inkspace
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start a local PostgreSQL database:**
   ```bash
   docker run --name storyhub-db \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 -d postgres:15
   ```

4. **Development mode (recommended):**
   ```bash
   npm run dev
   ```
   This starts both the backend server (port 3000) and Vite dev server (port 5173) concurrently.
   - Backend API: http://localhost:3000
   - Frontend: http://localhost:5173

5. **Production mode:**
   ```bash
   # Build frontend
   npm run build

   # Start server (serves built files from dist/)
   npm start
   ```
   Access the app at http://localhost:3000

### Database Configuration

The application automatically creates the `storyhub` database and seeds it with demo content if it doesn't exist.

Default connection: `postgresql://postgres:postgres@localhost:5432/storyhub`

To use a different database, set the `DATABASE_URL` environment variable:
```bash
DATABASE_URL=postgresql://user:pass@host:port/dbname npm start
```

### Demo Accounts

The auto-seeder initializes demo accounts for testing:

**Author Accounts:**
- **elena@inkspace.com** / password
- **marcus@inkspace.com** / password

**Reader Accounts:**
- **reader1@inkspace.com** / password (Alex Reader)
- **reader2@inkspace.com** / password (Sam Bookworm)
- **reader3@inkspace.com** / password (Jordan Pages)

## NPM Scripts

- `npm run dev` - Start development environment (backend + Vite dev server)
- `npm run dev:server` - Start backend server only
- `npm run dev:client` - Start Vite dev server only
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build locally
- `npm start` - Start production server

## API Overview

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/authors` - List all authors (used for author search with client-side filtering)
- `GET /api/authors/:id` - Get author details
- `GET /api/readers/:id` - Get reader profile (public)
- `GET /api/books` - List all published books (supports filtering: status, sortBy, limit; used for book/genre/tag search with client-side filtering)
- `GET /api/books/:id` - Get book details with chapters
- `GET /api/books/:id/comments` - Get book comments
- `POST /api/authors` - Register new author
- `POST /api/authors/login` - Authenticate and receive JWT (token: ink_token)
- `POST /api/readers` - Register new reader
- `POST /api/readers/login` - Authenticate and receive JWT (token: ink_reader_token)

### Discovery Endpoints (Public)
- `GET /api/books/discover/trending` - Trending books (most views, top 20)
- `GET /api/books/discover/highest-rated` - Highest rated books (4.0+ stars, min 3 ratings, top 20)
- `GET /api/books/discover/recently-updated` - Recently updated books (new chapters in last 30 days, top 20)
- `GET /api/books/discover/completed` - Completed stories (status='completed', top 20)
- `GET /api/authors/discover/most-followed` - Most followed authors (by follower count, top 20)

### Protected Author Endpoints (require Authorization: Bearer <ink_token>)
- `PUT /api/authors/profile` - Update author profile (name, bio, avatar, banner, location, website, social links)
- `GET /api/authors/statistics` - Get author's comprehensive statistics (total works, followers, views, weighted average rating)
- `POST /api/books` - Publish a new book
- `PUT /api/books/:id` - Update book details
- `DELETE /api/books/:id` - Delete a book
- `POST /api/books/:id/chapters` - Add new chapter
- `PUT /api/books/:id/chapters/:idx` - Update chapter
- `DELETE /api/books/:id/chapters/:idx` - Delete chapter
- `POST /api/follows` - Follow/unfollow author (legacy)
- `POST /api/bookmarks` - Bookmark chapter (legacy)
- `POST /api/reading` - Record reading progress (legacy)
- `GET /api/users/:id/follows` - Get user's followed authors (legacy)
- `GET /api/users/:id/bookmarks` - Get user's bookmarks (legacy)
- `GET /api/users/:id/reading` - Get reading history (legacy)

### Protected Reader Endpoints (require Authorization: Bearer <ink_reader_token>)
- `GET /api/readers/me` - Get current reader details
- `GET /api/interactions/bookmarks` - Get reader's bookmarks with book details
- `POST /api/interactions/bookmarks` - Toggle bookmark for a book
- `DELETE /api/interactions/bookmarks/:bookId` - Remove bookmark
- `GET /api/interactions/bookmarks/:bookId` - Check if book is bookmarked
- `GET /api/interactions/history` - Get reading history with book/chapter details
- `POST /api/interactions/history` - Record reading progress
- `DELETE /api/interactions/history/:bookId` - Clear history for a book
- `GET /api/interactions/follows` - Get followed authors with details
- `POST /api/interactions/follow/:authorId` - Toggle follow for an author
- `DELETE /api/interactions/follow/:authorId` - Unfollow an author
- `GET /api/interactions/follow/:authorId` - Check if following an author
- `GET /api/interactions/ratings/:bookId` - Get ratings for a book (includes average)
- `GET /api/interactions/ratings/:bookId/user` - Get current reader's rating for a book
- `POST /api/interactions/ratings` - Create or update rating (1-5 stars)
- `DELETE /api/interactions/ratings/:bookId` - Delete rating

### Review & Comment Endpoints

**Public (no auth required):**
- `GET /api/interactions/reviews/:bookId` - Get all reviews for a book
- `GET /api/interactions/comments/:bookId` - Get all comments for a book
- `GET /api/interactions/reviews/:reviewId/replies` - Get replies to a review
- `GET /api/interactions/comments/:commentId/replies` - Get replies to a comment

**Reader Authenticated (require Authorization: Bearer <ink_reader_token>):**
- `POST /api/interactions/reviews` - Create or update review (one per book)
- `DELETE /api/interactions/reviews/:reviewId` - Delete own review
- `POST /api/interactions/reviews/:reviewId/helpful` - Mark review as helpful
- `POST /api/interactions/comments` - Post a comment on a book
- `POST /api/interactions/reviews/:reviewId/replies` - Reply to a review
- `DELETE /api/interactions/reviews/:reviewId/replies/:replyId` - Delete own reply
- `POST /api/interactions/comments/:commentId/replies` - Reply to a comment
- `DELETE /api/interactions/comments/:commentId/replies/:replyId` - Delete own reply

**Author Authenticated (require Authorization: Bearer <ink_token>):**
- `GET /api/books/:bookId/reviews` - Get detailed reviews with statistics for author's book
- `GET /api/books/:bookId/ratings` - Get all ratings for author's book
- `POST /api/books/:id/reviews/:reviewId/replies` - Author replies to review on their book
- `DELETE /api/books/:id/reviews/:reviewId/replies/:replyId` - Delete own reply
- `POST /api/books/:id/comments/:commentId/replies` - Author replies to comment on their book
- `DELETE /api/books/:id/comments/:commentId/replies/:replyId` - Delete own reply

### Notification Endpoints (Dual Authentication)

These endpoints work for both authors (ink_token) and readers (ink_reader_token):

- `GET /api/notifications` - Get paginated notifications (limit, offset query params)
- `GET /api/notifications/unread-count` - Get count of unread notifications
- `POST /api/notifications/:id/read` - Mark single notification as read
- `POST /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete a notification

**Notification Types:**
- `new_follower` - Reader followed author
- `new_rating` - Reader rated author's book
- `new_comment` - Reader commented on author's book
- `comment_reply` - Someone replied to a comment
- `new_chapter` - Author published new chapter (sent to followers)
- `milestone` - Achievement notification (future use)

*Note: Authors and readers use separate authentication tokens stored in different localStorage keys.*

## Development Guidelines

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines including:
- Code organization principles
- API conventions
- Database patterns
- Frontend architecture
- Security best practices
- Testing standards

## Migration from Legacy Structure

The project has been restructured from a monolithic single-file architecture to a modular system for better maintainability. Legacy files (`app.js`, `server.js`, `db.js`) are kept for reference but are deprecated. All new development should use the new modular structure under `server/` and `src/` directories.

## Contributing

1. Follow the coding guidelines in CLAUDE.md
2. Use ES6 module syntax (import/export)
3. Maintain separation of concerns (routes, models, views)
4. Test both API endpoints and UI functionality
5. Ensure backwards compatibility with existing data

## License

MIT
