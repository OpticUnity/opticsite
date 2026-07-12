import os
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

DB_FILE = "opticsite.db"

app = FastAPI(title="OpticSite Backend")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize SQLite database and the storage table
def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS storage (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    # Seed default version if empty
    cursor.execute("SELECT 1 FROM storage WHERE key = 'version'")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO storage (key, value) VALUES ('version', '0.1-emr')")
    conn.commit()
    conn.close()

init_db()

# Pydantic models for request bodies
class StorageItem(BaseModel):
    value: str

class BulkStorage(BaseModel):
    data: dict[str, str]

# --- API Endpoints ---

@app.get("/api/storage")
def get_all_storage():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM storage")
        rows = cursor.fetchall()
        conn.close()
        return {row["key"]: row["value"] for row in rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/storage/{key}")
def get_storage_item(key: str):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM storage WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row is None:
            raise HTTPException(status_code=404, detail="Key not found")
        return {"value": row["value"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/storage/{key}")
def set_storage_item(key: str, item: StorageItem):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO storage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, item.value)
        )
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/storage-bulk")
def set_storage_bulk(payload: BulkStorage):
    try:
        conn = get_db()
        cursor = conn.cursor()
        # Using a transaction for bulk insert
        cursor.execute("BEGIN TRANSACTION")
        # Overwrite all keys with the bulk payload
        cursor.execute("DELETE FROM storage")
        for key, value in payload.data.items():
            cursor.execute(
                "INSERT INTO storage (key, value) VALUES (?, ?)",
                (key, value)
            )
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/storage/{key}")
def delete_storage_item(key: str):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM storage WHERE key = ?", (key,))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/storage-clear")
def clear_storage():
    try:
        conn = get_db()
        cursor = conn.cursor()
        # Clear everything except the version key
        cursor.execute("DELETE FROM storage WHERE key != 'version'")
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Serve Static Frontend Files ---

@app.get("/")
async def read_index():
    return FileResponse("index.html")

@app.get("/main.js")
async def read_main():
    return FileResponse("main.js", media_type="application/javascript")

@app.get("/style.css")
async def read_style():
    return FileResponse("style.css", media_type="text/css")

# Mount assets and scripts directories
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/scripts", StaticFiles(directory="scripts"), name="scripts")
