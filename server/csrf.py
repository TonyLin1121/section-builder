"""
CSRF 防護模組
NOTE: 使用 Double Submit Cookie 模式防止 CSRF 攻擊
"""
import os
import secrets
import hashlib
import time
import logging
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

logger = logging.getLogger(__name__)

# CSRF 設定
CSRF_SECRET_KEY = os.getenv("CSRF_SECRET_KEY", secrets.token_hex(32))
CSRF_TOKEN_EXPIRE_SECONDS = 3600  # Token 有效期：1 小時
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

# 不需要 CSRF 驗證的安全方法
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}

# 不需要 CSRF 驗證的路徑（用於健康檢查、API 文檔等）
EXEMPT_PATHS = {
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/",
}

# 初始化序列化器
serializer = URLSafeTimedSerializer(CSRF_SECRET_KEY)


def generate_csrf_token() -> str:
    """
    生成帶簽名的 CSRF token
    NOTE: 使用 itsdangerous 進行簽名，確保 token 無法被偽造
    """
    # 生成隨機數據
    random_data = secrets.token_hex(16)
    timestamp = str(int(time.time()))
    data = f"{random_data}:{timestamp}"
    
    # 簽名並返回
    return serializer.dumps(data)


def verify_csrf_token(token: str) -> bool:
    """
    驗證 CSRF token 是否有效
    """
    if not token:
        return False
    
    try:
        # 驗證簽名並檢查過期時間
        serializer.loads(token, max_age=CSRF_TOKEN_EXPIRE_SECONDS)
        return True
    except SignatureExpired:
        logger.warning("CSRF token 已過期")
        return False
    except BadSignature:
        logger.warning("CSRF token 簽名無效")
        return False
    except Exception as e:
        logger.error(f"CSRF token 驗證失敗: {e}")
        return False


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF 中間件
    NOTE: 攔截所有變更性請求（POST/PUT/DELETE/PATCH）並驗證 CSRF token
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # 取得請求方法和路徑
        method = request.method
        path = request.url.path
        
        # 安全方法不需要驗證
        if method in SAFE_METHODS:
            return await call_next(request)
        
        # 豁免路徑不需要驗證
        if path in EXEMPT_PATHS:
            return await call_next(request)
        
        # 檢查是否為 API 請求
        if not path.startswith("/api/"):
            return await call_next(request)
        
        # CSRF token 端點本身也需要豁免（用於獲取初始 token）
        if path == "/api/csrf-token":
            return await call_next(request)
        
        # 從 Cookie 和 Header 獲取 token
        cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
        header_token = request.headers.get(CSRF_HEADER_NAME)
        
        # 驗證 Double Submit Cookie
        if not cookie_token or not header_token:
            logger.warning(f"CSRF 驗證失敗：缺少 token - Cookie: {bool(cookie_token)}, Header: {bool(header_token)}")
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF 驗證失敗：缺少 token"}
            )
        
        # 驗證兩個 token 是否一致
        if cookie_token != header_token:
            logger.warning("CSRF 驗證失敗：Cookie 和 Header 中的 token 不一致")
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF 驗證失敗：token 不匹配"}
            )
        
        # 驗證 token 簽名和有效期
        if not verify_csrf_token(cookie_token):
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF 驗證失敗：token 無效或已過期"}
            )
        
        # 驗證通過，繼續處理請求
        return await call_next(request)


def set_csrf_cookie(response: Response, token: str) -> None:
    """
    在回應中設置 CSRF Cookie
    NOTE: 使用 HttpOnly=False 以便前端 JavaScript 可以讀取
    """
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        max_age=CSRF_TOKEN_EXPIRE_SECONDS,
        httponly=False,  # 允許 JavaScript 讀取
        samesite="strict",  # 嚴格的 SameSite 策略
        secure=os.getenv("ENVIRONMENT", "development") == "production",  # 生產環境使用 Secure
    )
