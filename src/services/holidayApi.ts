/**
 * Holiday API 服務模組
 * NOTE: 封裝假日檔（例假日/補班日）相關的 API 呼叫
 */
import { httpRequest } from './httpClient';

/**
 * 假日記錄介面
 */
export interface HolidayRecord {
    /** 日期 YYYYMMDD */
    date: string;
    /** true=例假日, false=補班日 */
    is_holiday: boolean;
    /** 描述說明 */
    description: string;
}

/**
 * 假日資料 Map（以日期為 key，方便快速查詢）
 */
export type HolidayMap = Record<string, HolidayRecord>;

/**
 * 取得指定日期範圍內的假日資料
 * @param startDate 開始日期 YYYYMMDD
 * @param endDate 結束日期 YYYYMMDD
 * @returns 假日記錄陣列
 */
export async function getHolidays(
    startDate: string,
    endDate: string
): Promise<{ items: HolidayRecord[] }> {
    return httpRequest<{ items: HolidayRecord[] }>(
        `/holidays?start_date=${startDate}&end_date=${endDate}`
    );
}

/**
 * 將假日陣列轉換為以日期為 key 的 Map
 * NOTE: 方便在行事曆中快速判斷某日是否為假日/補班日
 * @param holidays 假日記錄陣列
 * @returns 假日 Map
 */
export function toHolidayMap(holidays: HolidayRecord[]): HolidayMap {
    const map: HolidayMap = {};
    for (const h of holidays) {
        map[h.date] = h;
    }
    return map;
}

/**
 * 假日表單資料介面（新增/更新用）
 */
export interface HolidayFormData {
    date: string;
    is_holiday: boolean;
    description: string;
}

/**
 * 分頁回應介面
 */
interface HolidayListResponse {
    items: HolidayRecord[];
    total: number;
    page: number;
    page_size: number;
}

/**
 * 取得所有假日記錄（維護頁面用）
 * NOTE: 支援年份篩選、分頁與排序
 */
export async function getAllHolidays(params: {
    year?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: string;
}): Promise<HolidayListResponse> {
    const searchParams = new URLSearchParams();
    if (params.year) searchParams.set('year', params.year);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.page_size) searchParams.set('page_size', String(params.page_size));
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);

    return httpRequest<HolidayListResponse>(`/holidays/all?${searchParams.toString()}`);
}

/**
 * 新增假日記錄
 */
export async function createHoliday(data: HolidayFormData): Promise<HolidayRecord> {
    return httpRequest<HolidayRecord>('/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

/**
 * 更新假日記錄
 */
export async function updateHoliday(date: string, data: Partial<HolidayFormData>): Promise<HolidayRecord> {
    return httpRequest<HolidayRecord>(`/holidays/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

/**
 * 刪除假日記錄
 */
export async function deleteHoliday(date: string): Promise<{ message: string }> {
    return httpRequest<{ message: string }>(`/holidays/${date}`, {
        method: 'DELETE',
    });
}

