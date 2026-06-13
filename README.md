# Library Manager

A personal library tracking app built with **Node.js**, **Express**, and **SQL** (via sql.js). Track books you own, are reading, or want to read — and organise them into custom shelves.

Built as a portfolio project to demonstrate proficiency in **OOP**, **JavaScript**, and **SQL**.

---

## Features

- Add, edit, and delete books with title, author, genre, year, and reading status
- Filter books by status (Want to Read / Reading / Read) or search by title/author
- Create and delete custom shelves
- Add books to shelves and remove them
- Live stats bar showing total, read, reading, and want-to-read counts
- Data persisted to a local SQL file (`library.db`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Server | Express |
| Database | SQL via sql.js |
| Frontend | Vanilla JS, HTML, CSS |

---

## Project Structure

```
library-manager/
├── package.json
├── library.db               ← auto-created on first run
│
├── src/
│   ├── server.js            ← Express entry point
│   ├── models/
│   │   ├── Book.js          ← Book class
│   │   └── Shelf.js         ← Shelf class
│   ├── db/
│   │   └── LibraryDB.js     ← Repository class (all SQL)
│   └── routes/
│       ├── books.js         ← /api/books endpoints
│       └── shelves.js       ← /api/shelves endpoints
│
└── public/                  ← Static files served by Express
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js           ← LibraryAPI class (fetch wrapper)
        └── app.js           ← App class (UI controller)
```

---

## Getting Started

**Prerequisites:** Node.js v18+

```bash
# Clone the repo
git clone https://github.com/your-username/library-manager.git
cd library-manager

# Install dependencies
npm install

# Start the server
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

For development with auto-restart on file changes:

```bash
npm run dev
```

---

## API Reference

### Books

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/books` | Get all books (supports `?status=`, `?genre=`, `?search=`) |
| `GET` | `/api/books/stats` | Get read/reading/want-to-read counts |
| `GET` | `/api/books/:id` | Get a single book |
| `POST` | `/api/books` | Add a book |
| `PUT` | `/api/books/:id` | Update a book |
| `DELETE` | `/api/books/:id` | Delete a book |

### Shelves

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/shelves` | Get all shelves |
| `POST` | `/api/shelves` | Create a shelf |
| `DELETE` | `/api/shelves/:id` | Delete a shelf |
| `GET` | `/api/shelves/:id/books` | Get books on a shelf |
| `POST` | `/api/shelves/:id/books` | Add a book to a shelf |
| `DELETE` | `/api/shelves/:id/books/:bookId` | Remove a book from a shelf |

---

## OOP Design

The project uses object-oriented principles throughout:

**`Book`** — Encapsulates book data with validation, a static factory method (`Book.fromRow`), and a serialisation method (`toRecord`). Throws on invalid status or missing required fields.

**`Shelf`** — Encapsulates shelf data and composes a collection of `Book` objects internally. Exposes `addBook`, `getBooks`, and a `bookCount` getter.

**`LibraryDB`** — Repository pattern. All SQL is isolated here; models have zero knowledge of the database. Wraps sql.js with clean methods (`addBook`, `getAllBooks`, `deleteShelf`, etc.) and persists the in-memory database to disk after every write.

**`LibraryAPI`** (frontend) — Static class used as a fetch wrapper and API namespace. Centralises all HTTP calls so the UI never constructs raw `fetch` calls directly.

**`App`** (frontend) — Stateful UI controller class. Owns view state, handles navigation between views, and coordinates all DOM rendering and event binding.

---

## SQL Highlights

- **Many-to-many** relationship between `books` and `shelves` via a `shelf_items` junction table
- **`ON DELETE CASCADE`** on `shelf_items` so deleting a shelf automatically cleans up its entries
- **`INSERT OR IGNORE`** when adding a book to a shelf to silently prevent duplicates
- **Dynamic query building** in `getAllBooks` for composable filtering by status, genre, and search term
- **Aggregate queries** with `SUM(CASE WHEN ...)` for the stats bar