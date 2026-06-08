# Story-Hub (InkSpace)

Story-Hub is a modern full-stack web application for reading, writing, and discovering stories. It features a robust PostgreSQL database, a secure RESTful API using Express and JWT authentication, and a dynamic single-page application (SPA) frontend.

## Key Features
- **Reader Experience:** Browse trending stories, customize reading themes and font sizes, bookmark chapters, follow authors, and download works as PDFs.
- **Author Portal:** Secure JWT-based authentication allows authors to publish works using a rich Quill editor, manage drafts, and track reading statistics.
- **RESTful API:** A fully secured Node.js backend using Express that handles structured interactions with the PostgreSQL database.
- **Data Security:** Passwords are cryptographically hashed using `bcryptjs`. Mutating API endpoints are protected with strict authorization checks and ownership validation.
- **Offline Capabilities:** Uses a basic Service Worker (`sw.js`) to provide offline caching and PWA installation.

## Tech Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS (Tailwind styled layout)
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (`pg`)
- **Security:** JSON Web Tokens (JWT), `bcryptjs`

## Getting Started

### Prerequisites
- Node.js installed
- A running PostgreSQL instance (e.g., via Docker)

### Installation & Setup
1. Clone or navigate to the repository:
   ```powershell
   cd D:\B_Projects\Story-Hub
   ```
2. Install backend dependencies:
   ```powershell
   npm install
   ```
3. Start a local Postgres database. You can easily do this via Docker:
   ```powershell
   docker run --name storyhub-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
   ```
4. Start the server:
   ```powershell
   npm start
   ```

*Note: The application is configured to automatically create the `storyhub` database and seed it with demo content if it does not already exist. It connects to `postgresql://postgres:postgres@localhost:5432/storyhub` by default. You can override this by setting the `DATABASE_URL` environment variable.*

### Demo Accounts
The auto-seeder will initialize the database with two authors. You can use these to test the author portal:
- **elena@inkspace.com** / password
- **marcus@inkspace.com** / password

## API Highlights
- `GET /api/books` - Retrieve all published books
- `POST /api/authors/login` - Authenticate and receive a JWT
- `POST /api/books` - (Protected) Publish a new book
- `PUT /api/books/:id/chapters/:idx` - (Protected) Modify an existing chapter
- `POST /api/follows` - (Protected) Follow an author

*All protected routes require an `Authorization: Bearer <token>` header to be sent with the request.*
