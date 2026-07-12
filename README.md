# OpticSite

STATUS: PROTOTYPE (SQLite Backend Integrated)

A web-based Optical Practice Management System providing basic CRUD operations for patient and customer information.

## Tech Stack & Tools

* **Frontend:** Vanilla HTML, CSS, and JavaScript.
* **Backend:** **FastAPI** (Python 3.12) serving API routes and static frontend files.
* **Database:** **SQLite**, storing all data locally inside `opticsite.db` in the project root.
* **Task/Tool Runner:** **Mise** for managing the local Python environment.

---

## Running Locally

Follow these steps to set up the environment and run the application locally.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Mise](https://mise.jdx.dev/) (used to install and manage the correct Python version).

### 2. Local Setup

1. **Install Python via Mise:**
   Navigate to the project root and run:
   ```bash
   mise install
   ```
   This will install Python 3.12 as configured in `mise.toml`.

2. **Create a Virtual Environment:**
   Initialize a local Python virtual environment to manage dependencies:
   ```bash
   python -m venv .venv
   ```

3. **Install Dependencies:**
   Install FastAPI, Uvicorn, and other packages required by the backend:
   ```bash
   .venv/bin/pip install -r requirements.txt
   ```

### 3. Run the Development Server

Start the local FastAPI application server:
```bash
mise run start
```
This runs the Uvicorn ASGI server in reload mode (reloads automatically on file changes) binding to `http://127.0.0.1:8000`.

### 4. Accessing the Application

Open your browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

* **Access Passcode:** To unlock the app on launch. *Sabi ni Mark, chat mo siya."
