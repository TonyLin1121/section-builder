"""
認證路由
NOTE: 處理登入、登出、使用者資訊等認證相關 API
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, Field

from database import get_cursor
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    validate_password_strength,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["認證"])

# Token Cookie 名稱
ACCESS_TOKEN_COOKIE = "access_token"


# ============================================
# 請求/回應模型
# ============================================

class LoginRequest(BaseModel):
    """登入請求"""
    user_id: str = Field(..., min_length=1, max_length=20, description="使用者帳號")
    password: str = Field(..., min_length=1, description="密碼")


class LoginResponse(BaseModel):
    """登入回應"""
    success: bool
    message: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    roles: Optional[list[str]] = None


class UserInfo(BaseModel):
    """使用者資訊"""
    user_id: str
    user_name: Optional[str]
    roles: list[str]
    is_active: bool


class ChangePasswordRequest(BaseModel):
    """變更密碼請求"""
    old_password: str = Field(..., min_length=1, description="舊密碼")
    new_password: str = Field(..., min_length=1, description="新密碼")


# ============================================
# 輔助函數
# ============================================

def get_current_user(request: Request) -> Optional[dict]:
    """
    從 Cookie 中取得當前使用者
    """
    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        return None
    
    payload = decode_access_token(token)
    if not payload:
        return None
    
    return {
        "user_id": payload.get("sub"),
        "roles": payload.get("roles", []),
    }


def require_login(request: Request) -> dict:
    """
    驗證使用者已登入
    """
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="請先登入")
    return user


def require_admin(request: Request) -> dict:
    """
    驗證使用者為管理員
    """
    user = require_login(request)
    if "ADMIN" not in user.get("roles", []):
        raise HTTPException(status_code=403, detail="需要管理員權限")
    return user


def get_password_policy() -> dict:
    """
    取得密碼規範
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM sys_password_policy 
            WHERE is_active = true 
            ORDER BY policy_id 
            LIMIT 1
        """)
        row = cursor.fetchone()
        if row:
            return dict(row)
        # 預設規範
        return {
            "min_length": 8,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_number": True,
            "require_special": False,
            "max_login_attempts": 5,
            "lockout_duration_min": 30,
            "password_expire_days": 90,
            "password_history_count": 3,
        }


# ============================================
# API 端點
# ============================================

@router.post("/login", response_model=LoginResponse)
def login(request: Request, response: Response, body: LoginRequest):
    """
    使用者登入
    """
    user_id = body.user_id.strip()
    password = body.password
    
    with get_cursor() as cursor:
        # 查詢使用者
        cursor.execute("""
            SELECT u.*, m.chinese_name as user_name
            FROM sys_user u
            LEFT JOIN member m ON u.user_id = m.emp_id
            WHERE u.user_id = %s
        """, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            logger.warning(f"登入失敗：使用者 {user_id} 不存在")
            raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
        
        user = dict(user)
        
        # 檢查帳號是否啟用
        if not user.get("is_active"):
            logger.warning(f"登入失敗：使用者 {user_id} 未啟用")
            raise HTTPException(status_code=401, detail="帳號未啟用")
        
        # 檢查帳號是否過期
        if user.get("expire_date") and user["expire_date"] < datetime.now().date():
            logger.warning(f"登入失敗：使用者 {user_id} 帳號已過期")
            raise HTTPException(status_code=401, detail="帳號已過期")
        
        # 檢查是否被鎖定
        if user.get("locked_until") and user["locked_until"] > datetime.now():
            remaining = (user["locked_until"] - datetime.now()).seconds // 60
            logger.warning(f"登入失敗：使用者 {user_id} 帳號已被鎖定")
            raise HTTPException(status_code=401, detail=f"帳號已被鎖定，請於 {remaining} 分鐘後重試")
        
        # 驗證密碼
        if not verify_password(password, user["password_hash"]):
            # 增加失敗次數
            policy = get_password_policy()
            new_fail_count = user.get("login_fail_count", 0) + 1
            
            if new_fail_count >= policy.get("max_login_attempts", 5):
                # 鎖定帳號
                lockout_min = policy.get("lockout_duration_min", 30)
                locked_until = datetime.now() + timedelta(minutes=lockout_min)
                cursor.execute("""
                    UPDATE sys_user 
                    SET login_fail_count = %s, locked_until = %s
                    WHERE user_id = %s
                """, (new_fail_count, locked_until, user_id))
                logger.warning(f"使用者 {user_id} 密碼錯誤次數達上限，帳號已鎖定")
                raise HTTPException(status_code=401, detail=f"密碼錯誤次數過多，帳號已被鎖定 {lockout_min} 分鐘")
            else:
                cursor.execute("""
                    UPDATE sys_user 
                    SET login_fail_count = %s
                    WHERE user_id = %s
                """, (new_fail_count, user_id))
                remaining = policy.get("max_login_attempts", 5) - new_fail_count
                logger.warning(f"使用者 {user_id} 密碼錯誤，剩餘 {remaining} 次機會")
                raise HTTPException(status_code=401, detail=f"帳號或密碼錯誤，還有 {remaining} 次嘗試機會")
        
        # 登入成功，重置失敗次數並更新最後登入時間
        cursor.execute("""
            UPDATE sys_user 
            SET login_fail_count = 0, locked_until = NULL, last_login_at = %s
            WHERE user_id = %s
        """, (datetime.now(), user_id))
        
        # 取得使用者角色
        cursor.execute("""
            SELECT role_id FROM sys_user_role WHERE user_id = %s
        """, (user_id,))
        roles = [row["role_id"] for row in cursor.fetchall()]
        
        # 建立 token
        token = create_access_token(user_id, roles)
        
        # 設定 Cookie
        response.set_cookie(
            key=ACCESS_TOKEN_COOKIE,
            value=token,
            httponly=True,
            samesite="strict",
            max_age=60 * 60 * 8,  # 8 小時
        )
        
        logger.info(f"使用者 {user_id} 登入成功")
        
        return LoginResponse(
            success=True,
            message="登入成功",
            user_id=user_id,
            user_name=user.get("user_name"),
            roles=roles,
        )


@router.post("/logout")
def logout(response: Response):
    """
    使用者登出
    """
    response.delete_cookie(ACCESS_TOKEN_COOKIE)
    return {"success": True, "message": "登出成功"}


@router.get("/me", response_model=UserInfo)
def get_me(request: Request, user: dict = Depends(require_login)):
    """
    取得當前使用者資訊
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT u.user_id, u.is_active, m.chinese_name as user_name
            FROM sys_user u
            LEFT JOIN member m ON u.user_id = m.emp_id
            WHERE u.user_id = %s
        """, (user["user_id"],))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="使用者不存在")
        
        return UserInfo(
            user_id=row["user_id"],
            user_name=row["user_name"],
            roles=user.get("roles", []),
            is_active=row["is_active"],
        )


@router.post("/change-password")
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    user: dict = Depends(require_login)
):
    """
    變更密碼
    """
    user_id = user["user_id"]
    
    with get_cursor() as cursor:
        # 取得使用者
        cursor.execute("SELECT password_hash FROM sys_user WHERE user_id = %s", (user_id,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="使用者不存在")
        
        # 驗證舊密碼
        if not verify_password(body.old_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="舊密碼錯誤")
        
        # 檢查新密碼強度
        policy = get_password_policy()
        is_valid, error_msg = validate_password_strength(body.new_password, policy)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 檢查密碼歷史
        history_count = policy.get("password_history_count", 3)
        if history_count > 0:
            cursor.execute("""
                SELECT password_hash FROM sys_password_history
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (user_id, history_count))
            for history in cursor.fetchall():
                if verify_password(body.new_password, history["password_hash"]):
                    raise HTTPException(
                        status_code=400,
                        detail=f"新密碼不可與前 {history_count} 次使用的密碼相同"
                    )
        
        # 更新密碼
        new_hash = hash_password(body.new_password)
        cursor.execute("""
            UPDATE sys_user 
            SET password_hash = %s, password_changed_at = %s, updated_at = %s
            WHERE user_id = %s
        """, (new_hash, datetime.now(), datetime.now(), user_id))
        
        # 記錄密碼歷史
        cursor.execute("""
            INSERT INTO sys_password_history (user_id, password_hash)
            VALUES (%s, %s)
        """, (user_id, new_hash))
        
        logger.info(f"使用者 {user_id} 變更密碼成功")
        
        return {"success": True, "message": "密碼變更成功"}
