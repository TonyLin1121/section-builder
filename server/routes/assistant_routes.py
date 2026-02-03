"""
i 助手 API 路由
NOTE: 提供 n8n Webhook 代理、使用者設定、對話歷史功能
"""
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
import httpx

from database import get_cursor
from .auth_routes import require_login

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant", tags=["i 助手"])


# ============================================
# Pydantic 模型
# ============================================

class AssistantSettings(BaseModel):
    """使用者設定模型"""
    user_id: str
    webhook_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AssistantSettingsUpdate(BaseModel):
    """更新設定請求"""
    webhook_url: Optional[str] = Field(None, max_length=500)


class ChatMessage(BaseModel):
    """聊天訊息"""
    role: str  # 'user' 或 'assistant'
    content: str
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    """發送訊息請求"""
    message: str = Field(..., min_length=1, max_length=10000)


class ChatResponse(BaseModel):
    """訊息回應"""
    response: str
    message_id: Optional[int] = None


class ChatHistoryResponse(BaseModel):
    """對話歷史回應"""
    messages: List[ChatMessage]
    total: int


# ============================================
# 設定 API
# ============================================

@router.get("/settings", response_model=AssistantSettings)
async def get_settings(current_user: dict = Depends(require_login)):
    """
    取得使用者的 i 助手設定
    """
    user_id = current_user["user_id"]
    
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT user_id, webhook_url, created_at, updated_at
            FROM user_assistant_settings
            WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()
        
        if row:
            return AssistantSettings(
                user_id=row[0],
                webhook_url=row[1],
                created_at=str(row[2]) if row[2] else None,
                updated_at=str(row[3]) if row[3] else None
            )
        else:
            # 返回空設定
            return AssistantSettings(user_id=user_id)


@router.put("/settings", response_model=AssistantSettings)
async def update_settings(
    settings: AssistantSettingsUpdate,
    current_user: dict = Depends(require_login)
):
    """
    更新使用者的 i 助手設定
    """
    user_id = current_user["user_id"]
    
    with get_cursor() as cursor:
        # 使用 UPSERT
        cursor.execute("""
            INSERT INTO user_assistant_settings (user_id, webhook_url, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET webhook_url = EXCLUDED.webhook_url, updated_at = NOW()
            RETURNING user_id, webhook_url, created_at, updated_at
        """, (user_id, settings.webhook_url))
        row = cursor.fetchone()
        
        return AssistantSettings(
            user_id=row[0],
            webhook_url=row[1],
            created_at=str(row[2]) if row[2] else None,
            updated_at=str(row[3]) if row[3] else None
        )


# ============================================
# 對話 API
# ============================================

@router.post("/chat", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(require_login)
):
    """
    發送訊息到 n8n Webhook 並儲存對話
    """
    user_id = current_user["user_id"]
    
    # 取得使用者的 Webhook URL
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT webhook_url FROM user_assistant_settings WHERE user_id = %s
        """, (user_id,))
        row = cursor.fetchone()
        
        if not row or not row[0]:
            raise HTTPException(status_code=400, detail="請先設定 Webhook URL")
        
        webhook_url = row[0]
    
    # 儲存使用者訊息
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO assistant_chat_history (user_id, role, content, created_at)
            VALUES (%s, 'user', %s, NOW())
            RETURNING id
        """, (user_id, request.message))
        user_message_id = cursor.fetchone()[0]
    
    # 呼叫 n8n Webhook
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                webhook_url,
                json={"message": request.message},
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            data = response.json()
            # 支援多種回應格式
            assistant_response = data.get("response") or data.get("output") or data.get("text") or str(data)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Webhook 請求超時")
    except httpx.HTTPStatusError as e:
        logger.error(f"Webhook 回應錯誤: {e.response.status_code}")
        raise HTTPException(status_code=502, detail=f"Webhook 回應錯誤: {e.response.status_code}")
    except Exception as e:
        logger.error(f"Webhook 呼叫失敗: {e}")
        raise HTTPException(status_code=502, detail=f"Webhook 呼叫失敗: {str(e)}")
    
    # 儲存助手回覆
    with get_cursor() as cursor:
        cursor.execute("""
            INSERT INTO assistant_chat_history (user_id, role, content, created_at)
            VALUES (%s, 'assistant', %s, NOW())
            RETURNING id
        """, (user_id, assistant_response))
        assistant_message_id = cursor.fetchone()[0]
    
    return ChatResponse(response=assistant_response, message_id=assistant_message_id)


@router.get("/history", response_model=ChatHistoryResponse)
async def get_history(
    limit: int = 50,
    current_user: dict = Depends(require_login)
):
    """
    取得對話歷史
    """
    user_id = current_user["user_id"]
    
    with get_cursor() as cursor:
        # 取得總數
        cursor.execute("""
            SELECT COUNT(*) FROM assistant_chat_history WHERE user_id = %s
        """, (user_id,))
        total = cursor.fetchone()[0]
        
        # 取得最近的訊息（按時間正序，最新的在最後）
        cursor.execute("""
            SELECT role, content, created_at
            FROM assistant_chat_history
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (user_id, limit))
        rows = cursor.fetchall()
        
        # 反轉順序，讓最舊的在前面
        messages = [
            ChatMessage(
                role=row[0],
                content=row[1],
                created_at=str(row[2]) if row[2] else None
            )
            for row in reversed(rows)
        ]
        
        return ChatHistoryResponse(messages=messages, total=total)


@router.delete("/history")
async def clear_history(current_user: dict = Depends(require_login)):
    """
    清除對話歷史
    """
    user_id = current_user["user_id"]
    
    with get_cursor() as cursor:
        cursor.execute("""
            DELETE FROM assistant_chat_history WHERE user_id = %s
        """, (user_id,))
        deleted_count = cursor.rowcount
    
    return {"message": f"已清除 {deleted_count} 筆對話記錄"}
