/**
 * app.js — UI controller.
 * Demonstrates OOP: App class owns state and coordinates views.
 */
class App {
  constructor() {
    this.currentView   = 'books';
    this.editingBookId = null;
    this.currentShelf  = null;

    this._bindNav();
    this._bindBooks();
    this._bindShelves();
    this._bindModal();

    this.loadBooks();
    this.loadStats();
  }

  // ── Navigation ─────────────────────────────────────────

  _bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._showView(btn.dataset.view);
      });
    });
  }

  _showView(name) {
    this.currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${name}`).classList.add('active');
    if (name === 'shelves') this.loadShelves();
  }

  // ── Stats ──────────────────────────────────────────────

  async loadStats() {
    const s = await LibraryAPI.getStats();
    document.getElementById('stat-total').textContent   = s.total;
    document.getElementById('stat-read').textContent    = s.read;
    document.getElementById('stat-reading').textContent = s.reading;
    document.getElementById('stat-want').textContent    = s.want_to_read;
  }

  // ── Books ──────────────────────────────────────────────

  _bindBooks() {
    let debounce;
    document.getElementById('search').addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this.loadBooks(), 300);
    });
    document.getElementById('filter-status').addEventListener('change', () => this.loadBooks());
    document.getElementById('open-add-book').addEventListener('click', () => this._openAddBook());
  }

  async loadBooks() {
    const params = {};
    const search = document.getElementById('search').value.trim();
    const status = document.getElementById('filter-status').value;
    if (search) params.search = search;
    if (status) params.status = status;

    const books = await LibraryAPI.getBooks(params);
    this._renderBooks(books, 'books-grid');
  }

  _renderBooks(books, containerId, shelfId = null) {
    const grid = document.getElementById(containerId);
    if (!books.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📖</div><p>No books here yet.</p></div>`;
      return;
    }
    grid.innerHTML = books.map(b => this._bookCardHTML(b, shelfId)).join('');

    grid.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => this._openEditBook(Number(btn.dataset.id)));
    });
    grid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._deleteBook(Number(btn.dataset.id)));
    });
    grid.querySelectorAll('.btn-remove-shelf').forEach(btn => {
      btn.addEventListener('click', () =>
        this._removeFromShelf(Number(btn.dataset.shelf), Number(btn.dataset.id)));
    });
    grid.querySelectorAll('.btn-add-shelf').forEach(btn => {
      btn.addEventListener('click', () => this._openAddToShelf(Number(btn.dataset.id)));
    });
  }

  _bookCardHTML(b, shelfId) {
    const statusLabel = { 'read': 'Read', 'reading': 'Reading', 'want-to-read': 'Want to Read' };
    return `
      <div class="book-card" data-status="${b.status}">
        <div class="book-card-spine"></div>
        <div class="book-title">${b.title}</div>
        <div class="book-author">${b.author}</div>
        <div class="book-meta">
          <span class="badge badge-${b.status}">${statusLabel[b.status]}</span>
          ${b.genre ? `<span class="badge badge-genre">${b.genre}</span>` : ''}
          ${b.year  ? `<span class="badge" style="background:#f5f5f5;color:#666">${b.year}</span>` : ''}
        </div>
        <div class="book-actions">
          <button class="btn-sm btn-edit" data-id="${b.id}">Edit</button>
          ${shelfId
            ? `<button class="btn-sm btn-danger btn-remove-shelf" data-id="${b.id}" data-shelf="${shelfId}">Remove</button>`
            : `<button class="btn-sm btn-add-shelf" data-id="${b.id}" title="Add to shelf">+ Shelf</button>
               <button class="btn-sm btn-danger btn-delete" data-id="${b.id}">Delete</button>`
          }
        </div>
      </div>`;
  }

  _openAddBook() {
    this.editingBookId = null;
    this._openModal('Add Book', this._bookFormHTML());
    this._bindBookForm();
  }

  async _openEditBook(id) {
    const books = await LibraryAPI.getBooks();
    const book  = books.find(b => b.id === id);
    if (!book) return;
    this.editingBookId = id;
    this._openModal('Edit Book', this._bookFormHTML(book));
    this._bindBookForm();
  }

  _bookFormHTML(b = {}) {
    return `
      <div class="form-group">
        <label>Title *</label>
        <input id="f-title" value="${b.title || ''}" placeholder="e.g. The Name of the Wind" />
      </div>
      <div class="form-group">
        <label>Author *</label>
        <input id="f-author" value="${b.author || ''}" placeholder="e.g. Patrick Rothfuss" />
      </div>
      <div class="form-group">
        <label>Genre</label>
        <input id="f-genre" value="${b.genre || ''}" placeholder="e.g. Fantasy" />
      </div>
      <div class="form-group">
        <label>Year</label>
        <input id="f-year" type="number" value="${b.year || ''}" placeholder="e.g. 2007" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="f-status">
          <option value="want-to-read" ${b.status === 'want-to-read' ? 'selected' : ''}>Want to Read</option>
          <option value="reading"      ${b.status === 'reading'      ? 'selected' : ''}>Reading</option>
          <option value="read"         ${b.status === 'read'         ? 'selected' : ''}>Read</option>
        </select>
      </div>
      <p class="error-msg" id="form-error"></p>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="form-submit">${this.editingBookId ? 'Save Changes' : 'Add Book'}</button>
      </div>`;
  }

  _bindBookForm() {
    document.getElementById('modal-cancel').addEventListener('click', () => this._closeModal());
    document.getElementById('form-submit').addEventListener('click', () => this._submitBookForm());
  }

  async _submitBookForm() {
    const data = {
      title:  document.getElementById('f-title').value,
      author: document.getElementById('f-author').value,
      genre:  document.getElementById('f-genre').value,
      year:   document.getElementById('f-year').value,
      status: document.getElementById('f-status').value,
    };
    try {
      if (this.editingBookId) {
        await LibraryAPI.updateBook(this.editingBookId, data);
      } else {
        await LibraryAPI.addBook(data);
      }
      this._closeModal();
      this.loadBooks();
      this.loadStats();
    } catch (err) {
      document.getElementById('form-error').textContent = err.message;
    }
  }

  async _deleteBook(id) {
    if (!confirm('Delete this book?')) return;
    await LibraryAPI.deleteBook(id);
    this.loadBooks();
    this.loadStats();
  }

  // ── Shelves ────────────────────────────────────────────

  _bindShelves() {
    document.getElementById('open-add-shelf').addEventListener('click', () => this._openAddShelf());
    document.getElementById('back-to-shelves').addEventListener('click', () => {
      document.getElementById('shelf-detail').classList.add('hidden');
      document.getElementById('shelves-list').style.display = '';
      document.querySelector('.toolbar').style.display = '';
    });
  }

  async loadShelves() {
    const shelves = await LibraryAPI.getShelves();
    const list = document.getElementById('shelves-list');
    if (!shelves.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🗂️</div><p>No shelves yet. Create one!</p></div>`;
      return;
    }
    list.innerHTML = shelves.map(s => `
      <div class="shelf-card" data-id="${s.id}">
        <div class="shelf-name">${s.name}</div>
        ${s.description ? `<div class="shelf-desc">${s.description}</div>` : ''}
        <div class="shelf-card-footer">
          <div class="shelf-count">${s.bookCount_ || 0} book${s.bookCount_ !== 1 ? 's' : ''}</div>
          <button class="btn-delete-shelf" data-id="${s.id}" title="Delete shelf">✕</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('.shelf-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-delete-shelf')) return; // don't open on delete click
        this._openShelf(Number(card.dataset.id), shelves);
      });
    });

    list.querySelectorAll('.btn-delete-shelf').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this shelf? Books inside won\'t be deleted.')) return;
        await LibraryAPI.deleteShelf(Number(btn.dataset.id));
        this.loadShelves();
      });
    });
  }

  async _openShelf(id, shelves) {
    this.currentShelf = shelves.find(s => s.id === id);
    document.getElementById('shelves-list').style.display = 'none';
    document.querySelector('.toolbar').style.display = 'none';

    const detail = document.getElementById('shelf-detail');
    detail.classList.remove('hidden');
    document.getElementById('shelf-detail-name').textContent = this.currentShelf.name;
    document.getElementById('shelf-detail-desc').textContent = this.currentShelf.description || '';

    const books = await LibraryAPI.getBooksOnShelf(id);
    this._renderBooks(books, 'shelf-books-grid', id);
  }

  async _removeFromShelf(shelfId, bookId) {
    await LibraryAPI.removeBookFromShelf(shelfId, bookId);
    const books = await LibraryAPI.getBooksOnShelf(shelfId);
    this._renderBooks(books, 'shelf-books-grid', shelfId);
  }

  async _openAddToShelf(bookId) {
    const shelves = await LibraryAPI.getShelves();
    if (!shelves.length) {
      alert('No shelves yet — create one first!');
      return;
    }
    const options = shelves.map(s =>
      `<option value="${s.id}">${s.name}</option>`
    ).join('');

    this._openModal('Add to Shelf', `
      <div class="form-group">
        <label>Choose a shelf</label>
        <select id="f-shelf-select">${options}</select>
      </div>
      <p class="error-msg" id="form-error"></p>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="form-submit">Add to Shelf</button>
      </div>`);

    document.getElementById('modal-cancel').addEventListener('click', () => this._closeModal());
    document.getElementById('form-submit').addEventListener('click', async () => {
      try {
        const shelfId = Number(document.getElementById('f-shelf-select').value);
        await LibraryAPI.addBookToShelf(shelfId, bookId);
        this._closeModal();
      } catch (err) {
        document.getElementById('form-error').textContent = err.message;
      }
    });
  }

  _openAddShelf() {
    this._openModal('New Shelf', `
      <div class="form-group">
        <label>Name *</label>
        <input id="f-shelf-name" placeholder="e.g. Favourites" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <input id="f-shelf-desc" placeholder="Optional description" />
      </div>
      <p class="error-msg" id="form-error"></p>
      <div class="modal-actions">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="form-submit">Create Shelf</button>
      </div>`);

    document.getElementById('modal-cancel').addEventListener('click', () => this._closeModal());
    document.getElementById('form-submit').addEventListener('click', async () => {
      try {
        await LibraryAPI.addShelf({
          name:        document.getElementById('f-shelf-name').value,
          description: document.getElementById('f-shelf-desc').value,
        });
        this._closeModal();
        this.loadShelves();
      } catch (err) {
        document.getElementById('form-error').textContent = err.message;
      }
    });
  }

  // ── Modal helpers ──────────────────────────────────────

  _bindModal() {
    document.getElementById('modal-close').addEventListener('click', () => this._closeModal());
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) this._closeModal();
    });
  }

  _openModal(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  _closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => new App());