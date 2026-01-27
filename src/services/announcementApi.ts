/**
 * 公告 API 服務模組
 * NOTE: 封裝公告相關的 HTTP 請求
 */
import { httpRequest, type PaginatedResponse } from './httpClient';

// ============================================
// 類型定義
// ============================================

/**
 * 公告類別
 */
export interface AnnouncementCategory {
    category_id: string;
    category_name: string;
    icon?: string;
    sort_order: number;
    is_active: boolean;
}

/**
 * 公告目標對象
 */
export interface AnnouncementTarget {
    target_type: 'role' | 'division' | 'user';
    target_value: string;
}

/**
 * 公告附件
 */
export interface AnnouncementAttachment {
    attachment_id: number;
    announcement_id: number;
    file_name: string;
    file_path: string;
    file_size?: number;
    file_type?: string;
}

/**
 * 公告資料
 */
export interface Announcement {
    announcement_id: number;
    category_id?: string;
    category_name?: string;
    category_icon?: string;
    title: string;
    content?: string;
    target_type: 'all' | 'role' | 'division' | 'user';
    is_pinned: boolean;
    is_active: boolean;
    push_notification: boolean;
    publish_date?: string;
    expire_date?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    targets?: AnnouncementTarget[];
    attachments?: AnnouncementAttachment[];
    is_read?: boolean;
}

/**
 * 新增/更新公告請求
 */
export interface AnnouncementFormData {
    category_id?: string;
    title: string;
    content?: string;
    target_type: 'all' | 'role' | 'division' | 'user';
    is_pinned?: boolean;
    is_active?: boolean;
    push_notification?: boolean;
    publish_date?: string;
    expire_date?: string;
    targets?: AnnouncementTarget[];
}

// ============================================
// API 函數
// ============================================

/**
 * 取得公告類別清單
 */
export async function getAnnouncementCategories(): Promise<{ items: AnnouncementCategory[] }> {
    return httpRequest<{ items: AnnouncementCategory[] }>('/announcements/categories');
}

/**
 * 取得公告清單（管理員用）
 */
export async function getAnnouncements(params?: {
    category_id?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
}): Promise<PaginatedResponse<Announcement>> {
    const searchParams = new URLSearchParams();

    if (params?.category_id) {
        searchParams.set('category_id', params.category_id);
    }
    if (params?.is_active !== undefined) {
        searchParams.set('is_active', String(params.is_active));
    }
    if (params?.page) {
        searchParams.set('page', params.page.toString());
    }
    if (params?.page_size) {
        searchParams.set('page_size', params.page_size.toString());
    }

    const query = searchParams.toString();
    return httpRequest<PaginatedResponse<Announcement>>(`/announcements${query ? `?${query}` : ''}`);
}

/**
 * 取得有效公告（使用者用）
 */
export async function getActiveAnnouncements(): Promise<{ items: Announcement[]; total: number }> {
    return httpRequest<{ items: Announcement[]; total: number }>('/announcements/active');
}

/**
 * 取得單一公告
 */
export async function getAnnouncement(announcementId: number): Promise<Announcement> {
    return httpRequest<Announcement>(`/announcements/${announcementId}`);
}

/**
 * 新增公告
 */
export async function createAnnouncement(data: AnnouncementFormData): Promise<{ success: boolean; announcement_id: number }> {
    return httpRequest<{ success: boolean; announcement_id: number }>('/announcements', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 更新公告
 */
export async function updateAnnouncement(announcementId: number, data: AnnouncementFormData): Promise<{ success: boolean; message: string }> {
    return httpRequest<{ success: boolean; message: string }>(`/announcements/${announcementId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 刪除公告
 */
export async function deleteAnnouncement(announcementId: number): Promise<{ success: boolean; message: string }> {
    return httpRequest<{ success: boolean; message: string }>(`/announcements/${announcementId}`, {
        method: 'DELETE',
    });
}

/**
 * 上傳附件
 * NOTE: 使用原生 fetch 而非 httpRequest，因為需要 FormData
 */
export async function uploadAttachment(announcementId: number, file: File): Promise<{ success: boolean; attachment_id: number; file_name: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // 取得 CSRF Token
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

    const response = await fetch(`/api/announcements/${announcementId}/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '上傳失敗' }));
        throw new Error(error.detail || '上傳失敗');
    }

    return response.json();
}

/**
 * 刪除附件
 */
export async function deleteAttachment(attachmentId: number): Promise<{ success: boolean; message: string }> {
    return httpRequest<{ success: boolean; message: string }>(`/announcements/attachments/${attachmentId}`, {
        method: 'DELETE',
    });
}

/**
 * 取得附件下載 URL
 */
export function getAttachmentDownloadUrl(attachmentId: number): string {
    return `/api/announcements/attachments/${attachmentId}/download`;
}

/**
 * 標記公告為已讀
 */
export async function markAnnouncementAsRead(announcementId: number): Promise<{ success: boolean; message: string }> {
    return httpRequest<{ success: boolean; message: string }>(`/announcements/${announcementId}/read`, {
        method: 'POST',
    });
}
