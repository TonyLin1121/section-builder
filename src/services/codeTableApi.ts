/**
 * CodeTable API 服務模組
 */
import type { CodeTable, CodeTableFormData } from '../types/codeTable';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * 分頁回應結構
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/**
 * 通用請求處理
 */
async function request<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '請求失敗' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * 取得參數檔清單（支援分頁、排序）
 */
export async function getCodeTables(params?: {
    code_code?: string;
    used_mark?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<CodeTable>> {
    const searchParams = new URLSearchParams();

    if (params?.code_code) {
        searchParams.set('code_code', params.code_code);
    }
    if (params?.used_mark) {
        searchParams.set('used_mark', params.used_mark);
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
    return request<PaginatedResponse<CodeTable>>(`/codes${query ? `?${query}` : ''}`);
}

/**
 * 取得單一參數
 */
export async function getCodeTable(
    codeCode: string,
    codeSubcode: string
): Promise<CodeTable> {
    return request<CodeTable>(
        `/codes/${encodeURIComponent(codeCode)}/${encodeURIComponent(codeSubcode)}`
    );
}

/**
 * 新增參數
 */
export async function createCodeTable(data: CodeTableFormData): Promise<CodeTable> {
    return request<CodeTable>('/codes', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 更新參數
 */
export async function updateCodeTable(
    codeCode: string,
    codeSubcode: string,
    data: Partial<CodeTableFormData>
): Promise<CodeTable> {
    return request<CodeTable>(
        `/codes/${encodeURIComponent(codeCode)}/${encodeURIComponent(codeSubcode)}`,
        {
            method: 'PUT',
            body: JSON.stringify(data),
        }
    );
}

/**
 * 刪除參數
 */
export async function deleteCodeTable(
    codeCode: string,
    codeSubcode: string
): Promise<{ message: string }> {
    return request<{ message: string }>(
        `/codes/${encodeURIComponent(codeCode)}/${encodeURIComponent(codeSubcode)}`,
        {
            method: 'DELETE',
        }
    );
}

/**
 * 取得所有主分類代碼清單
 */
export async function getCodeCategories(): Promise<string[]> {
    // 傳入大的 page_size 來取得所有分類
    const response = await getCodeTables({ page_size: 100 });
    const categories = [...new Set(response.items.map(c => c.code_code))];
    return categories.sort();
}
