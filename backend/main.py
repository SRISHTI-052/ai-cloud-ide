from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class CodeRequest(BaseModel):
    code: str

# Root endpoint (optional)
@app.get("/")
def root():
    return {"message": "AI Cloud IDE backend is running!"}

# AI suggestion endpoint (mock)
@app.post("/ai-suggest")
def ai_suggest(request: CodeRequest):
    code = request.code
    # Mock AI suggestion logic
    if "function" in code:
        suggestion = code + "\nconsole.log('AI suggestion here');"
    elif "def" in code:
        suggestion = code + "\nprint('AI suggestion here')"
    else:
        suggestion = code + "\n// AI suggestion here"
    return {"suggestion": suggestion}
