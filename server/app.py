from flask import Flask, jsonify, request, g
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "todo.db"

app = Flask(__name__)

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(_):
    db = g.pop("db", None)
    if db: db.close()

def init_db():
    db = get_db()
    db.execute("""
            CREATE TABLE IF NOT EXISTS todos (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               title TEXT NOT NULL,
               done INTEGER NOT NULL DEFAULT 0,
               created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)
    db.commit()

@app.before_request
def ensure_db():
    init_db()

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.get("/api/todos")
def list_todos():
    db = get_db()
    rows = db.execute(
        "SELECT id, title, done, created_at FROM todos ORDER BY created_at DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/todos")
def create_todo():
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    db = get_db()
    cur = db.execute("INSERT INTO todos (title, done) VALUES (?, ?)", (title, 0))
    db.commit()
    new_id = cur.lastrowid
    row = db.execute(
        "SELECT id, title, done, created_at FROM todos WHERE id = ?", (new_id,)
    ).fetchone()
    return jsonify(dict(row)), 201

@app.patch("/api/todos/<int:todo_id>")
def update_todo(todo_id):
    data = request.get_json(force=True) or {}
    fields, values = [], []

    if "title" in data:
        fields.append("title = ?")
        values.append((data.get("title") or "").strip())

    if "done" in data:
        val = data.get("done")
        # tulkitaan kaikki truthy arvot ykköseksi
        done_val = 1 if val in (True, 1, "1", "true", "True") else 0
        fields.append("done = ?")
        values.append(done_val)

    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    values.append(todo_id)
    db = get_db()
    db.execute(f"UPDATE todos SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()

    row = db.execute(
        "SELECT id, title, done, created_at FROM todos WHERE id = ?",
        (todo_id,)
    ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))

@app.delete("/api/todos/<int:todo_id>")
def delete_todo(todo_id):
    db = get_db()
    cur = db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Not found"}), 404
    return '', 204

if __name__ == "__main__":
    app.run(debug=True)
