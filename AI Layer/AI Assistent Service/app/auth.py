from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
import mysql.connector
from app.config import DATABASE_CONFIG

security = HTTPBearer()

async def get_current_user(credentials=Depends(security)):
    token = credentials.credentials
    conn = mysql.connector.connect(**DATABASE_CONFIG)
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT user_id FROM authtokens
        WHERE auth_token = %s
    """, (token,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user
