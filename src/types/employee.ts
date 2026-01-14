/**
 * Member 資料介面
 * NOTE: 對應 PostgreSQL member 資料表結構
 */
export interface Member {
  /** 員工編號（主鍵） */
  emp_id: string;
  /** 中文姓名 */
  chinese_name?: string;
  /** 英文姓名 */
  name?: string;
  /** 部門代號 */
  division_no?: string;
  /** 部門名稱 */
  division_name?: string;
  /** 職稱 */
  job_title?: string;
  /** 電子郵件 */
  email?: string;
  /** 手機 */
  cellphone?: string;
  /** 公司分機 */
  office_phone?: string;
  /** 生日 */
  birthday?: string;
  /** 正職員工 */
  is_member?: boolean;
  /** 經理人 */
  is_manager?: boolean;
  /** 工讀生 */
  is_intern?: boolean;
  /** 顧問 */
  is_consultant?: boolean;
  /** 外包 */
  is_outsourcing?: boolean;
  /** 在職 */
  is_employed?: boolean;
  /** LINE ID */
  line_id?: string;
  /** Telegram ID */
  telegram_id?: string;
  /** 備註 */
  remark?: string;
  /** 預算單位代號 */
  預算單位代號?: string;
  /** 預算單位名稱 */
  預算單位名稱?: string;
}

/**
 * 新增/編輯員工表單資料
 */
export type MemberFormData = Omit<Member, 'emp_id'> & { emp_id?: string };

/**
 * 員工身份類型選項
 */
export const MEMBER_TYPES = [
  { key: 'is_member', label: '正職員工' },
  { key: 'is_manager', label: '經理人' },
  { key: 'is_intern', label: '工讀生' },
  { key: 'is_consultant', label: '顧問' },
  { key: 'is_outsourcing', label: '外包' },
] as const;

// NOTE: 保留舊的 Employee 介面以兼容現有程式碼
export type Employee = Member;
export type EmployeeFormData = MemberFormData;

// 保留舊的部門常數（將由 API 動態取得）
export const DEPARTMENTS = [] as string[];
