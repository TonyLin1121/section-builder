"""
Pydantic 資料模型
NOTE: 對應 PostgreSQL member 資料表結構
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class MemberBase(BaseModel):
    """
    會員基礎資料模型（用於新增/更新）
    """
    chinese_name: Optional[str] = Field(None, max_length=20, description="中文姓名")
    name: Optional[str] = Field(None, max_length=20, description="英文姓名")
    division_no: Optional[str] = Field(None, max_length=10, description="部門代號")
    division_name: Optional[str] = Field(None, max_length=20, description="部門名稱")
    job_title: Optional[str] = Field(None, max_length=255, description="職稱")
    email: Optional[str] = Field(None, max_length=100, description="電子郵件")
    cellphone: Optional[str] = Field(None, max_length=20, description="手機")
    office_phone: Optional[str] = Field(None, max_length=255, description="公司分機")
    birthday: Optional[str] = Field(None, max_length=10, description="生日")
    is_member: Optional[bool] = Field(False, description="正職員工")
    is_manager: Optional[bool] = Field(False, description="經理人")
    is_intern: Optional[bool] = Field(False, description="工讀生")
    is_consultant: Optional[bool] = Field(False, description="顧問")
    is_outsourcing: Optional[bool] = Field(False, description="外包")
    is_employed: Optional[bool] = Field(True, description="在職")
    line_id: Optional[str] = Field(None, max_length=50, description="LINE ID")
    telegram_id: Optional[str] = Field(None, max_length=50, description="Telegram ID")
    remark: Optional[str] = Field(None, max_length=255, description="備註")
    預算單位代號: Optional[str] = Field(None, max_length=10, alias="budget_unit_code")
    預算單位名稱: Optional[str] = Field(None, max_length=10, alias="budget_unit_name")


class MemberCreate(MemberBase):
    """
    新增會員時使用的模型
    """
    emp_id: str = Field(..., max_length=12, description="員工編號")


class MemberUpdate(MemberBase):
    """
    更新會員時使用的模型（所有欄位皆為可選）
    """
    pass


class Member(MemberBase):
    """
    完整會員資料模型（包含主鍵）
    """
    emp_id: str = Field(..., max_length=12, description="員工編號")

    class Config:
        from_attributes = True


# ============================================
# Attendance (請假記錄) 模型
# ============================================

class AttendanceBase(BaseModel):
    """
    請假記錄基礎資料模型
    """
    day_period: Optional[str] = Field(None, max_length=1, description="0:天 1:上午 2:下午 3:小時")
    duration_days: Optional[float] = Field(None, description="請假天數")
    job_logged: Optional[str] = Field(None, max_length=1, description="0:未填 1:已填 2:免填")
    mynote_logged: Optional[str] = Field(None, max_length=1, description="0:未填 1:已填 2:免填")
    substitute: Optional[str] = Field(None, max_length=50, description="代理人")
    remark: Optional[str] = Field(None, max_length=255, description="備註")


class AttendanceCreate(AttendanceBase):
    """
    新增請假記錄時使用的模型
    """
    emp_id: str = Field(..., max_length=12, description="員工編號")
    leave_date: str = Field(..., max_length=8, description="請假日期 YYYYMMDD")
    leave_type: str = Field(..., max_length=4, description="假別")


class AttendanceUpdate(AttendanceBase):
    """
    更新請假記錄時使用的模型
    """
    pass


class Attendance(AttendanceBase):
    """
    完整請假記錄資料模型（包含複合主鍵）
    """
    emp_id: str = Field(..., max_length=12, description="員工編號")
    leave_date: str = Field(..., max_length=8, description="請假日期 YYYYMMDD")
    leave_type: str = Field(..., max_length=4, description="假別")

    class Config:
        from_attributes = True


# ============================================
# CodeTable (參數檔) 模型
# ============================================

class CodeTableBase(BaseModel):
    """
    參數檔基礎資料模型
    """
    code_subname: Optional[str] = Field(None, max_length=20, description="子分類名稱")
    code_content: Optional[str] = Field(None, max_length=100, description="內容說明")
    sysmark: Optional[str] = Field(None, max_length=1, description="系統標記")
    used_mark: Optional[str] = Field(None, max_length=1, description="使用標記")
    upd_userid: Optional[str] = Field(None, max_length=10, description="更新者")
    chk_userid: Optional[str] = Field(None, max_length=10, description="檢查者")
    upddate: Optional[str] = Field(None, max_length=8, description="更新日期")
    updtime: Optional[str] = Field(None, max_length=8, description="更新時間")
    remark: Optional[str] = Field(None, max_length=30, description="備註")


class CodeTableCreate(CodeTableBase):
    """
    新增參數時使用的模型
    """
    code_code: str = Field(..., max_length=4, description="主分類代碼")
    code_subcode: str = Field(..., max_length=4, description="子分類代碼")


class CodeTableUpdate(CodeTableBase):
    """
    更新參數時使用的模型
    """
    pass


class CodeTable(CodeTableBase):
    """
    完整參數資料模型（包含複合主鍵）
    """
    code_code: str = Field(..., max_length=4, description="主分類代碼")
    code_subcode: str = Field(..., max_length=4, description="子分類代碼")

    class Config:
        from_attributes = True


# ============================================
# AnnualLeave (年度休假) 模型
# ============================================

class AnnualLeaveBase(BaseModel):
    """
    年度休假基礎資料模型
    """
    days_of_leave: Optional[float] = Field(None, ge=0, le=365.5, description="可休天數")
    remark: Optional[str] = Field(None, max_length=255, description="備註")


class AnnualLeaveCreate(AnnualLeaveBase):
    """
    新增年度休假時使用的模型
    """
    emp_id: str = Field(..., max_length=12, description="員工編號")
    year: str = Field(..., min_length=4, max_length=4, description="西元年度")
    leave_type: str = Field(..., max_length=4, description="假別")
    days_of_leave: float = Field(..., ge=0, le=365.5, description="可休天數")


class AnnualLeaveUpdate(AnnualLeaveBase):
    """
    更新年度休假時使用的模型
    """
    pass


class AnnualLeave(AnnualLeaveBase):
    """
    完整年度休假資料模型（包含複合主鍵）
    """
    emp_id: str = Field(..., max_length=12, description="員工編號")
    year: str = Field(..., max_length=4, description="西元年度")
    leave_type: str = Field(..., max_length=4, description="假別")

    class Config:
        from_attributes = True

