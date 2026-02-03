"""
Webhook 代理路由
NOTE: 提供 n8n webhook 代理功能，確保只有登入使用者才能存取
"""
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import httpx

from .auth_routes import require_login

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["Webhook"])

# n8n 設定（從環境變數讀取）
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "")
N8N_HEADER_AUTH_NAME = os.getenv("N8N_HEADER_AUTH_NAME", "")
N8N_HEADER_AUTH_VALUE = os.getenv("N8N_HEADER_AUTH_VALUE", "")


# ============================================
# 請求/回應模型
# ============================================

class KMQueryRequest(BaseModel):
    """KM 查詢請求"""
    query: str = Field(..., min_length=1, description="查詢內容")
    context: Optional[dict] = Field(None, description="額外上下文資訊")


class KMQueryResponse(BaseModel):
    """KM 查詢回應"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


# ============================================
# API 端點
# ============================================

@router.post("/km", response_model=KMQueryResponse)
async def proxy_km_query(
    body: KMQueryRequest,
    user: dict = Depends(require_login)
):
    """
    KM 查詢代理
    NOTE: 只有登入使用者才能使用此端點
    將請求轉發到 n8n webhook，並附加使用者資訊
    """
    # 檢查 n8n 設定是否完整
    if not N8N_WEBHOOK_URL:
        logger.error("N8N_WEBHOOK_URL 未設定")
        raise HTTPException(status_code=500, detail="Webhook 設定不完整")
    
    if not N8N_HEADER_AUTH_NAME or not N8N_HEADER_AUTH_VALUE:
        logger.error("N8N Header Auth 設定不完整")
        raise HTTPException(status_code=500, detail="Webhook 認證設定不完整")
    
    try:
        # 準備轉發的資料，附加使用者資訊
        payload = {
            "query": body.query,
            "context": body.context,
            "user_id": user["user_id"],
            "source": "section-builder"
        }
        
        # 準備 headers
        headers = {
            N8N_HEADER_AUTH_NAME: N8N_HEADER_AUTH_VALUE,
            "Content-Type": "application/json"
        }
        
        logger.info(f"使用者 {user['user_id']} 發送 KM 查詢: {body.query[:50]}...")
        
        # 使用 httpx 進行非同步請求
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(
                N8N_WEBHOOK_URL,
                json=payload,
                headers=headers
            )
            
            # 檢查回應狀態
            if response.status_code != 200:
                logger.error(f"n8n webhook 回應錯誤: {response.status_code}")
                return KMQueryResponse(
                    success=False,
                    error=f"Webhook 回應錯誤: {response.status_code}"
                )
            
            # 解析回應
            try:
                result = response.json()
            except Exception:
                result = {"raw": response.text}
            
            logger.info(f"KM 查詢成功，使用者: {user['user_id']}")
            
            return KMQueryResponse(
                success=True,
                data=result
            )
    
    except httpx.TimeoutException:
        logger.error("n8n webhook 請求超時")
        return KMQueryResponse(
            success=False,
            error="請求超時，請稍後再試"
        )
    
    except httpx.RequestError as e:
        logger.error(f"n8n webhook 請求失敗: {e}")
        return KMQueryResponse(
            success=False,
            error=f"連線錯誤: {str(e)}"
        )
    
    except Exception as e:
        logger.error(f"KM 查詢發生未預期錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def webhook_health():
    """
    Webhook 健康檢查
    NOTE: 檢查 n8n 設定是否完整
    """
    config_status = {
        "webhook_url_configured": bool(N8N_WEBHOOK_URL),
        "auth_name_configured": bool(N8N_HEADER_AUTH_NAME),
        "auth_value_configured": bool(N8N_HEADER_AUTH_VALUE),
    }
    
    all_configured = all(config_status.values())
    
    return {
        "status": "healthy" if all_configured else "incomplete",
        "config": config_status
    }
