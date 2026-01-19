/**
 * 認證 API 服務
 * NOTE: 處理登入、登出、取得使用者資訊等
 */
import { httpRequest } from './httpClient';

/**
 * 使用者資訊
 */
export interface UserInfo {
    user_id: string;
    user_name?: string;
    roles: string[];
    is_active: boolean;
}

/**
 * 登入回應
 */
interface LoginResponse {
    success: boolean;
    message: string;
    user_id?: string;
    user_name?: string;
    roles?: string[];
}

/**
 * 登入
 */
export async function login(userId: string, password: string): Promise<LoginResponse> {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, password }),
        credentials: 'include',
    });

    // 安全解析 JSON
    let data;
    try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`伺服器回應格式錯誤 (HTTP ${response.status})`);
    }

    if (!response.ok) {
        throw new Error(data.detail || `登入失敗 (HTTP ${response.status})`);
    }

    return data;
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
    await httpRequest('/auth/logout', {
        method: 'POST',
    });
}

/**
 * 取得當前使用者資訊
 */
export async function getCurrentUser(): Promise<UserInfo> {
    return httpRequest<UserInfo>('/auth/me');
}

/**
 * 變更密碼
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await httpRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword,
        }),
    });
}
