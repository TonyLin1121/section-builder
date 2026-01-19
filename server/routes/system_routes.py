"""
系統管理路由
NOTE: 處理使用者、角色、功能清單等系統管理 API
"""
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel, Field

from database import get_cursor
from auth import hash_password
from routes.auth_routes import require_login, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system", tags=["系統管理"])


# ============================================
# 請求/回應模型
# ============================================

class UserCreateRequest(BaseModel):
    """新增使用者請求"""
    user_id: str = Field(..., min_length=1, max_length=20, description="使用者帳號（必須是 member 中的 emp_id）")
    password: str = Field(..., min_length=1, description="密碼")
    is_active: bool = Field(default=True, description="是否啟用")
    expire_date: Optional[str] = Field(None, description="帳號到期日 (YYYY-MM-DD)")
    role_ids: Optional[List[str]] = Field(default=[], description="角色 ID 列表")


class UserUpdateRequest(BaseModel):
    """更新使用者請求"""
    is_active: Optional[bool] = None
    expire_date: Optional[str] = None
    role_ids: Optional[List[str]] = None
    reset_password: Optional[str] = None


class UserResponse(BaseModel):
    """使用者回應"""
    user_id: str
    user_name: Optional[str]
    is_active: bool
    active_date: Optional[str]
    expire_date: Optional[str]
    last_login_at: Optional[str]
    roles: List[str]


class RoleRequest(BaseModel):
    """角色請求"""
    role_id: str = Field(..., min_length=1, max_length=20)
    role_name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    is_active: bool = True
    function_ids: Optional[List[str]] = None


class RoleResponse(BaseModel):
    """角色回應"""
    role_id: str
    role_name: str
    description: Optional[str]
    is_active: bool
    functions: List[str]


class MenuResponse(BaseModel):
    """功能清單回應"""
    menu_id: str
    menu_name: str
    parent_menu_id: Optional[str]
    menu_path: Optional[str]
    icon: Optional[str]
    sort_order: int
    is_active: bool
    children: List["MenuResponse"] = []


class FunctionResponse(BaseModel):
    """功能回應"""
    function_id: str
    function_name: str
    menu_id: Optional[str]
    function_type: Optional[str]
    is_active: bool


class PasswordPolicyResponse(BaseModel):
    """密碼規範回應"""
    policy_id: int
    policy_name: str
    min_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_number: bool
    require_special: bool
    max_login_attempts: int
    lockout_duration_min: int
    password_expire_days: int
    password_history_count: int
    is_active: bool


# ============================================
# 使用者管理 API
# ============================================

@router.get("/users")
def get_users(
    request: Request,
    user: dict = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """
    取得使用者列表
    """
    with get_cursor() as cursor:
        # 構建查詢
        conditions = []
        params = []
        
        if search:
            conditions.append("(u.user_id LIKE %s OR m.chinese_name LIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # 計算總數
        cursor.execute(f"""
            SELECT COUNT(*) as cnt FROM sys_user u
            LEFT JOIN member m ON u.user_id = m.emp_id
            WHERE {where_clause}
        """, params)
        total = cursor.fetchone()["cnt"]
        
        # 查詢資料
        offset = (page - 1) * page_size
        cursor.execute(f"""
            SELECT u.*, m.chinese_name as user_name
            FROM sys_user u
            LEFT JOIN member m ON u.user_id = m.emp_id
            WHERE {where_clause}
            ORDER BY u.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        
        users = []
        for row in cursor.fetchall():
            user_data = dict(row)
            # 取得角色
            cursor.execute("""
                SELECT role_id FROM sys_user_role WHERE user_id = %s
            """, (user_data["user_id"],))
            roles = [r["role_id"] for r in cursor.fetchall()]
            
            users.append({
                "user_id": user_data["user_id"],
                "user_name": user_data.get("user_name"),
                "is_active": user_data["is_active"],
                "active_date": str(user_data["active_date"]) if user_data.get("active_date") else None,
                "expire_date": str(user_data["expire_date"]) if user_data.get("expire_date") else None,
                "last_login_at": user_data["last_login_at"].isoformat() if user_data.get("last_login_at") else None,
                "roles": roles,
            })
        
        return {
            "items": users,
            "total": total,
            "page": page,
            "page_size": page_size,
        }


@router.post("/users", status_code=201)
def create_user(
    request: Request,
    body: UserCreateRequest,
    user: dict = Depends(require_admin),
):
    """
    新增使用者
    """
    with get_cursor() as cursor:
        # 確認 user_id 存在於 member 中
        cursor.execute("SELECT emp_id FROM member WHERE emp_id = %s", (body.user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="使用者帳號必須是 member 中的員工")
        
        # 確認 user_id 尚未建立
        cursor.execute("SELECT user_id FROM sys_user WHERE user_id = %s", (body.user_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="使用者已存在")
        
        # 建立使用者
        password_hash = hash_password(body.password)
        # 空字串轉為 None，避免日期格式錯誤
        expire_date = body.expire_date if body.expire_date else None
        cursor.execute("""
            INSERT INTO sys_user (user_id, password_hash, is_active, expire_date)
            VALUES (%s, %s, %s, %s)
        """, (body.user_id, password_hash, body.is_active, expire_date))
        
        # 建立角色關聯
        if body.role_ids:
            for role_id in body.role_ids:
                cursor.execute("""
                    INSERT INTO sys_user_role (user_id, role_id, granted_by)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (body.user_id, role_id, user["user_id"]))
        
        # 記錄密碼歷史
        cursor.execute("""
            INSERT INTO sys_password_history (user_id, password_hash)
            VALUES (%s, %s)
        """, (body.user_id, password_hash))
        
        logger.info(f"使用者 {body.user_id} 已由 {user['user_id']} 建立")
        
        return {"success": True, "message": "使用者建立成功", "user_id": body.user_id}


@router.put("/users/{user_id}")
def update_user(
    request: Request,
    user_id: str,
    body: UserUpdateRequest,
    admin: dict = Depends(require_admin),
):
    """
    更新使用者
    """
    with get_cursor() as cursor:
        # 確認使用者存在
        cursor.execute("SELECT user_id FROM sys_user WHERE user_id = %s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="使用者不存在")
        
        # 更新基本資料
        updates = []
        params = []
        
        if body.is_active is not None:
            updates.append("is_active = %s")
            params.append(body.is_active)
        
        if body.expire_date is not None:
            updates.append("expire_date = %s")
            params.append(body.expire_date if body.expire_date else None)
        
        if body.reset_password:
            password_hash = hash_password(body.reset_password)
            updates.append("password_hash = %s")
            params.append(password_hash)
            updates.append("password_changed_at = %s")
            params.append(datetime.now())
            # 記錄密碼歷史
            cursor.execute("""
                INSERT INTO sys_password_history (user_id, password_hash)
                VALUES (%s, %s)
            """, (user_id, password_hash))
        
        if updates:
            updates.append("updated_at = %s")
            params.append(datetime.now())
            params.append(user_id)
            cursor.execute(f"""
                UPDATE sys_user SET {', '.join(updates)}
                WHERE user_id = %s
            """, params)
        
        # 更新角色
        if body.role_ids is not None:
            # 刪除現有角色
            cursor.execute("DELETE FROM sys_user_role WHERE user_id = %s", (user_id,))
            # 新增角色
            for role_id in body.role_ids:
                cursor.execute("""
                    INSERT INTO sys_user_role (user_id, role_id, granted_by)
                    VALUES (%s, %s, %s)
                """, (user_id, role_id, admin["user_id"]))
        
        logger.info(f"使用者 {user_id} 已由 {admin['user_id']} 更新")
        
        return {"success": True, "message": "使用者更新成功"}


@router.delete("/users/{user_id}")
def delete_user(
    request: Request,
    user_id: str,
    admin: dict = Depends(require_admin),
):
    """
    刪除使用者
    """
    with get_cursor() as cursor:
        cursor.execute("DELETE FROM sys_user WHERE user_id = %s", (user_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="使用者不存在")
        
        logger.info(f"使用者 {user_id} 已由 {admin['user_id']} 刪除")
        
        return {"success": True, "message": "使用者刪除成功"}


# ============================================
# 角色管理 API
# ============================================

@router.get("/roles")
def get_roles(
    request: Request,
    user: dict = Depends(require_login),
):
    """
    取得角色列表
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM sys_role ORDER BY role_id
        """)
        
        roles = []
        for row in cursor.fetchall():
            role_data = dict(row)
            # 取得功能
            cursor.execute("""
                SELECT function_id FROM sys_role_function WHERE role_id = %s
            """, (role_data["role_id"],))
            functions = [r["function_id"] for r in cursor.fetchall()]
            
            roles.append({
                **role_data,
                "functions": functions,
            })
        
        return {"items": roles}


@router.post("/roles", status_code=201)
def create_role(
    request: Request,
    body: RoleRequest,
    admin: dict = Depends(require_admin),
):
    """
    新增角色
    """
    with get_cursor() as cursor:
        # 確認角色不存在
        cursor.execute("SELECT role_id FROM sys_role WHERE role_id = %s", (body.role_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="角色已存在")
        
        # 建立角色
        cursor.execute("""
            INSERT INTO sys_role (role_id, role_name, description, is_active)
            VALUES (%s, %s, %s, %s)
        """, (body.role_id, body.role_name, body.description, body.is_active))
        
        # 建立功能關聯
        if body.function_ids:
            for func_id in body.function_ids:
                cursor.execute("""
                    INSERT INTO sys_role_function (role_id, function_id, granted_by)
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (body.role_id, func_id, admin["user_id"]))
        
        logger.info(f"角色 {body.role_id} 已由 {admin['user_id']} 建立")
        
        return {"success": True, "message": "角色建立成功", "role_id": body.role_id}


@router.put("/roles/{role_id}")
def update_role(
    request: Request,
    role_id: str,
    body: RoleRequest,
    admin: dict = Depends(require_admin),
):
    """
    更新角色
    """
    with get_cursor() as cursor:
        # 確認角色存在
        cursor.execute("SELECT role_id FROM sys_role WHERE role_id = %s", (role_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="角色不存在")
        
        # 更新角色
        cursor.execute("""
            UPDATE sys_role 
            SET role_name = %s, description = %s, is_active = %s, updated_at = %s
            WHERE role_id = %s
        """, (body.role_name, body.description, body.is_active, datetime.now(), role_id))
        
        # 更新功能關聯
        if body.function_ids is not None:
            cursor.execute("DELETE FROM sys_role_function WHERE role_id = %s", (role_id,))
            for func_id in body.function_ids:
                cursor.execute("""
                    INSERT INTO sys_role_function (role_id, function_id, granted_by)
                    VALUES (%s, %s, %s)
                """, (role_id, func_id, admin["user_id"]))
        
        logger.info(f"角色 {role_id} 已由 {admin['user_id']} 更新")
        
        return {"success": True, "message": "角色更新成功"}


@router.delete("/roles/{role_id}")
def delete_role(
    request: Request,
    role_id: str,
    admin: dict = Depends(require_admin),
):
    """
    刪除角色
    """
    # 禁止刪除 ADMIN 角色
    if role_id == "ADMIN":
        raise HTTPException(status_code=400, detail="無法刪除 ADMIN 角色")
    
    with get_cursor() as cursor:
        cursor.execute("DELETE FROM sys_role WHERE role_id = %s", (role_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        logger.info(f"角色 {role_id} 已由 {admin['user_id']} 刪除")
        
        return {"success": True, "message": "角色刪除成功"}


# ============================================
# 功能清單 API
# ============================================

@router.get("/menus")
def get_menus(
    request: Request,
    user: dict = Depends(require_login),
):
    """
    取得功能清單（階層結構）
    NOTE: 只返回 is_active = true 的選單
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM sys_menu WHERE is_active = true ORDER BY sort_order, menu_id
        """)
        menus = [dict(row) for row in cursor.fetchall()]
        
        # 建立階層結構
        menu_map = {m["menu_id"]: {**m, "children": []} for m in menus}
        root_menus = []
        
        for menu in menus:
            if menu["parent_menu_id"]:
                parent = menu_map.get(menu["parent_menu_id"])
                if parent:
                    parent["children"].append(menu_map[menu["menu_id"]])
            else:
                root_menus.append(menu_map[menu["menu_id"]])
        
        return {"items": root_menus}


@router.get("/menus/flat")
def get_menus_flat(
    request: Request,
    user: dict = Depends(require_admin),
):
    """
    取得所有選單（平面結構，用於功能清單管理）
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM sys_menu ORDER BY sort_order, menu_id
        """)
        menus = [dict(row) for row in cursor.fetchall()]
        return {"items": menus}


@router.get("/menus/all")
def get_menus_all(
    request: Request,
    user: dict = Depends(require_admin),
):
    """
    取得所有選單（用於維護頁面）
    NOTE: 回傳所有欄位，包含 created_at, updated_at
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT menu_id, menu_name, parent_menu_id, menu_path, icon, 
                       sort_order, is_active
                FROM sys_menu 
                ORDER BY sort_order, menu_id
            """)
            menus = []
            for row in cursor.fetchall():
                menu = dict(row)
                # 確保所有值都可序列化
                for key, value in menu.items():
                    if hasattr(value, 'isoformat'):
                        menu[key] = value.isoformat()
                menus.append(menu)
            return {"items": menus}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/menus/create")
def create_menu_record(
    request: Request,
    data: dict,
    user: dict = Depends(require_admin),
):
    """
    新增選單記錄
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO sys_menu (menu_id, menu_name, parent_menu_id, menu_path, icon, sort_order, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                data.get("menu_id"),
                data.get("menu_name"),
                data.get("parent_menu_id"),
                data.get("menu_path"),
                data.get("icon"),
                data.get("sort_order", 1),
                data.get("is_active", True),
            ))
            return {"message": "新增成功", "menu_id": data.get("menu_id")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/functions")
def get_functions(
    request: Request,
    user: dict = Depends(require_login),
):
    """
    取得功能列表
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM sys_function ORDER BY menu_id, function_id
        """)
        functions = [dict(row) for row in cursor.fetchall()]
        
        return {"items": functions}


class UpdateMenuRequest(BaseModel):
    """
    更新選單請求
    """
    menu_name: Optional[str] = None
    parent_menu_id: Optional[str] = None  # 支援移動到其他選單或設為 null（從選單移除）
    menu_path: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


@router.put("/menus/{menu_id}")
def update_menu(
    menu_id: str,
    request: Request,
    data: UpdateMenuRequest,
    user: dict = Depends(require_admin),
):
    """
    更新選單設定（主要用於調整排序）
    """
    with get_cursor() as cursor:
        # 檢查選單是否存在
        cursor.execute("SELECT * FROM sys_menu WHERE menu_id = %s", (menu_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="選單不存在")
        
        # 建立更新欄位
        updates = []
        values = []
        
        if data.menu_name is not None:
            updates.append("menu_name = %s")
            values.append(data.menu_name)
        # 特殊處理：parent_menu_id 可以設為 None（從選單移除）
        if 'parent_menu_id' in data.model_dump(exclude_unset=True):
            updates.append("parent_menu_id = %s")
            values.append(data.parent_menu_id)  # 可能是 None
        if data.menu_path is not None:
            updates.append("menu_path = %s")
            values.append(data.menu_path)
        if data.icon is not None:
            updates.append("icon = %s")
            values.append(data.icon)
        if data.sort_order is not None:
            updates.append("sort_order = %s")
            values.append(data.sort_order)
        if data.is_active is not None:
            updates.append("is_active = %s")
            values.append(data.is_active)
        
        if not updates:
            return {"message": "沒有需要更新的欄位"}
        
        values.append(menu_id)
        query = f"UPDATE sys_menu SET {', '.join(updates)} WHERE menu_id = %s"
        cursor.execute(query, values)
        
        return {"message": "選單已更新"}


class CreateMenuRequest(BaseModel):
    """
    新增選單請求
    """
    menu_id: str
    menu_name: str
    parent_menu_id: Optional[str] = None
    menu_path: Optional[str] = None
    icon: Optional[str] = "📁"
    sort_order: Optional[int] = 1
    is_active: Optional[bool] = True


@router.post("/menus")
def create_menu(
    request: Request,
    data: CreateMenuRequest,
    user: dict = Depends(require_admin),
):
    """
    新增選單
    """
    with get_cursor() as cursor:
        # 檢查選單 ID 是否已存在
        cursor.execute("SELECT menu_id FROM sys_menu WHERE menu_id = %s", (data.menu_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="選單 ID 已存在")
        
        cursor.execute("""
            INSERT INTO sys_menu (menu_id, menu_name, parent_menu_id, menu_path, icon, sort_order, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data.menu_id, data.menu_name, data.parent_menu_id, data.menu_path, data.icon, data.sort_order, data.is_active))
        
        return {"message": "選單已建立", "menu_id": data.menu_id}


@router.delete("/menus/{menu_id}")
def delete_menu(
    menu_id: str,
    request: Request,
    user: dict = Depends(require_admin),
):
    """
    刪除選單（僅限目錄，頁面不可刪除）
    """
    with get_cursor() as cursor:
        # 檢查選單是否存在
        cursor.execute("SELECT * FROM sys_menu WHERE menu_id = %s", (menu_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="選單不存在")
        
        # 頁面（有 menu_path）不能刪除
        if existing.get('menu_path'):
            raise HTTPException(status_code=400, detail="系統頁面不能刪除，只能從選單移除")
        
        # 解除 sys_function 中的關聯（設為 NULL）
        cursor.execute("UPDATE sys_function SET menu_id = NULL WHERE menu_id = %s", (menu_id,))
        
        # 處理子選單
        cursor.execute("SELECT menu_id, menu_path FROM sys_menu WHERE parent_menu_id = %s", (menu_id,))
        children = cursor.fetchall()
        
        for child in children:
            child_id = child['menu_id']
            cursor.execute("UPDATE sys_function SET menu_id = NULL WHERE menu_id = %s", (child_id,))
            
            if child.get('menu_path'):
                # 子頁面：設為未掛載（parent_menu_id = NULL）
                cursor.execute("UPDATE sys_menu SET parent_menu_id = NULL WHERE menu_id = %s", (child_id,))
            else:
                # 子目錄：刪除
                cursor.execute("DELETE FROM sys_menu WHERE menu_id = %s", (child_id,))
        
        # 刪除選單目錄
        cursor.execute("DELETE FROM sys_menu WHERE menu_id = %s", (menu_id,))
        
        return {"message": "選單已刪除"}

# ============================================
# 密碼規範 API
# ============================================

@router.get("/password-policy")
def get_password_policy(
    request: Request,
    user: dict = Depends(require_admin),
):
    """
    取得密碼規範
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM sys_password_policy WHERE is_active = true LIMIT 1
        """)
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="密碼規範不存在")
        
        return dict(row)


@router.put("/password-policy/{policy_id}")
def update_password_policy(
    request: Request,
    policy_id: int,
    body: dict,
    admin: dict = Depends(require_admin),
):
    """
    更新密碼規範
    """
    with get_cursor() as cursor:
        # 確認規範存在
        cursor.execute("SELECT policy_id FROM sys_password_policy WHERE policy_id = %s", (policy_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="密碼規範不存在")
        
        # 更新規範
        allowed_fields = [
            "policy_name", "min_length", "require_uppercase", "require_lowercase",
            "require_number", "require_special", "max_login_attempts",
            "lockout_duration_min", "password_expire_days", "password_history_count"
        ]
        
        updates = []
        params = []
        for field in allowed_fields:
            if field in body:
                updates.append(f"{field} = %s")
                params.append(body[field])
        
        if updates:
            updates.append("updated_at = %s")
            params.append(datetime.now())
            params.append(policy_id)
            cursor.execute(f"""
                UPDATE sys_password_policy SET {', '.join(updates)}
                WHERE policy_id = %s
            """, params)
        
        logger.info(f"密碼規範 {policy_id} 已由 {admin['user_id']} 更新")
        
        return {"success": True, "message": "密碼規範更新成功"}


# ============================================
# 可用員工列表（for 新增使用者）
# ============================================

@router.get("/available-members")
def get_available_members(
    request: Request,
    user: dict = Depends(require_admin),
    search: Optional[str] = None,
):
    """
    取得可建立帳號的員工列表
    NOTE: 只返回在職且尚未有帳號的員工
    """
    with get_cursor() as cursor:
        # 只顯示在職且尚未有帳號的員工
        conditions = [
            "m.emp_id NOT IN (SELECT user_id FROM sys_user)",
            "m.is_employed = true"
        ]
        params = []
        
        if search:
            conditions.append("(m.emp_id LIKE %s OR m.chinese_name LIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])
        
        where_clause = " AND ".join(conditions)
        
        cursor.execute(f"""
            SELECT m.emp_id, m.chinese_name, m.job_title
            FROM member m
            WHERE {where_clause}
            ORDER BY m.emp_id
            LIMIT 100
        """, params)
        
        members = [dict(row) for row in cursor.fetchall()]
        
        return {"items": members}
