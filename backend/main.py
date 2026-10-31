from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from llm import LLMProvider, ProviderConfigError, create_provider

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

file_store = {
    "App.js": "// Sample App.js content",
    "index.js": "// Sample index.js content"
}

class FileCreate(BaseModel):
    filename: str
    content: str = ""

class FileUpdate(BaseModel):
    content: str

@app.get("/files")
def list_files():
    return list(file_store.keys())

@app.get("/files/{filename}")
def get_file(filename: str):
    if filename not in file_store:
        raise HTTPException(status_code=404, detail="File not found")
    return {"filename": filename, "content": file_store[filename]}

@app.post("/files")
def create_file(file: FileCreate):
    if file.filename in file_store:
        raise HTTPException(status_code=400, detail="File already exists")
    file_store[file.filename] = file.content
    return {"message": f"{file.filename} created"}

@app.put("/files/{filename}")
def update_file(filename: str, file: FileUpdate):
    if filename not in file_store:
        raise HTTPException(status_code=404, detail="File not found")
    file_store[filename] = file.content
    return {"message": f"{filename} updated"}

@app.delete("/files/{filename}")
def delete_file(filename: str):
    if filename not in file_store:
        raise HTTPException(status_code=404, detail="File not found")
    del file_store[filename]
    return {"message": f"{filename} deleted"}

