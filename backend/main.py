import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_actions import RESULT_KIND, SYSTEM_PROMPT, Action, build_prompt
from llm import LLMProvider, ProviderConfigError, create_provider
from storage import FileExists, FileMissing, Storage, storage_from_env

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Built at startup so an unknown LLM_PROVIDER fails fast. Real clients connect lazily.
llm_provider = create_provider()

def get_llm() -> LLMProvider:
    return llm_provider

class CodeRequest(BaseModel):
    code: str

@app.get("/")
def root():
    return {"message": "AI Cloud IDE backend is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ai-suggest")
def ai_suggest(request: CodeRequest, llm: LLMProvider = Depends(get_llm)):
    try:
        suggestion = llm.complete(
            "You are an AI coding assistant.",
            f"Improve this code:\n{request.code}",
            max_tokens=150,
        )
        return {"suggestion": suggestion}
    except ProviderConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print("ERROR in ai_suggest:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

class ActionRequest(BaseModel):
    action: Action
    code: str
    selection: str
    language: Optional[str] = None
    filename: Optional[str] = None

@app.post("/ai/action")
def ai_action(request: ActionRequest, llm: LLMProvider = Depends(get_llm)):
    if not request.selection.strip():
        raise HTTPException(status_code=422, detail="selection must not be empty")
    prompt = build_prompt(
        request.action, request.code, request.selection, request.language, request.filename
    )
    try:
        result = llm.complete(SYSTEM_PROMPT, prompt, max_tokens=1024)
    except ProviderConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print("ERROR in ai_action:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    return {"result": strip_code_fences(result), "kind": RESULT_KIND[request.action]}

def strip_code_fences(text: str) -> str:
    """Models sometimes wrap code in ``` fences despite instructions; remove a single outer pair."""
    stripped = text.strip()
    if stripped.startswith("```") and stripped.endswith("```") and stripped.count("```") == 2:
        first_newline = stripped.find("\n")
        if first_newline != -1:
            return stripped[first_newline + 1 : -3].rstrip("\n")
    return text

_storage = None

def get_storage() -> Storage:
    """Open the SQLite store on first use (path from DB_PATH, default backend/data/ide.db)."""
    global _storage
    if _storage is None:
        _storage = storage_from_env(os.getenv("DB_PATH"))
    return _storage

class FileCreate(BaseModel):
    filename: str
    content: str = ""

class FileUpdate(BaseModel):
    content: str

@app.get("/files")
def list_files(storage: Storage = Depends(get_storage)):
    return storage.list_files()

@app.get("/files/{filename}")
def get_file(filename: str, storage: Storage = Depends(get_storage)):
    try:
        return {"filename": filename, "content": storage.get_file(filename)}
    except FileMissing:
        raise HTTPException(status_code=404, detail="File not found")

@app.post("/files")
def create_file(file: FileCreate, storage: Storage = Depends(get_storage)):
    try:
        storage.create_file(file.filename, file.content)
    except FileExists:
        raise HTTPException(status_code=400, detail="File already exists")
    return {"message": f"{file.filename} created"}

@app.put("/files/{filename}")
def update_file(filename: str, file: FileUpdate, storage: Storage = Depends(get_storage)):
    try:
        storage.update_file(filename, file.content)
    except FileMissing:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": f"{filename} updated"}

@app.delete("/files/{filename}")
def delete_file(filename: str, storage: Storage = Depends(get_storage)):
    try:
        storage.delete_file(filename)
    except FileMissing:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": f"{filename} deleted"}
