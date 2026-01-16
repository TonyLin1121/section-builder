/**
 * API 服務模組
 * NOTE: 封裝與後端的 HTTP 請求
 */
import type { Member, MemberFormData } from '../types/employee';
import { httpRequest, type PaginatedResponse } from './httpClient';

// 重新導出 PaginatedResponse 供其他模組使用
export type { PaginatedResponse } from './httpClient';

/**
 * 取得所有員工（支援分頁、排序）
 */
export async function getMembers(params?: {
    search?: string;
    division?: string;
    is_employed?: boolean;
    member_type?: string[];
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<Member>> {
    const searchParams = new URLSearchParams();

    if (params?.search) {
        searchParams.set('search', params.search);
    }
    if (params?.division) {
        searchParams.set('division', params.division);
    }
    if (params?.is_employed !== undefined) {
        searchParams.set('is_employed', String(params.is_employed));
    }
    // 多選員工類型：每個類型都加入 member_type 參數
    if (params?.member_type && params.member_type.length > 0) {
        params.member_type.forEach(type => {
            searchParams.append('member_type', type);
        });
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
    return httpRequest<PaginatedResponse<Member>>(`/members${query ? `?${query}` : ''}`);
}

/**
 * 取得單一員工
 */
export async function getMember(empId: string): Promise<Member> {
    return httpRequest<Member>(`/members/${encodeURIComponent(empId)}`);
}

/**
 * 新增員工
 */
export async function createMember(data: MemberFormData & { emp_id: string }): Promise<Member> {
    return httpRequest<Member>('/members', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 更新員工
 */
export async function updateMember(empId: string, data: MemberFormData): Promise<Member> {
    return httpRequest<Member>(`/members/${encodeURIComponent(empId)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * 刪除員工
 */
export async function deleteMember(empId: string): Promise<{ message: string; emp_id: string }> {
    return httpRequest<{ message: string; emp_id: string }>(`/members/${encodeURIComponent(empId)}`, {
        method: 'DELETE',
    });
}

/**
 * 取得部門清單
 */
export async function getDivisions(): Promise<string[]> {
    return httpRequest<string[]>('/divisions');
}

