"""
Pydantic 資料模型
NOTE: 對應 PostgreSQL member 資料表結構
"""
from typing import Optional, List
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


# ============================================
# ProjectInfo (專案資訊) 模型
# ============================================

class ProjectInfoBase(BaseModel):
    """
    專案資訊基礎資料模型
    NOTE: 欄位名稱與資料表 project_info 一致
    """
    so_no: Optional[str] = Field(None, max_length=7, description="合約代號")
    project_name: Optional[str] = Field(None, max_length=100, description="專案名稱")
    customer_name: Optional[str] = Field(None, max_length=100, description="客戶名稱")
    project_plan_sdate: Optional[str] = Field(None, max_length=10, description="專案計畫開始日")
    project_plan_edate: Optional[str] = Field(None, max_length=10, description="專案計畫結束日")
    warranty_sdate: Optional[str] = Field(None, max_length=10, description="保固開始日")
    warranty_edate: Optional[str] = Field(None, max_length=10, description="保固結束日")
    project_amt: Optional[float] = Field(None, description="專案金額")
    project_department: Optional[str] = Field(None, max_length=100, description="專案歸屬部門")
    project_manager: Optional[str] = Field(None, max_length=20, description="專案負責人")
    project_status: Optional[str] = Field(None, max_length=10, description="專案狀態")
    agreed_acceptance_date: Optional[str] = Field(None, max_length=10, description="約定驗收日")
    estimated_acceptance_date: Optional[str] = Field(None, max_length=10, description="預計驗收日")
    actual_acceptance_date: Optional[str] = Field(None, max_length=10, description="實際驗收日")
    actual_progress: Optional[float] = Field(None, description="專案實際進度")
    project_income: Optional[str] = Field(None, max_length=255, description="專案收入")
    actual_cost: Optional[float] = Field(None, description="專案實際成本")
    project_category: Optional[str] = Field(None, max_length=50, description="專案類別")
    project_plan_progress: Optional[float] = Field(None, description="專案計畫進度")
    progress_status: Optional[str] = Field(None, max_length=10, description="進度狀態")
    manpower_status: Optional[str] = Field(None, max_length=10, description="人力狀態")
    quality_status: Optional[str] = Field(None, max_length=10, description="品質狀態")
    plan_status: Optional[str] = Field(None, max_length=10, description="計畫狀態")
    is_penalty: Optional[bool] = Field(None, description="是否罰則")
    development_phase_amt: Optional[float] = Field(None, description="開發/維護階段金額")
    estimated_dev_person_month: Optional[float] = Field(None, description="開發/維護階段預估人月")
    actual_person_month: Optional[float] = Field(None, description="全案實際人月")
    estimated_warranty_cost: Optional[float] = Field(None, description="預估保固成本")
    estimated_warranty_person_month: Optional[float] = Field(None, description="預估保固人月")
    actual_warranty_cost: Optional[float] = Field(None, description="保固階段實際成本")
    actual_warranty_person_month: Optional[float] = Field(None, description="保固階段實際人月")


class ProjectInfoCreate(ProjectInfoBase):
    """
    新增專案時使用的模型
    """
    project_id: str = Field(..., max_length=7, description="專案代號")


class ProjectInfoUpdate(ProjectInfoBase):
    """
    更新專案時使用的模型
    """
    pass


class ProjectInfo(ProjectInfoBase):
    """
    完整專案資料模型（包含主鍵）
    """
    project_id: str = Field(..., max_length=7, description="專案代號")

    class Config:
        from_attributes = True


# ============================================
# Announcement (公告) 模型
# ============================================

class AnnouncementCategoryBase(BaseModel):
    """
    公告類別基礎資料模型
    """
    category_name: Optional[str] = Field(None, max_length=50, description="類別名稱")
    icon: Optional[str] = Field(None, max_length=50, description="類別圖示")
    sort_order: Optional[int] = Field(0, description="排序順序")
    is_active: Optional[bool] = Field(True, description="是否啟用")


class AnnouncementCategoryCreate(AnnouncementCategoryBase):
    """
    新增公告類別時使用的模型
    """
    category_id: str = Field(..., max_length=20, description="類別代碼")
    category_name: str = Field(..., max_length=50, description="類別名稱")


class AnnouncementCategory(AnnouncementCategoryBase):
    """
    完整公告類別資料模型
    """
    category_id: str = Field(..., max_length=20, description="類別代碼")

    class Config:
        from_attributes = True


class AnnouncementTargetBase(BaseModel):
    """
    公告目標對象模型
    """
    target_type: str = Field(..., max_length=20, description="目標類型（role/division/user）")
    target_value: str = Field(..., max_length=50, description="目標值")


class AnnouncementAttachment(BaseModel):
    """
    公告附件資料模型
    """
    attachment_id: int = Field(..., description="附件編號")
    announcement_id: int = Field(..., description="公告編號")
    file_name: str = Field(..., max_length=255, description="檔案名稱")
    file_path: str = Field(..., max_length=500, description="檔案路徑")
    file_size: Optional[int] = Field(None, description="檔案大小")
    file_type: Optional[str] = Field(None, max_length=100, description="檔案類型")

    class Config:
        from_attributes = True


class AnnouncementBase(BaseModel):
    """
    公告基礎資料模型
    """
    category_id: Optional[str] = Field(None, max_length=20, description="類別代碼")
    title: Optional[str] = Field(None, max_length=200, description="公告標題")
    content: Optional[str] = Field(None, description="公告內容")
    target_type: Optional[str] = Field("all", max_length=20, description="目標類型（all/role/division/user）")
    is_pinned: Optional[bool] = Field(False, description="是否置頂")
    is_active: Optional[bool] = Field(True, description="是否啟用")
    push_notification: Optional[bool] = Field(False, description="是否推送通知")
    publish_date: Optional[str] = Field(None, max_length=10, description="發布日期")
    expire_date: Optional[str] = Field(None, max_length=10, description="到期日期")


class AnnouncementCreate(AnnouncementBase):
    """
    新增公告時使用的模型
    """
    title: str = Field(..., max_length=200, description="公告標題")
    targets: Optional[List[AnnouncementTargetBase]] = Field(None, description="目標對象清單")


class AnnouncementUpdate(AnnouncementBase):
    """
    更新公告時使用的模型
    """
    targets: Optional[List[AnnouncementTargetBase]] = Field(None, description="目標對象清單")


class Announcement(AnnouncementBase):
    """
    完整公告資料模型（包含主鍵與關聯資料）
    """
    announcement_id: int = Field(..., description="公告編號")
    created_by: Optional[str] = Field(None, max_length=20, description="建立者")
    created_at: Optional[str] = Field(None, description="建立時間")
    updated_at: Optional[str] = Field(None, description="更新時間")
    category_name: Optional[str] = Field(None, description="類別名稱")
    category_icon: Optional[str] = Field(None, description="類別圖示")
    targets: Optional[List[AnnouncementTargetBase]] = Field(None, description="目標對象")
    attachments: Optional[List[AnnouncementAttachment]] = Field(None, description="附件清單")
    is_read: Optional[bool] = Field(None, description="是否已讀（使用者視角）")

    class Config:
        from_attributes = True
