# AI-Powered Cloud IDE

A cloud-based, VS Code-inspired IDE that integrates **AI-powered code suggestions** using **OpenAI GPT-5**.  
Designed for developers to write, edit, and improve code with AI assistance in a seamless online environment.

---

## Features

- **Multiple File Support**: Manage, create, and switch between multiple files in your project.
- **AI-Powered Suggestions**: Improve your code or get help from GPT-5 with a single click.
- **Resizable Sidebar**: Drag the left sidebar to adjust the file explorer width.
- **Modern VS Code-Like UI**: Monaco Editor with dark theme for a familiar coding experience.
- **AI Output Panel**: View AI suggestions in a separate output panel.
- **Lightweight FastAPI Backend**: Handles AI requests securely using OpenAI API.

---

## Demo

![ai-powered-ide](docs/ai-powered-ide.drawio%20(1).png)

---

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.x
- OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
    git clone <repo_url>
    cd ai-cloud-ide
2. **Install backend dependencies**
    ```bash
    cd backend
    pip install -r requirements.txt
3. **Create a .env file in backend/**
   ```bash
   OPENAI_API_KEY=your_openai_api_key
4. **Start backend**
   ```bash
   uvicorn main:app --reload
5. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
6. **Start frontend**
    ```bash
    npm start
7. **Open the application in your browser:**
    ```bash
    http://localhost:3000

## How to Use

1. Navigate the **left sidebar** to open existing files or create new ones.
2. Write code in the **editor**.
3. Click **Get AI Suggestion** to improve or refactor your code.
4. Suggestions appear in the **output panel** and overwrite the current file content.
5. Resize the sidebar as needed for better workspace management.
6. Manage multiple files seamlessly and switch between them using **tabs** (if implemented).

## Collaboration

This project is open for contributions!

I am looking for collaborators to:

- Enhance AI suggestions (e.g., smarter code improvements)
- Improve UI/UX for a more VS Code-like experience
- Add new features like **diff view, version control, and collaborative editing**

If you want to contribute, **fork the repo and submit a pull request**.

---

## Tech Stack

- **Frontend**: React, Monaco Editor
- **Backend**: FastAPI
- **AI**: OpenAI GPT-5 API
- **Styling**: CSS, Dark VS Code-inspired theme

---

## Security & Notes

- All AI requests go through the backend for security.
- The IDE requires a valid OpenAI API Key.
- Currently, AI suggestions overwrite the file content (future versions may include a diff feature).


