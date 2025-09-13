import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    code: str

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

@app.get("/")
def root():
    return {"message": "AI Cloud IDE backend is running with GPT!"}

@app.post("/ai-suggest")
def ai_suggest(request: CodeRequest):
    try:
        code = request.code
        response = client.chat.completions.create(
            model="gpt-4o-mini",  
            messages=[
                {"role": "system", "content": "You are an AI coding assistant."},
                {"role": "user", "content": f"Improve this code:\n{code}"}
            ],
            max_tokens=150
        )
        suggestion = response.choices[0].message.content
        return {"suggestion": suggestion}
    except Exception as e:
        # Log and return error
        print("❌ ERROR in ai_suggest:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
