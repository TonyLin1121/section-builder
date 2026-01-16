/**
 * 年度休假 API 服務
 */
import { httpRequest } from './httpClient';

const API_BASE = '/annual-leave';

/**
 * 年度休假記錄資料結構
 */
export interface AnnualLeaveRecord {
    emp_id: string;
    year: string;
    leave_type: string;
    days_of_leave: number;
    remark?: string;
    // JOIN 後的員工資料
    chinese_name?: string;
    english_name?: string;
}

/**
 * 新增年度休假的表單資料
 */
export interface AnnualLeaveFormData {
    emp_id: string;
    year: string;
    leave_type: string;
    days_of_leave: number;
    remark?: string;
}

/**
 * 分頁回應結構
 */
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/**
 * 查詢參數
 */
interface AnnualLeaveQueryParams {
    emp_id?: string;
    emp_name?: string;
    year?: string;
    leave_type?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

/**
 * 取得年度休假記錄列表
 */
export async function getAnnualLeaveRecords(
    params: AnnualLeaveQueryParams = {}
): Promise<PaginatedResponse<AnnualLeaveRecord>> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            searchParams.append(key, String(value));
        }
    });

    const queryString = searchParams.toString();
    const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

    return httpRequest<PaginatedResponse<AnnualLeaveRecord>>(url);
}

/**
 * 取得單筆年度休假記錄
 */
export async function getAnnualLeaveRecord(
    empId: string,
    year: string,
    leaveType: string
): Promise<AnnualLeaveRecord> {
    return httpRequest<AnnualLeaveRecord>(
        `${API_BASE}/${encodeURIComponent(empId)}/${encodeURIComponent(year)}/${encodeURIComponent(leaveType)}`
    );
}

/**
 * 新增年度休假記錄
 */
export async function createAnnualLeaveRecord(
    data: AnnualLeaveFormData
): Promise<{ message: string; emp_id: string; year: string; leave_type: string }> {
    return httpRequest<{ message: string; emp_id: string; year: string; leave_type: string }>(
        API_BASE,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    );
}

/**
 * 更新年度休假記錄
 */
export async function updateAnnualLeaveRecord(
    empId: string,
    year: string,
    leaveType: string,
    data: Partial<AnnualLeaveFormData>
): Promise<{ message: string }> {
    return httpRequest<{ message: string }>(
        `${API_BASE}/${encodeURIComponent(empId)}/${encodeURIComponent(year)}/${encodeURIComponent(leaveType)}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
}

/**
 * 刪除年度休假記錄
 */
export async function deleteAnnualLeaveRecord(
    empId: string,
    year: string,
    leaveType: string
): Promise<{ message: string }> {
    return httpRequest<{ message: string }>(
        `${API_BASE}/${encodeURIComponent(empId)}/${encodeURIComponent(year)}/${encodeURIComponent(leaveType)}`,
        {
            method: 'DELETE',
        }
    );
}
