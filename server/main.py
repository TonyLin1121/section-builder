"""
FastAPI 主應用
NOTE: 提供 member 資料表的 CRUD API
"""
import logging
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from database import get_cursor
from models import (
    Member, MemberCreate, MemberUpdate,
    Attendance, AttendanceCreate, AttendanceUpdate,
    CodeTable, CodeTableCreate, CodeTableUpdate
)
from csrf import (
    CSRFMiddleware,
    generate_csrf_token,
    set_csrf_cookie,
    CSRF_COOKIE_NAME,
)

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="部門人員管理 API",
    description="提供員工資料的 CRUD 操作",
    version="1.0.0",
)

# CORS 設定 - 允許前端跨域請求
# NOTE: 在 Docker 環境中，前端透過 Nginx 反向代理存取 API
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:80",
    "http://127.0.0.1:80",
]

# 從環境變數讀取額外的允許來源
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    allowed_origins.extend(extra_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token"],  # 允許前端讀取 CSRF header
)

# 添加 CSRF 中間件
# NOTE: CSRF 中間件必須在 CORS 之後添加
app.add_middleware(CSRFMiddleware)


@app.get("/health")
def health_check():
    """
    健康檢查端點
    NOTE: 用於 Docker 健康檢查和負載平衡器探測
    """
    return {"status": "healthy", "service": "section-builder-api"}


@app.get("/")
def root():
    """
    API 根路徑
    """
    return {"message": "部門人員管理 API", "version": "1.0.0"}


@app.get("/api/csrf-token")
def get_csrf_token():
    """
    取得 CSRF Token
    NOTE: 前端在應用啟動時調用此端點獲取 token，
          token 會同時設置在 Cookie 和回應 body 中
    """
    token = generate_csrf_token()
    response = JSONResponse(content={"csrf_token": token})
    set_csrf_cookie(response, token)
    return response


@app.get("/api/members")
def get_members(
    search: Optional[str] = Query(None, description="搜尋關鍵字"),
    division: Optional[str] = Query(None, description="部門篩選"),
    is_employed: Optional[bool] = Query(None, description="在職狀態篩選"),
    member_type: Optional[List[str]] = Query(None, description="員工類型篩選，可多選 (member/manager/intern/consultant/outsourcing)"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    sort_by: Optional[str] = Query(None, description="排序欄位"),
    sort_order: Optional[str] = Query("asc", description="排序方向 asc/desc"),
):
    """
    取得所有員工清單
    支援分頁、排序和篩選
    """
    try:
        with get_cursor() as cursor:
            # 建立 SQL 查詢
            base_sql = "SELECT * FROM member WHERE 1=1"
            params = []

            if search:
                base_sql += """ AND (
                    chinese_name ILIKE %s OR 
                    name ILIKE %s OR 
                    emp_id ILIKE %s OR
                    email ILIKE %s OR
                    job_title ILIKE %s
                )"""
                search_pattern = f"%{search}%"
                params.extend([search_pattern] * 5)

            if division:
                base_sql += " AND division_name = %s"
                params.append(division)

            if is_employed is not None:
                base_sql += " AND is_employed = %s"
                params.append(is_employed)

            # 員工類型篩選（支援多選，使用 OR 條件）
            if member_type and len(member_type) > 0:
                type_column_map = {
                    'member': 'is_member',
                    'manager': 'is_manager',
                    'intern': 'is_intern',
                    'consultant': 'is_consultant',
                    'outsourcing': 'is_outsourcing',
                }
                # 過濾有效的類型
                valid_types = [t for t in member_type if t in type_column_map]
                if valid_types:
                    type_conditions = [f"{type_column_map[t]} = true" for t in valid_types]
                    base_sql += f" AND ({' OR '.join(type_conditions)})"

            # 計算總筆數
            count_sql = f"SELECT COUNT(*) as total FROM ({base_sql}) as subquery"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']

            # 排序
            allowed_sort_fields = ['emp_id', 'chinese_name', 'name', 'division_name', 'job_title', 'email']
            if sort_by and sort_by in allowed_sort_fields:
                order_direction = 'ASC' if sort_order == 'asc' else 'DESC'
                base_sql += f" ORDER BY {sort_by} {order_direction}"
            else:
                base_sql += " ORDER BY emp_id"

            # 分頁
            offset = (page - 1) * page_size
            base_sql += " LIMIT %s OFFSET %s"
            params.extend([page_size, offset])

            cursor.execute(base_sql, params)
            rows = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            return {
                "items": [dict(row) for row in rows],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            }

    except Exception as e:
        logger.error(f"取得員工清單失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/members/{emp_id}", response_model=Member)
def get_member(emp_id: str):
    """
    根據員工編號取得單一員工資料
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("SELECT * FROM member WHERE emp_id = %s", (emp_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="員工不存在")
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取得員工資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/members", response_model=Member)
def create_member(member: MemberCreate):
    """
    新增員工
    """
    try:
        with get_cursor() as cursor:
            # 檢查員工編號是否已存在
            cursor.execute("SELECT emp_id FROM member WHERE emp_id = %s", (member.emp_id,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="員工編號已存在")

            # 取得非 None 的欄位
            data = member.model_dump(exclude_none=True)
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = list(data.values())

            sql = f"INSERT INTO member ({columns}) VALUES ({placeholders}) RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"新增員工失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/members/{emp_id}", response_model=Member)
def update_member(emp_id: str, member: MemberUpdate):
    """
    更新員工資料
    """
    try:
        with get_cursor() as cursor:
            # 檢查員工是否存在
            cursor.execute("SELECT emp_id FROM member WHERE emp_id = %s", (emp_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="員工不存在")

            # 取得非 None 的欄位進行更新
            data = member.model_dump(exclude_none=True)
            if not data:
                raise HTTPException(status_code=400, detail="沒有要更新的欄位")

            set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
            values = list(data.values()) + [emp_id]

            sql = f"UPDATE member SET {set_clause} WHERE emp_id = %s RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新員工失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/members/{emp_id}")
def delete_member(emp_id: str):
    """
    刪除員工
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("DELETE FROM member WHERE emp_id = %s RETURNING emp_id", (emp_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="員工不存在")
            return {"message": "刪除成功", "emp_id": emp_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除員工失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/divisions", response_model=List[str])
def get_divisions():
    """
    取得所有部門清單（用於篩選下拉選單）
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT division_name 
                FROM member 
                WHERE division_name IS NOT NULL AND division_name != ''
                ORDER BY division_name
            """)
            rows = cursor.fetchall()
            return [row["division_name"] for row in rows]

    except Exception as e:
        logger.error(f"取得部門清單失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Attendance (請假記錄) API 端點
# ============================================

@app.get("/api/attendance")
def get_attendance_records(
    emp_id: Optional[str] = Query(None, description="員工編號篩選"),
    emp_name: Optional[str] = Query(None, description="員工姓名篩選"),
    leave_type: Optional[str] = Query(None, description="假別篩選"),
    start_date: Optional[str] = Query(None, description="開始日期 YYYYMMDD"),
    end_date: Optional[str] = Query(None, description="結束日期 YYYYMMDD"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    sort_by: Optional[str] = Query(None, description="排序欄位"),
    sort_order: Optional[str] = Query("desc", description="排序方向 asc/desc"),
):
    """
    取得請假記錄清單
    支援分頁、排序和篩選
    """
    try:
        with get_cursor() as cursor:
            # 基礎查詢（JOIN 員工資料取得姓名）
            base_sql = """
                SELECT a.*, m.chinese_name, m.name as english_name
                FROM member_attendance a
                LEFT JOIN member m ON a.emp_id = m.emp_id
                WHERE 1=1
            """
            params = []

            if emp_id:
                base_sql += " AND a.emp_id = %s"
                params.append(emp_id)

            if emp_name:
                base_sql += " AND (m.chinese_name LIKE %s OR m.name LIKE %s)"
                params.append(f"%{emp_name}%")
                params.append(f"%{emp_name}%")

            if leave_type:
                base_sql += " AND a.leave_type = %s"
                params.append(leave_type)

            if start_date:
                base_sql += " AND a.leave_date >= %s"
                params.append(start_date)

            if end_date:
                base_sql += " AND a.leave_date <= %s"
                params.append(end_date)

            # 計算總筆數
            count_sql = f"SELECT COUNT(*) as total FROM ({base_sql}) as subquery"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']

            # 排序
            allowed_sort_fields = ['emp_id', 'leave_date', 'leave_type', 'duration_days', 'chinese_name']
            if sort_by and sort_by in allowed_sort_fields:
                order_direction = 'ASC' if sort_order == 'asc' else 'DESC'
                base_sql += f" ORDER BY {sort_by} {order_direction}"
            else:
                base_sql += " ORDER BY a.leave_date DESC, a.emp_id"

            # 分頁
            offset = (page - 1) * page_size
            base_sql += " LIMIT %s OFFSET %s"
            params.extend([page_size, offset])

            cursor.execute(base_sql, params)
            rows = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            return {
                "items": [dict(row) for row in rows],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            }

    except Exception as e:
        logger.error(f"取得請假記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/api/attendance/{emp_id}/{leave_date}/{leave_type}", response_model=Attendance)
def get_attendance_record(emp_id: str, leave_date: str, leave_type: str):
    """
    根據複合主鍵取得單一請假記錄
    """
    try:
        with get_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM member_attendance WHERE emp_id = %s AND leave_date = %s AND leave_type = %s",
                (emp_id, leave_date, leave_type)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="請假記錄不存在")
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取得請假記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/attendance", response_model=Attendance)
def create_attendance_record(attendance: AttendanceCreate):
    """
    新增請假記錄
    """
    try:
        with get_cursor() as cursor:
            # 檢查記錄是否已存在
            cursor.execute(
                "SELECT emp_id FROM member_attendance WHERE emp_id = %s AND leave_date = %s AND leave_type = %s",
                (attendance.emp_id, attendance.leave_date, attendance.leave_type)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="此請假記錄已存在")

            # 取得非 None 的欄位
            data = attendance.model_dump(exclude_none=True)
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = list(data.values())

            sql = f"INSERT INTO member_attendance ({columns}) VALUES ({placeholders}) RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"新增請假記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/attendance/{emp_id}/{leave_date}/{leave_type}", response_model=Attendance)
def update_attendance_record(emp_id: str, leave_date: str, leave_type: str, attendance: AttendanceUpdate):
    """
    更新請假記錄
    """
    try:
        with get_cursor() as cursor:
            # 檢查記錄是否存在
            cursor.execute(
                "SELECT emp_id FROM member_attendance WHERE emp_id = %s AND leave_date = %s AND leave_type = %s",
                (emp_id, leave_date, leave_type)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="請假記錄不存在")

            # 取得非 None 的欄位進行更新
            data = attendance.model_dump(exclude_none=True)
            if not data:
                raise HTTPException(status_code=400, detail="沒有要更新的欄位")

            set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
            values = list(data.values()) + [emp_id, leave_date, leave_type]

            sql = f"UPDATE member_attendance SET {set_clause} WHERE emp_id = %s AND leave_date = %s AND leave_type = %s RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新請假記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/attendance/{emp_id}/{leave_date}/{leave_type}")
def delete_attendance_record(emp_id: str, leave_date: str, leave_type: str):
    """
    刪除請假記錄
    """
    try:
        with get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM member_attendance WHERE emp_id = %s AND leave_date = %s AND leave_type = %s RETURNING emp_id",
                (emp_id, leave_date, leave_type)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="請假記錄不存在")
            return {"message": "刪除成功", "emp_id": emp_id, "leave_date": leave_date, "leave_type": leave_type}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除請假記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# CodeTable (參數檔) API 端點
# ============================================

@app.get("/api/codes")
def get_code_tables(
    code_code: Optional[str] = Query(None, description="主分類代碼篩選"),
    used_mark: Optional[str] = Query(None, description="使用標記篩選"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    sort_by: Optional[str] = Query(None, description="排序欄位"),
    sort_order: Optional[str] = Query("asc", description="排序方向 asc/desc"),
):
    """
    取得參數檔清單
    支援分頁、排序和篩選
    """
    try:
        with get_cursor() as cursor:
            base_sql = "SELECT * FROM gen001_allcode WHERE 1=1"
            params = []

            if code_code:
                base_sql += " AND code_code = %s"
                params.append(code_code)

            if used_mark:
                base_sql += " AND used_mark = %s"
                params.append(used_mark)

            # 計算總筆數
            count_sql = f"SELECT COUNT(*) as total FROM ({base_sql}) as subquery"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']

            # 排序
            allowed_sort_fields = ['code_code', 'code_subcode', 'code_subname', 'upddate', 'used_mark']
            if sort_by and sort_by in allowed_sort_fields:
                order_direction = 'ASC' if sort_order == 'asc' else 'DESC'
                base_sql += f" ORDER BY {sort_by} {order_direction}"
            else:
                base_sql += " ORDER BY code_code, code_subcode"

            # 分頁
            offset = (page - 1) * page_size
            base_sql += " LIMIT %s OFFSET %s"
            params.extend([page_size, offset])

            cursor.execute(base_sql, params)
            rows = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            return {
                "items": [dict(row) for row in rows],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            }

    except Exception as e:
        logger.error(f"取得參數檔失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/codes/leave-types", response_model=List[CodeTable])
def get_leave_types():
    """
    取得假別清單（code_code='0001'）
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM gen001_allcode 
                WHERE code_code = '0001' AND used_mark = '1'
                ORDER BY code_subcode
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    except Exception as e:
        logger.error(f"取得假別清單失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/codes/{code_code}/{code_subcode}", response_model=CodeTable)
def get_code_table(code_code: str, code_subcode: str):
    """
    根據複合主鍵取得單一參數
    """
    try:
        with get_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM gen001_allcode WHERE code_code = %s AND code_subcode = %s",
                (code_code, code_subcode)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="參數不存在")
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取得參數失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/codes", response_model=CodeTable)
def create_code_table(code: CodeTableCreate):
    """
    新增參數
    """
    from datetime import datetime
    try:
        with get_cursor() as cursor:
            # 檢查是否已存在
            cursor.execute(
                "SELECT code_code FROM gen001_allcode WHERE code_code = %s AND code_subcode = %s",
                (code.code_code, code.code_subcode)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="此參數已存在")

            # 取得非 None 的欄位
            data = code.model_dump(exclude_none=True)
            
            # 自動設定更新日期和時間
            now = datetime.now()
            data['upddate'] = now.strftime('%Y%m%d')
            data['updtime'] = now.strftime('%H%M%S')
            
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = list(data.values())

            sql = f"INSERT INTO gen001_allcode ({columns}) VALUES ({placeholders}) RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"新增參數失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/codes/{code_code}/{code_subcode}", response_model=CodeTable)
def update_code_table(code_code: str, code_subcode: str, code: CodeTableUpdate):
    """
    更新參數
    """
    from datetime import datetime
    try:
        with get_cursor() as cursor:
            # 檢查是否存在
            cursor.execute(
                "SELECT code_code FROM gen001_allcode WHERE code_code = %s AND code_subcode = %s",
                (code_code, code_subcode)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="參數不存在")

            # 取得非 None 的欄位進行更新
            data = code.model_dump(exclude_none=True)
            
            # 自動設定更新日期和時間
            now = datetime.now()
            data['upddate'] = now.strftime('%Y%m%d')
            data['updtime'] = now.strftime('%H%M%S')

            set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
            values = list(data.values()) + [code_code, code_subcode]

            sql = f"UPDATE gen001_allcode SET {set_clause} WHERE code_code = %s AND code_subcode = %s RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新參數失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/codes/{code_code}/{code_subcode}")
def delete_code_table(code_code: str, code_subcode: str):
    """
    刪除參數
    """
    try:
        with get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM gen001_allcode WHERE code_code = %s AND code_subcode = %s RETURNING code_code",
                (code_code, code_subcode)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="參數不存在")
            return {"message": "刪除成功", "code_code": code_code, "code_subcode": code_subcode}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除參數失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
