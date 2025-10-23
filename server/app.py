from flask import Flask, jsonify, request, g
import os, hashlib, mimetypes
from werkzeug.utils import secure_filename
from flask import send_file, abort
from db import init_files_table
import sqlite3
from pathlib import Path

# ------------------------
# Constants and Configuration
# ------------------------
DB_PATH = Path(__file__).parent / "todo.db"
BASE_DIR = Path(__file__).parent / "uploaded_files"
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTS = {".txt", ".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".pptx", ".zip", ".rar"}
ALLOWED_MIME = {"text/plain", "application/pdf", "image/png", "image/jpeg",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/zip",
                "application/x-zip-compressed",
                "application/vnd.rar",
                "application/x-rar-compressed",
               }

MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# ------------------------
# Database Helpers
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
    cur = db.execute(
        "INSERT INTO lists (name, position, color, is_hidden) VALUES (?, ?, ?, ?)",
        ("Notepad", 1, "#e6fffb", 1),
    )
    db.commit()
    return int(cur.lastrowid)


def fetch_list_id(db, name: str) -> int | None:
    row = db.execute("SELECT id FROM lists WHERE name = ?", (name,)).fetchone()
    return int(row["id"]) if row else None

# ------------------------
# Database Initialization and Migration
# ------------------------
def init_db():
    db = get_db()
    db.execute("PRAGMA foreign_keys = ON")
    migrate_schema(db)
    backfill_data(db)
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

def ensure_default_lists_once(db):
    cnt = db.execute("SELECT COUNT(*) AS c FROM lists").fetchone()["c"]
    if cnt == 0:
        db.execute(
            "INSERT INTO lists (name, position, color, is_hidden) VALUES (?, ?, ?, ?)",
            ("Inbox", 0, "#fffbe6", 0),
        )
        db.execute(
            "INSERT INTO lists (name, position, color, is_hidden) VALUES (?, ?, ?, ?)",
            ("Notepad", 1, "#e6fffb", 1), 
        )
        db.commit()


def migrate_schema(db):
    db.execute("""
      CREATE TABLE IF NOT EXISTS lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_hidden INTEGER NOT NULL DEFAULT 0
      );
    """)
    db.execute("""
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        list_id INTEGER REFERENCES lists(id),
        position INTEGER NOT NULL DEFAULT 0
      );
    """)

    cols_lists = [r[1] for r in db.execute("PRAGMA table_info(lists)")]
    if "color" not in cols_lists:
        db.execute("ALTER TABLE lists ADD COLUMN color TEXT")
    if "is_hidden" not in cols_lists:
        db.execute("ALTER TABLE lists ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0")

    cols_todos = [r[1] for r in db.execute("PRAGMA table_info(todos)")]
    if "list_id" not in cols_todos:
        db.execute("ALTER TABLE todos ADD COLUMN list_id INTEGER REFERENCES lists(id)")
    if "position" not in cols_todos:
        db.execute("ALTER TABLE todos ADD COLUMN position INTEGER NOT NULL DEFAULT 0")

    db.commit()

def backfill_data(db):
    ensure_default_lists_once(db)

    dirty = False
    null_cnt = db.execute("SELECT COUNT(*) AS c FROM todos WHERE list_id IS NULL").fetchone()["c"]
    if null_cnt > 0:
        inbox_id = fetch_list_id(db, "Inbox")
        if inbox_id is None:
            db.execute(
                "INSERT INTO lists (name, position, color) VALUES (?, ?, ?)",
                ("Inbox", 0, "#fffbe6"),
            )
            db.execute("UPDATE lists SET is_hidden = 1 WHERE name = 'Notepad'")
            db.commit()
            inbox_id = fetch_list_id(db, "Inbox")
        db.execute("UPDATE todos SET list_id = ? WHERE list_id IS NULL", (inbox_id,))
        dirty = True

    list_ids = [int(r["id"]) for r in db.execute("SELECT id FROM lists").fetchall()]
    for lid in list_ids:
        rows = db.execute(
            "SELECT id, position FROM todos WHERE list_id = ? ORDER BY position ASC",
            (lid,),
        ).fetchall()
        positions = [r["position"] for r in rows]
        needs_fix = any(p is None for p in positions)
        if not needs_fix:
            expected = list(range(len(positions)))
            needs_fix = sorted(positions) != expected
        if not needs_fix:
            continue

        dirty = True
        rows = db.execute(
            "SELECT id FROM todos WHERE list_id = ? ORDER BY created_at DESC, id DESC",
            (lid,),
        ).fetchall()
        for pos, r in enumerate(rows):
            db.execute("UPDATE todos SET position = ? WHERE id = ?", (pos, int(r["id"])))

    if dirty:
        db.commit()

def get_or_create_notepad_id(db: sqlite3.Connection) -> int:
    row = db.execute("SELECT id FROM lists WHERE name = 'Notepad'").fetchone()
    if row:
        return int(row["id"])
    cur = db.execute(
        "INSERT INTO lists (name, position, color, is_hidden) VALUES (?, ?, ?, ?)",
        ("Notepad", 1, "#e6fffb", 1),
    )
    db.commit()
    return int(cur.lastrowid)



@app.before_request
def ensure_db():
    init_db()

# ------------------------
# General Routes
# ------------------------
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

# ------------------------
# Todo Routes (General)
# ------------------------
@app.get("/api/todos")
def list_todos():
    db = get_db()
    rows = db.execute(
    "SELECT id, title, done, created_at, list_id, position "
    "FROM todos ORDER BY list_id, position ASC, created_at DESC"
).fetchall()
    return jsonify([dict(r) for r in rows])

@app.post("/api/todos")
def create_todo():
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    db = get_db()
    inbox_id = fetch_list_id(db, "Inbox")
    if inbox_id is None:
        ensure_default_lists_once(db)
        inbox_id = fetch_list_id(db, "Inbox")

    db.execute("UPDATE todos SET position = position + 1 WHERE list_id = ?", (inbox_id,))
    cur = db.execute(
        "INSERT INTO todos (title, done, list_id, position) VALUES (?, ?, ?, 0)",
        (title, 0, inbox_id),
    )
    db.commit()
    row = db.execute(
        "SELECT id, title, done, created_at, list_id, position FROM todos WHERE id = ?",
        (cur.lastrowid,),
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
# List Routes
# ------------------------
@app.get("/api/lists")
def list_lists():
    db = get_db()
    rows = db.execute(
        "SELECT id, name, position, color, created_at "
        "FROM lists WHERE COALESCE(is_hidden, 0) = 0 "
        "ORDER BY position, id"
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
# Todo Routes (List-Specific)
# ------------------------
@app.get("/api/lists/<int:list_id>/todos")
def list_todos_in_list(list_id):
    db = get_db()
    rows = db.execute(
        "SELECT id, title, done, created_at, list_id, position "
        "FROM todos WHERE list_id = ? ORDER BY position ASC, created_at DESC",
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
    db.execute("UPDATE todos SET position = position + 1 WHERE list_id = ?", (list_id,))
    cur = db.execute(
        "INSERT INTO todos (title, done, list_id, position) VALUES (?, ?, ?, 0)",
        (title, 0, list_id),
    )
    db.commit()
    row = db.execute(
        "SELECT id, title, done, created_at, list_id, position FROM todos WHERE id = ?",
        (cur.lastrowid,),
    ).fetchone()
    return jsonify(dict(row)), 201


@app.post("/api/lists/<int:list_id>/todos/reorder")
def reorder_todos_in_list(list_id: int):
    data = request.get_json(force=True) or {}
    order = data.get("order") or []
    if not isinstance(order, list):
        return jsonify({"error": "order must be an array"}), 400
    try:
        payload_ids = [int(x) for x in order]
    except Exception:
        return jsonify({"error": "order must contain integers"}), 400

    db = get_db()
    rows = db.execute("SELECT id FROM todos WHERE list_id = ?", (list_id,)).fetchall()
    existing_ids = [int(r["id"]) for r in rows]

    # Suodata payloadista pois vieraiden listojen ID:t, lisää puuttuvat perään
    filtered = [i for i in payload_ids if i in existing_ids]
    rest = [i for i in existing_ids if i not in filtered]
    final = filtered + rest

    for pos, todo_id in enumerate(final):
        db.execute("UPDATE todos SET position = ? WHERE id = ?", (pos, todo_id))
    db.commit()
    return jsonify({"ok": True})



# ------------------------
# File Routes
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

# ------------------------
# Notepad Routes
# ------------------------
@app.get("/api/notepad")
def notepad_list():
    db = get_db()
    notepad_id = get_or_create_notepad_id(db)
    rows = db.execute(
        "SELECT id, title, done, created_at, list_id, position "
        "FROM todos WHERE list_id = ? ORDER BY position ASC, created_at DESC",
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
    notepad_id = get_or_create_notepad_id(db)

    db.execute("UPDATE todos SET position = position + 1 WHERE list_id = ?", (notepad_id,))
    cur = db.execute(
        "INSERT INTO todos (title, done, list_id, position) VALUES (?, ?, ?, 0)",
        (title, 0, notepad_id),
    )
    db.commit()
    row = db.execute(
        "SELECT id, title, done, created_at, list_id, position FROM todos WHERE id=?",
        (cur.lastrowid,),
    ).fetchone()
    return jsonify(dict(row)), 201



# ------------------------
# Test Routes
# ------------------------

@app.get("/api/debug/db-path")
def debug_db_path():
    return jsonify({"db_path": str(DB_PATH.resolve())})

# ------------------------
# Admin 
# ------------------------

@app.post("/api/admin/hide-notepad")
def admin_hide_notepad():
    db = get_db()
    # varmista sarake
    cols = [r[1] for r in db.execute("PRAGMA table_info(lists)")]
    if "is_hidden" not in cols:
        db.execute("ALTER TABLE lists ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0")
        db.commit()

    # luo Notepad jos puuttuu, PIILOTETTUNA
    row = db.execute("SELECT id FROM lists WHERE lower(name)='notepad'").fetchone()
    if not row:
        db.execute(
            "INSERT INTO lists (name, position, color, is_hidden) VALUES (?, ?, ?, ?)",
            ("Notepad", 1, "#e6fffb", 1),
        )
        db.commit()
    else:
        db.execute("UPDATE lists SET is_hidden=1 WHERE lower(name)='notepad'")
        db.commit()

    # palauta pieni status + käytössä oleva DB-polku
    db_path = (Path(__file__).parent / "todo.db").resolve()
    return jsonify({"ok": True, "db_path": str(db_path)})


# ------------------------
# Main Execution
# ------------------------
if __name__ == "__main__":
    app.run(debug=True)
