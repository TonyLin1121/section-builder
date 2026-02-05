/**
 * 休假統計 API 服務
 */
import { httpRequest } from './httpClient';

const API_BASE = '/leave-stats';

/**
 * 單一假別統計資料
 */
export interface LeaveTypeStats {
    leave_type_name: string;
    available: number;
    used: number;
    remaining: number;
}

/**
 * 員工休假統計記錄
 */
export interface LeaveStatRecord {
    emp_id: string;
    english_name: string;
    chinese_name: string;
    leave_stats: Record<string, LeaveTypeStats>;
}

/**
 * 假別資訊
 */
export interface LeaveTypeInfo {
    code: string;
    name: string;
}

/**
 * 休假統計回應
 */
export interface LeaveStatsResponse {
    items: LeaveStatRecord[];
    leave_types: LeaveTypeInfo[];
    mode: 'year' | 'month';
    year: string;
    month: string | null;
    total: number;
}

/**
 * 查詢參數
 */
export interface LeaveStatsQueryParams {
    mode?: 'year' | 'month';
    year: string;
    month?: string;
    sort_by?: 'emp_id' | 'english_name' | 'chinese_name';
    sort_order?: 'asc' | 'desc';
}

/**
 * 取得休假統計資料
 */
export async function getLeaveStats(
    params: LeaveStatsQueryParams
): Promise<LeaveStatsResponse> {
    const searchParams = new URLSearchParams();

    searchParams.append('year', params.year);

    if (params.mode) {
        searchParams.append('mode', params.mode);
    }
    if (params.month) {
        searchParams.append('month', params.month);
    }
    if (params.sort_by) {
        searchParams.append('sort_by', params.sort_by);
    }
    if (params.sort_order) {
        searchParams.append('sort_order', params.sort_order);
    }

    const queryString = searchParams.toString();
    const url = `${API_BASE}?${queryString}`;

    return httpRequest<LeaveStatsResponse>(url);
}
