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
 * NOTE: 優先從 Cookie 讀取，若不存在或強制刷新則重新獲取
 */
export async function getCsrfToken(forceRefresh = false): Promise<string> {
    // 強制刷新時直接獲取新 token
    if (forceRefresh) {
        return initCsrfToken();
    }

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
 * NOTE: 自動處理 CSRF token 和錯誤，403 時自動刷新 token 並重試
 */
export async function httpRequest<T>(
    endpoint: string,
    options?: RequestInit,
    isRetry = false
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
        // 重試時強制刷新 token
        const csrfToken = await getCsrfToken(isRetry);
        headers[CSRF_HEADER_NAME] = csrfToken;
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // 包含 Cookie
    });

    // 處理 CSRF 驗證失敗（403）：自動刷新 token 並重試一次
    if (response.status === 403 && !isRetry) {
        const error = await response.json().catch(() => ({ detail: '' }));
        if (error.detail?.includes('CSRF') || error.detail?.includes('token')) {
            // 強制刷新 token 並重試
            return httpRequest<T>(endpoint, options, true);
        }
    }

    if (!response.ok) {
        // 嘗試解析錯誤回應
        let errorMessage = `HTTP ${response.status}`;
        try {
            const text = await response.text();
            try {
                const error = JSON.parse(text);
                if (typeof error.detail === 'string') {
                    errorMessage = error.detail;
                } else if (Array.isArray(error.detail)) {
                    // Pydantic 驗證錯誤格式
                    errorMessage = error.detail.map((e: { msg?: string; loc?: string[] }) =>
                        e.msg || JSON.stringify(e)
                    ).join('; ');
                } else if (error.message) {
                    errorMessage = error.message;
                }
            } catch {
                // 非 JSON 回應，使用原始文字
                errorMessage = text || `HTTP ${response.status}`;
            }
        } catch {
            errorMessage = `請求失敗 (HTTP ${response.status})`;
        }
        throw new Error(errorMessage);
    }

    // 解析成功回應
    try {
        return await response.json();
    } catch {
        // 成功但無 JSON 回應（少見情況）
        return {} as T;
    }
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
