from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import mysql.connector
import os
from config import DATABASE_CONFIG

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    print(f"Host: {DATABASE_CONFIG['host']}")
    
    try:
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.user_id, u.role 
            FROM authtokens a
            JOIN users u ON a.user_id = u.user_id
            WHERE a.auth_token = %s
        """, (token,))
        user = cursor.fetchone()

        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        if os.getenv("ENVIRONMENT") == "development":
            print(f"Authenticated user {user['user_id']} with token {token[:6]}...")
            
        return user
        
    except mysql.connector.Error as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error"
        )
    finally:
        if 'conn' in locals() and conn.is_connected():
            conn.close()