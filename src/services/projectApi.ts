/**
 * 專案管理 API 服務
 */
import { httpRequest, getCsrfToken } from './httpClient';

/**
 * 專案資料結構
 * NOTE: 欄位名稱與資料表 project_info 一致
 */
export interface Project {
    project_id: string;
    so_no?: string;
    project_name?: string;
    customer_name?: string;
    project_plan_sdate?: string;
    project_plan_edate?: string;
    warranty_sdate?: string;
    warranty_edate?: string;
    project_amt?: number;
    project_department?: string;
    project_manager?: string;
    project_status?: string;
    agreed_acceptance_date?: string;
    estimated_acceptance_date?: string;
    actual_acceptance_date?: string;
    actual_progress?: number;
    project_income?: string;
    actual_cost?: number;
    project_category?: string;
    project_plan_progress?: number;
    progress_status?: string;
    manpower_status?: string;
    quality_status?: string;
    plan_status?: string;
    is_penalty?: boolean;
    development_phase_amt?: number;
    estimated_dev_person_month?: number;
    actual_person_month?: number;
    estimated_warranty_cost?: number;
    estimated_warranty_person_month?: number;
    actual_warranty_cost?: number;
    actual_warranty_person_month?: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * 新增/更新專案表單資料
 */
export interface ProjectFormData {
    project_id: string;
    so_no?: string;
    project_name?: string;
    customer_name?: string;
    project_plan_sdate?: string;
    project_plan_edate?: string;
    warranty_sdate?: string;
    warranty_edate?: string;
    project_amt?: number;
    project_department?: string;
    project_manager?: string;
    project_status?: string;
    agreed_acceptance_date?: string;
    estimated_acceptance_date?: string;
    actual_acceptance_date?: string;
    actual_progress?: number;
    project_income?: string;
    actual_cost?: number;
    project_category?: string;
    project_plan_progress?: number;
    progress_status?: string;
    manpower_status?: string;
    quality_status?: string;
    plan_status?: string;
    is_penalty?: boolean;
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
interface ProjectQueryParams {
    project_id?: string;
    project_name?: string;
    customer_name?: string;
    project_status?: string;
    project_manager?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

/**
 * 匯入模式
 */
export type ImportMode = 'delete_all' | 'insert_only' | 'upsert';

/**
 * 匯入結果
 */
export interface ImportResult {
    message: string;
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
}

const API_BASE = '/projects';

/**
 * 取得專案列表
 */
export async function getProjects(
    params: ProjectQueryParams = {}
): Promise<PaginatedResponse<Project>> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            searchParams.append(key, String(value));
        }
    });

    const queryString = searchParams.toString();
    const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

    return httpRequest<PaginatedResponse<Project>>(url);
}

/**
 * 取得單一專案
 */
export async function getProject(projectId: string): Promise<Project> {
    return httpRequest<Project>(`${API_BASE}/${encodeURIComponent(projectId)}`);
}

/**
 * 新增專案
 */
export async function createProject(
    data: ProjectFormData
): Promise<{ message: string; project_id: string }> {
    return httpRequest<{ message: string; project_id: string }>(
        API_BASE,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    );
}

/**
 * 更新專案
 */
export async function updateProject(
    projectId: string,
    data: Partial<ProjectFormData>
): Promise<{ message: string }> {
    return httpRequest<{ message: string }>(
        `${API_BASE}/${encodeURIComponent(projectId)}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
}

/**
 * 刪除專案
 */
export async function deleteProject(projectId: string): Promise<{ message: string }> {
    return httpRequest<{ message: string }>(
        `${API_BASE}/${encodeURIComponent(projectId)}`,
        {
            method: 'DELETE',
        }
    );
}

/**
 * 匯入專案資料
 * NOTE: 此 API 使用 FormData，需獨立處理但使用統一的 CSRF token
 * 支援 CSRF token 過期時自動刷新並重試
 */
export async function importProjects(
    file: File,
    mode: ImportMode,
    isRetry = false
): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    // 使用統一的 getCsrfToken 取得 CSRF Token（重試時強制刷新）
    const csrfToken = await getCsrfToken(isRetry);

    const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
    });

    // 處理 CSRF 驗證失敗（403）：自動刷新 token 並重試一次
    if (response.status === 403 && !isRetry) {
        const error = await response.json().catch(() => ({ detail: '' }));
        if (error.detail?.includes('CSRF') || error.detail?.includes('token')) {
            // 強制刷新 token 並重試
            return importProjects(file, mode, true);
        }
        throw new Error(error.detail || '匯入失敗');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '匯入失敗');
    }

    return response.json();
}
