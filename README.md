# TaskOn

TaskOn is a full-stack productivity workspace that pairs a Flask API with a React + Mantine UI frontend. Organize tasks in draggable boards, keep quick notes, and stash project assets in the built-in file gallery—all backed by a lightweight SQLite database.

> 💡 **Why it matters:** I built TaskOn to demonstrate end-to-end product thinking—real-time drag-and-drop UX, resilient persistence layers, and a polished developer experience. The result is a project that’s ready to deploy and easy to extend.

## Recruiter-Friendly Highlights

- **Production-grade UX:** Responsive Mantine UI, smooth dnd-kit workflows, empty states, optimistic updates, and accessible interactions.
- **Robust backend:** Flask service with migration safety net, idempotent file handling, checksum de-duplication, and optimized SQL queries.
- **Clean architecture:** Shared contracts via `api.ts`, typed React components, and separation between board logic, notepad features, and gallery uploads.
- **Deployment ready:** Environment-driven config, SQLite migrations, and a README that documents setup, API, and deployment strategy.
- **Extensible roadmap:** Hooks for multi-user support, real-time notifications (Pusher/WebSockets), granular permissions, and tagging/filters.

---

## Preview

![TaskOn Quick Tour](docs/taskon-fast.gif)

> Tip: drop your fast GIF at `docs/taskon-fast.gif` (or update the path above) to keep the README self-contained.

- **Full walkthrough (40 s):** [Watch the extended demo](https://example.com/taskon-full-demo) – replace the link with your hosted MP4/GIF (Loom, YouTube, GitHub asset, etc.).

## Features

- **Boards & Todos** – Create multiple lists with custom colors, add tasks, edit titles inline, and delete items or entire lists.
- **Drag-and-Drop** – Reorder tasks within a list or move them across lists using dnd-kit with smooth auto-scroll support.
- **Notepad** – Quick jot area for lightweight todos that can be promoted into boards later.
- **File Gallery** – Upload, preview, download, and delete reference files (PDF, PNG/JPG, DOCX/XLSX/PPTX, ZIP/RAR, and more).
- **Statistics** – Summary card highlighting the total number of tracked tasks at a glance.
- **Auto Seeding & Migrations** – On startup the API creates default lists, applies schema migrations, and backfills positions to keep data consistent.

## Tech Stack

| Layer        | Tech                                                      |
| ------------ | --------------------------------------------------------- |
| Frontend     | React, Vite, TypeScript, Mantine UI, dnd-kit              |
| Backend      | Flask, Werkzeug, SQLite                                   |
| Styling      | Mantine theming + custom components                       |
| Tooling      | Vite dev server/build, npm (or pnpm), Python virtualenv   |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ (npm or pnpm)
- (Recommended) `virtualenv` or `venv` for Python

### Backend Setup

```bash
cd server
python -m venv .venv
.\.venv\Scripts\activate        # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
flask --app app run --debug
```

The API listens on `http://127.0.0.1:5000` by default. It creates `todo.db` and runs migrations automatically on first launch.

### Frontend Setup

```bash
cd client
npm install          # or pnpm install
npm run dev
```

Open the Vite dev server (usually `http://127.0.0.1:5173`). API requests are proxied to the Flask backend—update `vite.config.ts` if your backend runs elsewhere.

## Project Structure

```
todo-crud-flask/
├─ client/                 # React application
│  ├─ src/
│  │  ├─ components/
│  │  ├─ helpers/
│  │  ├─ api.ts
│  │  └─ App.tsx
│  └─ public/
└─ server/                 # Flask application
   ├─ app.py
   ├─ db.py
   ├─ requirements.txt
   └─ uploaded_files/
```

## API Highlights

All endpoints are served under `/api`.

| Method | Endpoint                              | Description                                    |
| ------ | -------------------------------------- | ---------------------------------------------- |
| GET    | `/api/lists`                          | Fetch visible lists/boards                     |
| POST   | `/api/lists`                          | Create a new list                              |
| PATCH  | `/api/lists/<id>`                     | Update list name, color, or position           |
| DELETE | `/api/lists/<id>`                     | Delete list and its todos                      |
| GET    | `/api/lists/<list_id>/todos`          | Fetch todos within a list                      |
| POST   | `/api/lists/<list_id>/todos`          | Create todo in list                            |
| POST   | `/api/lists/<list_id>/todos/reorder`  | Persist order of todos for a list              |
| PATCH  | `/api/todos/<todo_id>`                | Update todo (title, done, move list)           |
| DELETE | `/api/todos/<todo_id>`                | Delete a todo                                  |
| GET    | `/api/notepad`                        | Retrieve notepad entries                       |
| POST   | `/api/notepad`                        | Add notepad entry                              |
| POST   | `/api/files`                          | Upload file                                    |
| GET    | `/api/files`                          | List uploaded files                            |
| GET    | `/api/files/<file_id>`                | Download file                                  |
| DELETE | `/api/files/<file_id>`                | Remove uploaded file                           |

See `server/app.py` for full route definitions and validation rules.

## Development Notes

- Drag-and-drop behavior lives in `client/src/components/WorkspaceDnD.tsx`.
- File type allowlists (extensions and MIME types) are defined near the top of `server/app.py`.
- The backend runs lightweight migrations and data backfills on every request via `init_db()` and `backfill_data()`.
- Summary statistics and UI widgets reside in `client/src/components/SummaryCard.tsx` and related components.

## Testing & Quality

Add your preferred tooling—for example:

```bash
# Frontend linting (configure ESLint)
npm run lint

# Backend tests (add pytest and tests/)
pytest
```

## Deployment Checklist

1. Build the frontend: `cd client && npm run build`.
2. Serve the compiled assets (e.g., via Vite preview, Nginx, or Flask static hosting).
3. Run the Flask app behind a production WSGI server (Gunicorn, uWSGI) and reverse proxy.
4. Configure environment variables (`FLASK_ENV`, upload paths, secrets, etc.).
5. Set up persistent storage for `todo.db` and `uploaded_files/uploads`.

## Demo & Visuals

- **Live demo:** _Deploy-ready_ – connect the Flask API to any static hosting platform (Render, Fly.io, Railway, etc.).
- **Screen recording:** _Coming soon_ – short Loom/GIF showcasing drag-and-drop, file uploads, and notepad flows.
- **Screenshot pack:** Exported high-res boards + gallery views for portfolios or case studies.

If you’d like a tailored walkthrough, reach out—happy to share a video overview or live demo.

## License

This project is released under the [MIT License](LICENSE). Contributions and forks are welcome!

---

Crafted with Mantine gradients, Flask routes, and a healthy respect for organized boards—and the engineering craftsmanship that keeps them running.
