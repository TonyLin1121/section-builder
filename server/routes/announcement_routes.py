"""
公告管理路由
NOTE: 處理公告的 CRUD、附件上傳、已讀記錄等 API
"""
import logging
import os
import uuid
import shutil
from datetime import datetime, date
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request, Depends, Query, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from database import get_cursor
from routes.auth_routes import require_login, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/announcements", tags=["公告管理"])

# 附件儲存路徑
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "announcements")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================
# 輔助函數
# ============================================

def get_announcement_with_details(cursor, announcement_id: int, user_id: str = None) -> dict:
    """
    取得公告完整資料（含類別、目標對象、附件）
    """
    cursor.execute("""
        SELECT a.*, c.category_name, c.icon as category_icon
        FROM sys_announcement a
        LEFT JOIN sys_announcement_category c ON a.category_id = c.category_id
        WHERE a.announcement_id = %s
    """, (announcement_id,))
    row = cursor.fetchone()
    if not row:
        return None
    
    announcement = dict(row)
    
    # 轉換日期格式
    for key in ['publish_date', 'expire_date', 'created_at', 'updated_at']:
        if announcement.get(key):
            val = announcement[key]
            if hasattr(val, 'isoformat'):
                announcement[key] = val.isoformat()
            else:
                announcement[key] = str(val)
    
    # 取得目標對象
    cursor.execute("""
        SELECT target_type, target_value
        FROM sys_announcement_target
        WHERE announcement_id = %s
    """, (announcement_id,))
    announcement['targets'] = [dict(r) for r in cursor.fetchall()]
    
    # 取得附件
    cursor.execute("""
        SELECT attachment_id, announcement_id, file_name, file_path, file_size, file_type
        FROM sys_announcement_attachment
        WHERE announcement_id = %s
    """, (announcement_id,))
    announcement['attachments'] = [dict(r) for r in cursor.fetchall()]
    
    # 檢查是否已讀
    if user_id:
        cursor.execute("""
            SELECT 1 FROM sys_announcement_read
            WHERE announcement_id = %s AND user_id = %s
        """, (announcement_id, user_id))
        announcement['is_read'] = cursor.fetchone() is not None
    
    return announcement


def check_user_can_view(cursor, announcement: dict, user_id: str) -> bool:
    """
    檢查使用者是否可以查看此公告
    """
    target_type = announcement.get('target_type', 'all')
    
    if target_type == 'all':
        return True
    
    # 取得使用者資訊
    cursor.execute("""
        SELECT m.division_no, m.division_name
        FROM member m
        WHERE m.emp_id = %s
    """, (user_id,))
    member = cursor.fetchone()
    
    # 取得使用者角色
    cursor.execute("""
        SELECT role_id FROM sys_user_role WHERE user_id = %s
    """, (user_id,))
    user_roles = [r['role_id'] for r in cursor.fetchall()]
    
    # 檢查目標對象
    targets = announcement.get('targets', [])
    for target in targets:
        tt = target['target_type']
        tv = target['target_value']
        
        if tt == 'user' and tv == user_id:
            return True
        if tt == 'role' and tv in user_roles:
            return True
        if tt == 'division' and member:
            if tv == member.get('division_no') or tv == member.get('division_name'):
                return True
    
    return False


# ============================================
# 公告類別 API
# ============================================

@router.get("/categories")
def get_categories(
    request: Request,
    user: dict = Depends(require_login),
):
    """
    取得公告類別清單
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM sys_announcement_category
            WHERE is_active = true
            ORDER BY sort_order
        """)
        return {"items": [dict(r) for r in cursor.fetchall()]}


# ============================================
# 公告管理 API（管理員）
# ============================================

@router.get("")
def get_announcements(
    request: Request,
    user: dict = Depends(require_admin),
    category_id: Optional[str] = Query(None, description="類別篩選"),
    is_active: Optional[bool] = Query(None, description="啟用狀態篩選"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    取得公告清單（管理員用）
    """
    with get_cursor() as cursor:
        conditions = []
        params = []
        
        if category_id:
            conditions.append("a.category_id = %s")
            params.append(category_id)
        
        if is_active is not None:
            conditions.append("a.is_active = %s")
            params.append(is_active)
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # 計算總數
        cursor.execute(f"""
            SELECT COUNT(*) as cnt FROM sys_announcement a WHERE {where_clause}
        """, params)
        total = cursor.fetchone()["cnt"]
        
        # 查詢資料
        offset = (page - 1) * page_size
        cursor.execute(f"""
            SELECT a.*, c.category_name, c.icon as category_icon
            FROM sys_announcement a
            LEFT JOIN sys_announcement_category c ON a.category_id = c.category_id
            WHERE {where_clause}
            ORDER BY a.is_pinned DESC, a.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        
        items = []
        for row in cursor.fetchall():
            item = dict(row)
            # 轉換日期
            for key in ['publish_date', 'expire_date', 'created_at', 'updated_at']:
                if item.get(key) and hasattr(item[key], 'isoformat'):
                    item[key] = item[key].isoformat()
            items.append(item)
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }


@router.get("/active")
def get_active_announcements(
    request: Request,
    user: dict = Depends(require_login),
):
    """
    取得目前有效的公告（使用者用）
    NOTE: 過濾已過期、未發布、非啟用的公告
    """
    user_id = user["user_id"]
    today = date.today()
    
    with get_cursor() as cursor:
        # 取得有效公告
        cursor.execute("""
            SELECT a.*, c.category_name, c.icon as category_icon
            FROM sys_announcement a
            LEFT JOIN sys_announcement_category c ON a.category_id = c.category_id
            WHERE a.is_active = true
              AND (a.publish_date IS NULL OR a.publish_date <= %s)
              AND (a.expire_date IS NULL OR a.expire_date >= %s)
            ORDER BY a.is_pinned DESC, a.created_at DESC
        """, (today, today))
        
        announcements = []
        for row in cursor.fetchall():
            ann = get_announcement_with_details(cursor, row['announcement_id'], user_id)
            if ann and check_user_can_view(cursor, ann, user_id):
                announcements.append(ann)
        
        # 過濾已讀（僅返回未讀）
        unread = [a for a in announcements if not a.get('is_read', False)]
        
        return {"items": unread, "total": len(unread)}


@router.get("/{announcement_id}")
def get_announcement(
    announcement_id: int,
    request: Request,
    user: dict = Depends(require_login),
):
    """
    取得單一公告
    """
    with get_cursor() as cursor:
        announcement = get_announcement_with_details(cursor, announcement_id, user["user_id"])
        if not announcement:
            raise HTTPException(status_code=404, detail="公告不存在")
        return announcement


@router.post("", status_code=201)
def create_announcement(
    request: Request,
    body: dict,
    user: dict = Depends(require_admin),
):
    """
    新增公告
    """
    with get_cursor() as cursor:
        # 新增公告
        cursor.execute("""
            INSERT INTO sys_announcement (
                category_id, title, content, target_type,
                is_pinned, is_active, push_notification,
                publish_date, expire_date, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING announcement_id
        """, (
            body.get("category_id"),
            body.get("title"),
            body.get("content"),
            body.get("target_type", "all"),
            body.get("is_pinned", False),
            body.get("is_active", True),
            body.get("push_notification", False),
            body.get("publish_date") or None,
            body.get("expire_date") or None,
            user["user_id"],
        ))
        announcement_id = cursor.fetchone()["announcement_id"]
        
        # 新增目標對象
        targets = body.get("targets", [])
        for target in targets:
            cursor.execute("""
                INSERT INTO sys_announcement_target (announcement_id, target_type, target_value)
                VALUES (%s, %s, %s)
            """, (announcement_id, target["target_type"], target["target_value"]))
        
        logger.info(f"公告 {announcement_id} 已由 {user['user_id']} 建立")
        
        # TODO: 推送通知（LINE/Telegram）
        if body.get("push_notification"):
            # 未來實作通知推送邏輯
            pass
        
        return {"success": True, "announcement_id": announcement_id}


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: int,
    request: Request,
    body: dict,
    user: dict = Depends(require_admin),
):
    """
    更新公告
    """
    with get_cursor() as cursor:
        # 確認公告存在
        cursor.execute("SELECT announcement_id FROM sys_announcement WHERE announcement_id = %s", (announcement_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="公告不存在")
        
        # 更新公告
        cursor.execute("""
            UPDATE sys_announcement SET
                category_id = %s,
                title = %s,
                content = %s,
                target_type = %s,
                is_pinned = %s,
                is_active = %s,
                push_notification = %s,
                publish_date = %s,
                expire_date = %s,
                updated_at = %s
            WHERE announcement_id = %s
        """, (
            body.get("category_id"),
            body.get("title"),
            body.get("content"),
            body.get("target_type", "all"),
            body.get("is_pinned", False),
            body.get("is_active", True),
            body.get("push_notification", False),
            body.get("publish_date") or None,
            body.get("expire_date") or None,
            datetime.now(),
            announcement_id,
        ))
        
        # 更新目標對象
        cursor.execute("DELETE FROM sys_announcement_target WHERE announcement_id = %s", (announcement_id,))
        targets = body.get("targets", [])
        for target in targets:
            cursor.execute("""
                INSERT INTO sys_announcement_target (announcement_id, target_type, target_value)
                VALUES (%s, %s, %s)
            """, (announcement_id, target["target_type"], target["target_value"]))
        
        logger.info(f"公告 {announcement_id} 已由 {user['user_id']} 更新")
        
        return {"success": True, "message": "公告更新成功"}


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    request: Request,
    user: dict = Depends(require_admin),
):
    """
    刪除公告
    """
    with get_cursor() as cursor:
        # 刪除附件檔案
        cursor.execute("""
            SELECT file_path FROM sys_announcement_attachment WHERE announcement_id = %s
        """, (announcement_id,))
        for row in cursor.fetchall():
            file_path = row['file_path']
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # 刪除公告（會連帶刪除 target, attachment, read）
        cursor.execute("DELETE FROM sys_announcement WHERE announcement_id = %s", (announcement_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="公告不存在")
        
        logger.info(f"公告 {announcement_id} 已由 {user['user_id']} 刪除")
        
        return {"success": True, "message": "公告刪除成功"}


# ============================================
# 附件管理 API
# ============================================

@router.post("/{announcement_id}/attachments")
async def upload_attachment(
    announcement_id: int,
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    """
    上傳公告附件
    """
    with get_cursor() as cursor:
        # 確認公告存在
        cursor.execute("SELECT announcement_id FROM sys_announcement WHERE announcement_id = %s", (announcement_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="公告不存在")
        
        # 儲存檔案
        file_ext = os.path.splitext(file.filename)[1]
        unique_name = f"{announcement_id}_{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 取得檔案大小
        file_size = os.path.getsize(file_path)
        
        # 新增附件記錄
        cursor.execute("""
            INSERT INTO sys_announcement_attachment (
                announcement_id, file_name, file_path, file_size, file_type
            ) VALUES (%s, %s, %s, %s, %s)
            RETURNING attachment_id
        """, (
            announcement_id,
            file.filename,
            file_path,
            file_size,
            file.content_type,
        ))
        attachment_id = cursor.fetchone()["attachment_id"]
        
        return {
            "success": True,
            "attachment_id": attachment_id,
            "file_name": file.filename,
        }


@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    request: Request,
    user: dict = Depends(require_admin),
):
    """
    刪除附件
    """
    with get_cursor() as cursor:
        # 取得附件資訊
        cursor.execute("""
            SELECT file_path FROM sys_announcement_attachment WHERE attachment_id = %s
        """, (attachment_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="附件不存在")
        
        # 刪除檔案
        file_path = row['file_path']
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 刪除記錄
        cursor.execute("DELETE FROM sys_announcement_attachment WHERE attachment_id = %s", (attachment_id,))
        
        return {"success": True, "message": "附件刪除成功"}


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    request: Request,
    user: dict = Depends(require_login),
):
    """
    下載附件
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT file_name, file_path, file_type 
            FROM sys_announcement_attachment 
            WHERE attachment_id = %s
        """, (attachment_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="附件不存在")
        
        file_path = row['file_path']
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="檔案不存在")
        
        return FileResponse(
            path=file_path,
            filename=row['file_name'],
            media_type=row['file_type'] or 'application/octet-stream',
        )


# ============================================
# 已讀記錄 API
# ============================================

@router.post("/{announcement_id}/read")
def mark_as_read(
    announcement_id: int,
    request: Request,
    user: dict = Depends(require_login),
):
    """
    標記公告為已讀
    """
    user_id = user["user_id"]
    
    with get_cursor() as cursor:
        # 確認公告存在
        cursor.execute("SELECT announcement_id FROM sys_announcement WHERE announcement_id = %s", (announcement_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="公告不存在")
        
        # 新增已讀記錄（忽略重複）
        cursor.execute("""
            INSERT INTO sys_announcement_read (announcement_id, user_id)
            VALUES (%s, %s)
            ON CONFLICT (announcement_id, user_id) DO NOTHING
        """, (announcement_id, user_id))
        
        return {"success": True, "message": "已標記為已讀"}
