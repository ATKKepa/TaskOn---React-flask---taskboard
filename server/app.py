from flask import Flask, jsonify, request, g
import os, hashlib, mimetypes
from werkzeug.utils import secure_filename
from flask import send_file, abort
from db import init_files_table
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "todo.db"
BASE_DIR = Path(__file__).parent / "uploaded_files"
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTS = {".txt", ".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".pptx"}
ALLOWED_MIME = {"text/plain", "application/pdf", "image/png", "image/jpeg",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"
               }

MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH



# ------------------------
# DB helperit
# ------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

def _sha256_bytes(buf: bytes) -> str:
    return hashlib.sha256(buf).hexdigest()

def _detect_mime(filename: str, fallback: str) -> str:
    guessed = mimetypes.guess_type(filename)[0]
    return guessed or fallback or "application/octet-stream"


@app.teardown_appcontext
def close_db(_):
    db = g.pop("db", None)
    if db:
        db.close()

def get_inbox_id(db: sqlite3.Connection) -> int:
    row = db.execute("SELECT id FROM lists WHERE name = ?", ("Inbox",)).fetchone()
    if row:
        return int(row["id"])
    db.commit()
    return

def get_notepad_id(db: sqlite3.Connection) -> int:
    row = db.execute("SELECT id FROM lists WHERE name = ?", ("Notepad",)).fetchone()
    if row:
        return int(row["id"])
    db.commit()
    return 

def init_db():
    db = get_db()
    db.execute("PRAGMA foreign_keys = ON")
    inbox_id = get_inbox_id(db)
    notepad_id = get_notepad_id(db)
    db.execute("UPDATE todos SET list_id = ? WHERE list_id IS NULL", (inbox_id,))
    init_files_table(db)
    db.commit()

    db.execute("""
      CREATE TABLE IF NOT EXISTS lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    """)

    db.execute("""
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        list_id INTEGER REFERENCES lists(id)
      );
    """)

    # migraatiot vanhaan kantaan
    cols_todos = [r[1] for r in db.execute("PRAGMA table_info(todos)")]
    if "list_id" not in cols_todos:
        db.execute("ALTER TABLE todos ADD COLUMN list_id INTEGER REFERENCES lists(id)")

    cols_lists = [r[1] for r in db.execute("PRAGMA table_info(lists)")]
    if "color" not in cols_lists:
        db.execute("ALTER TABLE lists ADD COLUMN color TEXT")

    # oletuslista & nollaa listattomat inboxiin
    inbox_id = get_inbox_id(db)
    db.execute("UPDATE todos SET list_id = ? WHERE list_id IS NULL", (inbox_id,))
    init_files_table(db)
    db.commit()
    

@app.before_request
def ensure_db():
    init_db()

    

# ------------------------
# Yleiset
# ------------------------
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

# ------------------------
# TODOS (yleiset reitit)
# ------------------------
@app.get("/api/todos")
def list_todos():
    db = get_db()
    rows = db.execute(
        "SELECT id, title, done, created_at, list_id FROM todos ORDER BY created_at DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/todos")
def create_todo():
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    db = get_db()
    inbox_id = get_inbox_id(db)
    cur = db.execute(
        "INSERT INTO todos (title, done, list_id) VALUES (?, ?, ?)",
        (title, 0, inbox_id),
    )
    db.commit()
    new_id = cur.lastrowid
    row = db.execute(
        "SELECT id, title, done, created_at, list_id FROM todos WHERE id = ?",
        (new_id,),
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
        done_val = 1 if val in (True, 1, "1", "true", "True") else 0
        fields.append("done = ?")
        values.append(done_val)

    # mahdollistaa kortin siirron listasta toiseen
    if "list_id" in data and data.get("list_id") is not None:
        fields.append("list_id = ?")
        values.append(int(data.get("list_id")))

    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    values.append(todo_id)
    db = get_db()
    db.execute(f"UPDATE todos SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()

    row = db.execute(
        "SELECT id, title, done, created_at, list_id FROM todos WHERE id = ?",
        (todo_id,),
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
    return "", 204

# ------------------------
# LISTAT
# ------------------------
@app.get("/api/lists")
def list_lists():
    db = get_db()
    rows = db.execute(
        "SELECT id, name, position, color, created_at FROM lists ORDER BY position, id"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/lists")
def create_list():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    color = (data.get("color") or "").strip() or "#fffbe6"
    if not name:
        return jsonify({"error": "Name is required"}), 400

    db = get_db()
    cur = db.execute(
        "INSERT INTO lists (name, position, color) VALUES (?, ?, ?)",
        (name, 0, color),
    )
    db.commit()
    new_id = cur.lastrowid
    row = db.execute(
        "SELECT id, name, position, color, created_at FROM lists WHERE id = ?",
        (new_id,),
    ).fetchone()
    return jsonify(dict(row)), 201

@app.patch("/api/lists/<int:list_id>")
def update_list(list_id):
    data = request.get_json(force=True) or {}

    fields = []
    vals = []

    if "name" in data:
        fields.append("name = ?")
        vals.append((data.get("name") or "").strip())

    if "position" in data:
        fields.append("position = ?")
        vals.append(int(data.get("position") or 0))

    if "color" in data:
        fields.append("color = ?")
        vals.append((data.get("color") or "").strip())

    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    vals.append(list_id)
    db = get_db()
    db.execute(f"UPDATE lists SET {', '.join(fields)} WHERE id = ?", vals)
    db.commit()

    row = db.execute(
        "SELECT id, name, position, color, created_at FROM lists WHERE id = ?",
        (list_id,),
    ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))

@app.delete("/api/lists/<int:list_id>")
def delete_list(list_id):
    db = get_db()
    db.execute("DELETE FROM todos WHERE list_id = ?", (list_id,))
    cur = db.execute("DELETE FROM lists WHERE id = ?", (list_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Not found"}), 404
    return "", 204

# ------------------------
# TODOS listakohtaisesti
# ------------------------
@app.get("/api/lists/<int:list_id>/todos")
def list_todos_in_list(list_id):
    db = get_db()
    rows = db.execute(
        "SELECT id, title, done, created_at, list_id "
        "FROM todos WHERE list_id = ? ORDER BY created_at DESC",
        (list_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/lists/<int:list_id>/todos")
def create_todo_for_list(list_id):
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    db = get_db()
    cur = db.execute(
        "INSERT INTO todos (title, done, list_id) VALUES (?, ?, ?)",
        (title, 0, list_id),
    )
    db.commit()
    new_id = cur.lastrowid
    row = db.execute(
        "SELECT id, title, done, created_at, list_id FROM todos WHERE id = ?",
        (new_id,),
    ).fetchone()
    return jsonify(dict(row)), 201



# ------------------------
# FILES
# ------------------------

@app.post("/api/files")
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file or not file.filename.strip():
        return jsonify({"error": "Invalid filename"}), 400

    safe_name = secure_filename(file.filename)
    ext = os.path.splitext(safe_name)[1].lower()
    if ext not in ALLOWED_EXTS:
        return jsonify({"error": f"Extension not allowed: {ext}"}), 415

    buf = file.read()
    if not buf:
        return jsonify({"error": "Empty file"}), 400

    checksum = _sha256_bytes(buf)
    mime = _detect_mime(safe_name, file.mimetype)
    if mime not in ALLOWED_MIME:
        return jsonify({"error": f"Unsupported MIME: {mime}"}), 415

    size = len(buf)
    disk_name = f"{checksum[:16]}_{safe_name}"
    disk_path = UPLOAD_DIR / disk_name

    if not disk_path.exists():
        with open(disk_path, "wb") as out:
            out.write(buf)

    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO files (name, mime, size, path, checksum) VALUES (?, ?, ?, ?, ?)",
            (safe_name, mime, size, str(disk_path), checksum),
        )
        db.commit()
        file_id = cur.lastrowid
    except sqlite3.IntegrityError:
        row = db.execute("SELECT id FROM files WHERE checksum=?", (checksum,)).fetchone()
        file_id = int(row["id"]) if row else None

    return jsonify({
        "ok": True, "id": file_id, "name": safe_name, "mime": mime, "size": size, "checksum": checksum
    }), 201


@app.get("/api/files")
def list_files():
    rows = get_db().execute(
        "SELECT id, name, mime, size, checksum, created_at FROM files ORDER BY created_at DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/files/<int:file_id>")
def download_file(file_id: int):
    row = get_db().execute(
        "SELECT name, mime, size, path, checksum FROM files WHERE id=?", (file_id,)
    ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404

    etag = row["checksum"]
    if request.headers.get("If-None-Match") == etag:
        return ("", 304)

    resp = send_file(
        row["path"],
        mimetype=row["mime"],
        as_attachment=True,
        download_name=row["name"],
        conditional=True,
    )
    resp.headers["ETag"] = etag
    resp.headers["Content-Length"] = str(row["size"])
    return resp


@app.delete("/api/files/<int:file_id>")
def delete_file(file_id: int):
    db = get_db()
    row = db.execute("SELECT path FROM files WHERE id=?", (file_id,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404

    path = row["path"]
    db.execute("DELETE FROM files WHERE id=?", (file_id,))
    db.commit()
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
    return "", 204


#------------------------
#NOTEPAD
#------------------------


@app.get("/api/notepad")
def notepad_list():
    db = get_db()
    notepad_id = get_notepad_id(db)
    rows = db.execute(
        "SELECT id, title, done, created_at, list_id FROM todos WHERE list_id=? ORDER BY created_at DESC",
        (notepad_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/notepad")
def notepad_create():
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    db = get_db()
    notepad_id = get_notepad_id(db)
    cur = db.execute(
        "INSERT INTO todos (title, done, list_id) VALUES (?, ?, ?)",
        (title, 0, notepad_id),
    )
    db.commit()
    row = db.execute(
        "SELECT id, title, done, created_at, list_id FROM todos WHERE id=?",
        (cur.lastrowid,),
    ).fetchone()
    return jsonify(dict(row)), 201



if __name__ == "__main__":
    app.run(debug=True)



