"""
假日檔 API 路由模組
NOTE: 提供假日（例假日/補班日）的 CRUD 操作
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from database import get_cursor
from models import Holiday, HolidayCreate, HolidayUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/holidays", tags=["holidays"])


@router.get("/all")
def get_all_holidays(
    year: Optional[str] = Query(None, description="年份篩選 YYYY"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    sort_by: Optional[str] = Query(None, description="排序欄位"),
    sort_order: Optional[str] = Query(None, description="排序方向 asc/desc"),
):
    """
    取得所有假日記錄（維護頁面用）
    NOTE: 支援年份篩選、分頁與排序
    """
    try:
        with get_cursor() as cursor:
            # 動態組合 WHERE 條件
            conditions: List[str] = []
            params: list = []

            if year:
                conditions.append("date LIKE %s")
                params.append(f"{year}%")

            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            # 計算總數
            cursor.execute(f"SELECT COUNT(*) as total FROM holiday {where_clause}", params)
            total = cursor.fetchone()["total"]

            # 排序
            allowed_sort = {"date", "is_holiday", "description"}
            order_clause = "ORDER BY date DESC"
            if sort_by and sort_by in allowed_sort:
                direction = "ASC" if sort_order == "asc" else "DESC"
                order_clause = f"ORDER BY {sort_by} {direction}"

            # 分頁
            offset = (page - 1) * page_size
            sql = f"""
                SELECT date, is_holiday, description
                FROM holiday
                {where_clause}
                {order_clause}
                LIMIT %s OFFSET %s
            """
            cursor.execute(sql, params + [page_size, offset])
            rows = cursor.fetchall()

            return {
                "items": [dict(row) for row in rows],
                "total": total,
                "page": page,
                "page_size": page_size,
            }

    except Exception as e:
        logger.error(f"取得假日列表失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_holidays(
    start_date: str = Query(..., description="開始日期 YYYYMMDD"),
    end_date: str = Query(..., description="結束日期 YYYYMMDD"),
):
    """
    取得指定日期範圍內的假日資料
    NOTE: 供行事曆前端拉取例假日與補班日資訊
    """
    try:
        with get_cursor() as cursor:
            sql = """
                SELECT date, is_holiday, description
                FROM holiday
                WHERE date >= %s AND date <= %s
                ORDER BY date
            """
            cursor.execute(sql, (start_date, end_date))
            rows = cursor.fetchall()

            return {
                "items": [dict(row) for row in rows]
            }

    except Exception as e:
        logger.error(f"取得假日資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{date}", response_model=Holiday)
def get_holiday(date: str):
    """
    根據日期取得單一假日資料
    """
    try:
        with get_cursor() as cursor:
            cursor.execute(
                "SELECT date, is_holiday, description FROM holiday WHERE date = %s",
                (date,)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="此日期無假日資料")
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取得假日資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Holiday)
def create_holiday(holiday: HolidayCreate):
    """
    新增假日記錄
    """
    try:
        with get_cursor() as cursor:
            # 檢查是否已存在
            cursor.execute("SELECT date FROM holiday WHERE date = %s", (holiday.date,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="此日期已存在假日記錄")

            data = holiday.model_dump(exclude_none=True)
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = list(data.values())

            sql = f"INSERT INTO holiday ({columns}) VALUES ({placeholders}) RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"新增假日記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{date}", response_model=Holiday)
def update_holiday(date: str, holiday: HolidayUpdate):
    """
    更新假日記錄
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("SELECT date FROM holiday WHERE date = %s", (date,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="假日記錄不存在")

            data = holiday.model_dump(exclude_none=True)
            if not data:
                raise HTTPException(status_code=400, detail="沒有要更新的欄位")

            set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
            values = list(data.values()) + [date]

            sql = f"UPDATE holiday SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE date = %s RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新假日記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{date}")
def delete_holiday(date: str):
    """
    刪除假日記錄
    """
    try:
        with get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM holiday WHERE date = %s RETURNING date",
                (date,)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="假日記錄不存在")
            return {"message": "刪除成功", "date": date}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除假日記錄失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))
