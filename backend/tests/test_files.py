def test_list_files(client):
    res = client.get("/files")
    assert res.status_code == 200
    assert set(res.json()) == {"App.js", "index.js"}


def test_get_file(client):
    res = client.get("/files/App.js")
    assert res.status_code == 200
    assert res.json()["filename"] == "App.js"


def test_get_missing_file(client):
    assert client.get("/files/nope.js").status_code == 404


def test_create_file(client):
    res = client.post("/files", json={"filename": "new.py", "content": "print(1)"})
    assert res.status_code == 200
    assert client.get("/files/new.py").json()["content"] == "print(1)"


def test_create_duplicate_file(client):
    res = client.post("/files", json={"filename": "App.js"})
    assert res.status_code == 400


def test_update_file(client):
    res = client.put("/files/App.js", json={"content": "updated"})
    assert res.status_code == 200
    assert client.get("/files/App.js").json()["content"] == "updated"


def test_update_missing_file(client):
    assert client.put("/files/nope.js", json={"content": "x"}).status_code == 404


def test_delete_file(client):
    assert client.delete("/files/App.js").status_code == 200
    assert "App.js" not in client.get("/files").json()


def test_delete_missing_file(client):
    assert client.delete("/files/nope.js").status_code == 404


def test_files_persist_across_restart(client, storage):
    client.post("/files", json={"filename": "keep.py", "content": "x = 1"})
    client.put("/files/App.js", json={"content": "edited"})

    # A new Storage on the same DB file simulates a server restart.
    from storage import Storage

    reopened = Storage(storage.db_path)
    assert "keep.py" in reopened.list_files()
    assert reopened.get_file("keep.py") == "x = 1"
    assert reopened.get_file("App.js") == "edited"
