/**
 * Attendance API 服務模組
 */
import type { Attendance, AttendanceFormData } from '../types/attendance';
import { httpRequest, type PaginatedResponse } from './httpClient';

/**
 * 假別資料介面（來自 gen001_allcode）
 */
export interface LeaveType {
    code_code: string;
    code_subcode: string;
    code_subname: string;
    code_content?: string;
    used_mark?: string;
}

/**
 * 請假記錄（含員工名稱）
 */
export interface AttendanceWithName extends Attendance {
    chinese_name?: string;
    english_name?: string;
}

/**
 * 取得請假記錄清單（支援分頁、排序）
 */
export async function getAttendanceRecords(params?: {
    emp_id?: string;
    emp_name?: string;
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<AttendanceWithName>> {
    const searchParams = new URLSearchParams();

    if (params?.emp_id) {
        searchParams.set('emp_id', params.emp_id);
    }
    if (params?.emp_name) {
        searchParams.set('emp_name', params.emp_name);
    }
    if (params?.leave_type) {
        searchParams.set('leave_type', params.leave_type);
    }
    if (params?.start_date) {
        searchParams.set('start_date', params.start_date);
    }
    if (params?.end_date) {
        searchParams.set('end_date', params.end_date);
    }
    if (params?.page) {
        searchParams.set('page', params.page.toString());
    }
    if (params?.page_size) {
        searchParams.set('page_size', params.page_size.toString());
    }
    if (params?.sort_by) {
        searchParams.set('sort_by', params.sort_by);
    }
    if (params?.sort_order) {
        searchParams.set('sort_order', params.sort_order);
    }

    const query = searchParams.toString();
    return httpRequest<PaginatedResponse<AttendanceWithName>>(`/attendance${query ? `?${query}` : ''}`);
}

/**
 * 取得單一請假記錄
 */
export async function getAttendanceRecord(
    empId: string,
    leaveDate: string,
    leaveType: string
): Promise<Attendance> {
    return httpRequest<Attendance>(
        `/attendance/${encodeURIComponent(empId)}/${encodeURIComponent(leaveDate)}/${encodeURIComponent(leaveType)}`
    );
}

/**
 * 新增請假記錄
 */
export async function createAttendanceRecord(data: AttendanceFormData): Promise<Attendance> {
    return httpRequest<Attendance>('/attendance', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 更新請假記錄
 */
export async function updateAttendanceRecord(
    empId: string,
    leaveDate: string,
    leaveType: string,
    data: Partial<AttendanceFormData>
): Promise<Attendance> {
    return httpRequest<Attendance>(
        `/attendance/${encodeURIComponent(empId)}/${encodeURIComponent(leaveDate)}/${encodeURIComponent(leaveType)}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
}

/**
 * 刪除請假記錄
 */
export async function deleteAttendanceRecord(
    empId: string,
    leaveDate: string,
    leaveType: string
): Promise<{ message: string }> {
    return httpRequest<{ message: string }>(
        `/attendance/${encodeURIComponent(empId)}/${encodeURIComponent(leaveDate)}/${encodeURIComponent(leaveType)}`,
        {
            method: 'DELETE',
        }
    );
}

/**
 * 取得假別清單（來自 gen001_allcode code_code='0001'）
 */
export async function getLeaveTypes(): Promise<LeaveType[]> {
    return httpRequest<LeaveType[]>('/codes/leave-types');
}

/**
 * 員工選項介面
 */
export interface EmployeeOption {
    emp_id: string;
    chinese_name: string;
    name: string;
}

/**
 * 取得員工清單（用於下拉選單）
 */
export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
    // 使用分頁 API，取得員工（後端限制 page_size 最大為 100）
    const response = await httpRequest<{ items: { emp_id: string; chinese_name?: string; name?: string }[] }>('/members?page_size=100');
    return response.items.map(m => ({
        emp_id: m.emp_id,
        chinese_name: m.chinese_name || '',
        name: m.name || m.emp_id,
    }));
}
