import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import List, Optional

DEFAULT_DB_PATH = Path(__file__).parent / "data" / "ide.db"
DEFAULT_PROJECT = "default"

# Seeded into the default project the first time it is created.
SAMPLE_FILES = {
    "App.js": "// Sample App.js content",
    "index.js": "// Sample index.js content",
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS files (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, filename)
);
"""


class FileExists(Exception):
    pass


class FileMissing(Exception):
    pass


class Storage:
    """SQLite-backed file store. Opens a short-lived connection per operation,
    which keeps it safe to use from FastAPI's threadpool."""

    def __init__(self, db_path, project: str = DEFAULT_PROJECT):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(SCHEMA)
            row = conn.execute("SELECT id FROM projects WHERE name = ?", (project,)).fetchone()
            if row is None:
                self.project_id = conn.execute(
                    "INSERT INTO projects (name) VALUES (?)", (project,)
                ).lastrowid
                conn.executemany(
                    "INSERT INTO files (project_id, filename, content) VALUES (?, ?, ?)",
                    [(self.project_id, name, content) for name, content in SAMPLE_FILES.items()],
                )
            else:
                self.project_id = row[0]

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("PRAGMA foreign_keys = ON")
            yield conn
            conn.commit()
        finally:
            conn.close()

    def list_files(self) -> List[str]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT filename FROM files WHERE project_id = ? ORDER BY rowid",
                (self.project_id,),
            ).fetchall()
        return [r[0] for r in rows]

    def get_file(self, filename: str) -> str:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT content FROM files WHERE project_id = ? AND filename = ?",
                (self.project_id, filename),
            ).fetchone()
        if row is None:
            raise FileMissing(filename)
        return row[0]

    def create_file(self, filename: str, content: str = "") -> None:
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO files (project_id, filename, content) VALUES (?, ?, ?)",
                    (self.project_id, filename, content),
                )
        except sqlite3.IntegrityError:
            raise FileExists(filename)

    def update_file(self, filename: str, content: str) -> None:
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE files SET content = ?, updated_at = CURRENT_TIMESTAMP "
                "WHERE project_id = ? AND filename = ?",
                (content, self.project_id, filename),
            )
        if cur.rowcount == 0:
            raise FileMissing(filename)

    def delete_file(self, filename: str) -> None:
        with self._connect() as conn:
            cur = conn.execute(
                "DELETE FROM files WHERE project_id = ? AND filename = ?",
                (self.project_id, filename),
            )
        if cur.rowcount == 0:
            raise FileMissing(filename)


def storage_from_env(env_value: Optional[str]) -> Storage:
    return Storage(env_value or DEFAULT_DB_PATH)
