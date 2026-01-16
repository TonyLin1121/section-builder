/**
 * HTTP 客戶端模組
 * NOTE: 統一處理 CSRF token 和 HTTP 請求
 */

// API 基礎 URL（優先使用相對路徑，透過 Nginx 反向代理）
const API_BASE_URL = '/api';

// CSRF Cookie 名稱（需與後端一致）
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * 從 Cookie 中讀取指定名稱的值
 */
function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
    }
    return null;
}

/**
 * 取得 CSRF Token
 * NOTE: 優先從 Cookie 讀取，若不存在則初始化
 */
export async function getCsrfToken(): Promise<string> {
    // 嘗試從 Cookie 讀取
    const existingToken = getCookie(CSRF_COOKIE_NAME);
    if (existingToken) {
        return existingToken;
    }

    // Cookie 中沒有，需要初始化
    return initCsrfToken();
}

/**
 * 初始化 CSRF Token
 * NOTE: 調用後端 API 獲取新的 token
 */
export async function initCsrfToken(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/csrf-token`, {
        method: 'GET',
        credentials: 'include', // 包含 Cookie
    });

    if (!response.ok) {
        throw new Error('無法獲取 CSRF Token');
    }

    const data = await response.json();
    return data.csrf_token;
}

/**
 * 通用 HTTP 請求函數
 * NOTE: 自動處理 CSRF token 和錯誤
 */
export async function httpRequest<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const method = options?.method || 'GET';

    // 準備 headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    };

    // 非安全方法需要添加 CSRF token
    const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (unsafeMethods.includes(method.toUpperCase())) {
        const csrfToken = await getCsrfToken();
        headers[CSRF_HEADER_NAME] = csrfToken;
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // 包含 Cookie
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '請求失敗' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

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
