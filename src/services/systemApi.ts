/**
 * 系統管理 API 服務
 * NOTE: 處理使用者、角色、功能清單等系統管理 API
 */
import { httpRequest, type PaginatedResponse } from './httpClient';

// ============================================
// 類型定義
// ============================================

/**
 * 使用者資料
 */
export interface SystemUser {
    user_id: string;
    user_name?: string;
    is_active: boolean;
    active_date?: string;
    expire_date?: string;
    last_login_at?: string;
    roles: string[];
}

/**
 * 新增使用者請求
 */
export interface CreateUserRequest {
    user_id: string;
    password: string;
    is_active?: boolean;
    expire_date?: string;
    role_ids?: string[];
}

/**
 * 更新使用者請求
 */
export interface UpdateUserRequest {
    is_active?: boolean;
    expire_date?: string;
    role_ids?: string[];
    reset_password?: string;
}

/**
 * 角色資料
 */
export interface Role {
    role_id: string;
    role_name: string;
    description?: string;
    is_active: boolean;
    functions: string[];
}

/**
 * 角色請求
 */
export interface RoleRequest {
    role_id: string;
    role_name: string;
    description?: string;
    is_active?: boolean;
    function_ids?: string[];
}

/**
 * 選單資料
 */
export interface Menu {
    menu_id: string;
    menu_name: string;
    parent_menu_id?: string;
    menu_path?: string;
    icon?: string;
    sort_order: number;
    is_active: boolean;
    children: Menu[];
}

/**
 * 功能資料
 */
export interface SystemFunction {
    function_id: string;
    function_name: string;
    menu_id?: string;
    function_type?: string;
    is_active: boolean;
}

/**
 * 可用員工資料
 */
export interface AvailableMember {
    emp_id: string;
    chinese_name?: string;
    job_title?: string;
}

// ============================================
// 使用者管理 API
// ============================================

/**
 * 取得使用者列表
 */
export async function getUsers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
}): Promise<PaginatedResponse<SystemUser>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    return httpRequest<PaginatedResponse<SystemUser>>(
        `/system/users${queryString ? `?${queryString}` : ''}`
    );
}

/**
 * 建立使用者
 */
export async function createUser(data: CreateUserRequest): Promise<{ success: boolean; message: string; user_id: string }> {
    return httpRequest('/system/users', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 更新使用者
 */
export async function updateUser(userId: string, data: UpdateUserRequest): Promise<{ success: boolean; message: string }> {
    return httpRequest(`/system/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 刪除使用者
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return httpRequest(`/system/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
    });
}

/**
 * 取得可建立帳號的員工列表
 */
export async function getAvailableMembers(search?: string): Promise<{ items: AvailableMember[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return httpRequest<{ items: AvailableMember[] }>(`/system/available-members${query}`);
}

// ============================================
// 角色管理 API
// ============================================

/**
 * 取得角色列表
 */
export async function getRoles(): Promise<{ items: Role[] }> {
    return httpRequest<{ items: Role[] }>('/system/roles');
}

/**
 * 建立角色
 */
export async function createRole(data: RoleRequest): Promise<{ success: boolean; message: string; role_id: string }> {
    return httpRequest('/system/roles', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 更新角色
 */
export async function updateRole(roleId: string, data: RoleRequest): Promise<{ success: boolean; message: string }> {
    return httpRequest(`/system/roles/${encodeURIComponent(roleId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 刪除角色
 */
export async function deleteRole(roleId: string): Promise<{ success: boolean; message: string }> {
    return httpRequest(`/system/roles/${encodeURIComponent(roleId)}`, {
        method: 'DELETE',
    });
}

// ============================================
// 功能清單 API
// ============================================

/**
 * 取得功能清單（階層結構）
 */
export async function getMenus(): Promise<{ items: Menu[] }> {
    return httpRequest<{ items: Menu[] }>('/system/menus');
}

/**
 * 取得功能列表
 */
export async function getFunctions(): Promise<{ items: SystemFunction[] }> {
    return httpRequest<{ items: SystemFunction[] }>('/system/functions');
}
