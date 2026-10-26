from fastapi import FastAPI

from app.db import client

app = FastAPI(title="RoomMatch API")


@app.get("/api/health")
async def health():
    await client.admin.command("ping")
    return {"status": "ok", "mongo": "conectado"}
