"""
認證模組
NOTE: 處理密碼雜湊、JWT token 生成與驗證
"""
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
import logging

logger = logging.getLogger(__name__)

# JWT 設定
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 8  # 8 小時

# 密碼鹽值（可從環境變數讀取）
PASSWORD_SALT = os.getenv("PASSWORD_SALT", "section-builder-salt-2026")


def hash_password(password: str) -> str:
    """
    使用 SHA512 雜湊密碼
    NOTE: 加入固定鹽值增加安全性
    """
    salted = f"{PASSWORD_SALT}{password}{PASSWORD_SALT}"
    return hashlib.sha512(salted.encode('utf-8')).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """
    驗證密碼是否正確
    """
    try:
        return hash_password(password) == hashed
    except Exception as e:
        logger.error(f"密碼驗證失敗: {e}")
        return False


def create_access_token(user_id: str, roles: list[str], expires_delta: Optional[timedelta] = None) -> str:
    """
    建立 JWT access token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": user_id,
        "roles": roles,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    解碼並驗證 JWT token
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"JWT 驗證失敗: {e}")
        return None


def validate_password_strength(password: str, policy: dict) -> tuple[bool, str]:
    """
    驗證密碼強度是否符合規範
    
    Args:
        password: 密碼
        policy: 密碼規範設定
    
    Returns:
        (是否通過, 錯誤訊息)
    """
    min_length = policy.get('min_length', 8)
    require_uppercase = policy.get('require_uppercase', True)
    require_lowercase = policy.get('require_lowercase', True)
    require_number = policy.get('require_number', True)
    require_special = policy.get('require_special', False)
    
    if len(password) < min_length:
        return False, f"密碼長度至少 {min_length} 個字元"
    
    if require_uppercase and not any(c.isupper() for c in password):
        return False, "密碼必須包含大寫字母"
    
    if require_lowercase and not any(c.islower() for c in password):
        return False, "密碼必須包含小寫字母"
    
    if require_number and not any(c.isdigit() for c in password):
        return False, "密碼必須包含數字"
    
    if require_special:
        special_chars = "!@#$%^&*()_+-=[]{}|;:',.<>?/`~"
        if not any(c in special_chars for c in password):
            return False, "密碼必須包含特殊符號"
    
    return True, ""
