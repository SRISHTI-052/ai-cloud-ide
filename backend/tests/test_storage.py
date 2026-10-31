import sqlite3

import pytest

from storage import FileExists, FileMissing, Storage, storage_from_env


def test_new_db_is_seeded_with_sample_files(tmp_path):
    store = Storage(tmp_path / "ide.db")
    assert store.list_files() == ["App.js", "index.js"]


def test_seed_only_happens_once(tmp_path):
    store = Storage(tmp_path / "ide.db")
    store.delete_file("App.js")
    assert Storage(tmp_path / "ide.db").list_files() == ["index.js"]


def test_projects_are_isolated(tmp_path):
    a = Storage(tmp_path / "ide.db", project="a")
    b = Storage(tmp_path / "ide.db", project="b")
    a.create_file("only_a.js", "")
    assert "only_a.js" not in b.list_files()


def test_schema_has_project_id(tmp_path):
    Storage(tmp_path / "ide.db")
    conn = sqlite3.connect(tmp_path / "ide.db")
    cols = [r[1] for r in conn.execute("PRAGMA table_info(files)")]
    conn.close()
    assert "project_id" in cols


def test_errors(tmp_path):
    store = Storage(tmp_path / "ide.db")
    with pytest.raises(FileExists):
        store.create_file("App.js")
    with pytest.raises(FileMissing):
        store.get_file("nope")
    with pytest.raises(FileMissing):
        store.update_file("nope", "")
    with pytest.raises(FileMissing):
        store.delete_file("nope")


def test_db_path_from_env_value(tmp_path):
    path = tmp_path / "nested" / "custom.db"
    store = storage_from_env(str(path))
    assert store.db_path == path
    assert path.exists()
