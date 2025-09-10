# Trello Lite WIP

A lightweight Trello-like task board built with:

- **Frontend:** React + Vite + Mantine UI
- **Backend:** Flask + SQLite
- **Features:**
  - Multiple lists (columns), each with customizable color
  - Add, edit, toggle, and delete tasks inside lists
  - Delete entire lists with their tasks
  - Task counters (total, active, done)
  - Data persisted in SQLite via REST API
  - Auto-scrolling to the newest list

## Development

- Backend: `cd server && flask run` python app.py
- Frontend: `cd client && npm run dev`

## Status

Currently in **MVP / prototype** stage.  
Next steps: drag-and-drop, user accounts, better styling.
