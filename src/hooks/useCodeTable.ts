import { useState, useEffect, useCallback } from 'react';
import type { CodeTable, CodeTableFormData } from '../types/codeTable';
import * as api from '../services/codeTableApi';

type SortOrder = 'asc' | 'desc' | null;

/**
 * 參數檔管理 Hook
 */
export function useCodeTable() {
    const [records, setRecords] = useState<CodeTable[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [editingRecord, setEditingRecord] = useState<CodeTable | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 篩選條件
    const [codeCodeFilter, setCodeCodeFilter] = useState('');
    const [usedMarkFilter, setUsedMarkFilter] = useState('');

    // 分頁狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // 排序狀態
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>(null);

    /**
     * 載入主分類清單
     */
    const fetchCategories = useCallback(async () => {
        try {
            const data = await api.getCodeCategories();
            setCategories(data);
        } catch (e) {
            console.error('載入主分類清單失敗:', e);
        }
    }, []);

    /**
     * 載入參數檔記錄
     */
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.getCodeTables({
                code_code: codeCodeFilter || undefined,
                used_mark: usedMarkFilter || undefined,
                page: currentPage,
                page_size: pageSize,
                sort_by: sortBy || undefined,
                sort_order: sortOrder || undefined,
            });
            setRecords(response.items);
            setTotalCount(response.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
            console.error('載入參數檔失敗:', e);
        } finally {
            setIsLoading(false);
        }
    }, [codeCodeFilter, usedMarkFilter, currentPage, pageSize, sortBy, sortOrder]);

    // 初始化載入
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // 篩選條件變更時重置頁碼
    useEffect(() => {
        setCurrentPage(1);
    }, [codeCodeFilter, usedMarkFilter]);

    /**
     * 新增參數
     */
    const addRecord = useCallback(async (data: CodeTableFormData) => {
        setError(null);
        try {
            await api.createCodeTable(data);
            await fetchRecords();
            await fetchCategories();
        } catch (e) {
            const message = e instanceof Error ? e.message : '新增失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords, fetchCategories]);

    /**
     * 更新參數
     */
    const updateRecord = useCallback(async (
        codeCode: string,
        codeSubcode: string,
        data: Partial<CodeTableFormData>
    ) => {
        setError(null);
        try {
            await api.updateCodeTable(codeCode, codeSubcode, data);
            await fetchRecords();
            setEditingRecord(null);
        } catch (e) {
            const message = e instanceof Error ? e.message : '更新失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 刪除參數
     */
    const deleteRecord = useCallback(async (
        codeCode: string,
        codeSubcode: string
    ) => {
        setError(null);
        try {
            await api.deleteCodeTable(codeCode, codeSubcode);
            await fetchRecords();
            await fetchCategories();
        } catch (e) {
            const message = e instanceof Error ? e.message : '刪除失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords, fetchCategories]);

    /**
     * 開始編輯
     * NOTE: 同時捲動到頁面頂部，讓使用者看到表單區域
     */
    const startEdit = useCallback((record: CodeTable) => {
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

    /**
     * 重新載入
     */
    const refresh = useCallback(() => {
        fetchRecords();
    }, [fetchRecords]);

    return {
        records,
        categories,
        editingRecord,
        isLoading,
        error,
        // 篩選
        codeCodeFilter,
        setCodeCodeFilter,
        usedMarkFilter,
        setUsedMarkFilter,
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
        refresh,
    };
}
