/**
 * Attendance (請假記錄) 資料介面
 */
export interface Attendance {
    /** 員工編號 */
    emp_id: string;
    /** 請假日期 YYYYMMDD */
    leave_date: string;
    /** 假別 */
    leave_type: string;
    /** 0:天 1:上午 2:下午 3:小時 */
    day_period?: string;
    /** 請假天數 */
    duration_days?: number;
    /** 0:未填 1:已填 2:免填 */
    job_logged?: string;
    /** 0:未填 1:已填 2:免填 */
    mynote_logged?: string;
    /** 代理人 */
    substitute?: string;
    /** 備註 */
    remark?: string;
}

/**
 * 新增/編輯請假記錄表單資料
 */
export type AttendanceFormData = Attendance;

/**
 * 時段選項
 */
export const DAY_PERIOD_OPTIONS = [
    { value: '0', label: '整天' },
    { value: '1', label: '上午' },
    { value: '2', label: '下午' },
    { value: '3', label: '小時' },
] as const;

/**
 * 登記狀態選項
 */
export const LOG_STATUS_OPTIONS = [
    { value: '0', label: '未填' },
    { value: '1', label: '已填' },
    { value: '2', label: '免填' },
] as const;

// NOTE: 假別清單已改為從 API 動態載入，請使用 useAttendance hook 中的 leaveTypes

