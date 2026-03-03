/**
 * useHoliday Hook
 * NOTE: 管理假日檔維護頁面的狀態與操作
 */
import { useState, useEffect, useCallback } from 'react';
import type { HolidayRecord, HolidayFormData } from '../services/holidayApi';
import * as api from '../services/holidayApi';

type SortOrder = 'asc' | 'desc' | null;

/**
 * 假日檔管理 Hook
 */
export function useHoliday() {
    const [records, setRecords] = useState<HolidayRecord[]>([]);
    const [editingRecord, setEditingRecord] = useState<HolidayRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 篩選條件
    const [yearFilter, setYearFilter] = useState('');

    // 分頁狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // 排序狀態
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>(null);

    /**
     * 載入假日記錄
     */
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.getAllHolidays({
                year: yearFilter || undefined,
                page: currentPage,
                page_size: pageSize,
                sort_by: sortBy || undefined,
                sort_order: sortOrder || undefined,
            });
            setRecords(response.items);
            setTotalCount(response.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
            console.error('載入假日記錄失敗:', e);
        } finally {
            setIsLoading(false);
        }
    }, [yearFilter, currentPage, pageSize, sortBy, sortOrder]);

    // 初始載入與條件變更時重新載入
    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // 篩選條件變更時重置頁碼
    useEffect(() => {
        setCurrentPage(1);
    }, [yearFilter]);

    /**
     * 新增假日記錄
     */
    const addRecord = useCallback(async (data: HolidayFormData) => {
        setError(null);
        try {
            await api.createHoliday(data);
            await fetchRecords();
        } catch (e) {
            const message = e instanceof Error ? e.message : '新增失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 更新假日記錄
     */
    const updateRecord = useCallback(async (
        date: string,
        data: Partial<HolidayFormData>
    ) => {
        setError(null);
        try {
            await api.updateHoliday(date, data);
            await fetchRecords();
            setEditingRecord(null);
        } catch (e) {
            const message = e instanceof Error ? e.message : '更新失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 刪除假日記錄
     */
    const deleteRecord = useCallback(async (date: string) => {
        setError(null);
        try {
            await api.deleteHoliday(date);
            await fetchRecords();
        } catch (e) {
            const message = e instanceof Error ? e.message : '刪除失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 開始編輯
     */
    const startEdit = useCallback((record: HolidayRecord) => {
        setEditingRecord(record);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    /**
     * 取消編輯
     */
    const cancelEdit = useCallback(() => {
        setEditingRecord(null);
    }, []);

    /**
     * 變更排序
     */
    const handleSort = useCallback((key: string, order: SortOrder) => {
        setSortBy(order ? key : null);
        setSortOrder(order);
    }, []);

    return {
        records,
        editingRecord,
        isLoading,
        error,
        // 篩選
        yearFilter,
        setYearFilter,
        // 分頁
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalCount,
        // 排序
        sortBy,
        sortOrder,
        handleSort,
        // 操作
        addRecord,
        updateRecord,
        deleteRecord,
        startEdit,
        cancelEdit,
        refresh: fetchRecords,
    };
}
