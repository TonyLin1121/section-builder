/**
 * 專案管理 Hook
 */
import { useState, useEffect, useCallback } from 'react';
import {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    importProjects,
    type Project,
    type ProjectFormData,
    type ImportMode,
    type ImportResult,
} from '../services/projectApi';

/**
 * 專案管理 Hook
 */
export function useProject() {
    // 資料狀態
    const [records, setRecords] = useState<Project[]>([]);
    const [editingRecord, setEditingRecord] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 篩選
    const [projectIdFilter, setProjectIdFilter] = useState('');
    const [projectNameFilter, setProjectNameFilter] = useState('');
    const [customerNameFilter, setCustomerNameFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [managerFilter, setManagerFilter] = useState('');
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');

    // 分頁
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // 排序
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    /**
     * 取得專案列表
     */
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getProjects({
                project_id: projectIdFilter || undefined,
                project_name: projectNameFilter || undefined,
                customer_name: customerNameFilter || undefined,
                project_status: statusFilter || undefined,
                project_manager: managerFilter || undefined,
                date_from: dateFromFilter || undefined,
                date_to: dateToFilter || undefined,
                page: currentPage,
                page_size: pageSize,
                sort_by: sortBy || undefined,
                sort_order: sortOrder,
            });
            setRecords(response.items);
            setTotalCount(response.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
        } finally {
            setIsLoading(false);
        }
    }, [projectIdFilter, projectNameFilter, customerNameFilter, statusFilter, managerFilter, dateFromFilter, dateToFilter, currentPage, pageSize, sortBy, sortOrder]);

    // 初始載入及篩選變更時重新載入
    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // 篩選變更時重置頁碼
    useEffect(() => {
        setCurrentPage(1);
    }, [projectIdFilter, projectNameFilter, customerNameFilter, statusFilter, managerFilter, dateFromFilter, dateToFilter]);

    /**
     * 處理排序
     */
    const handleSort = useCallback((field: string) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    }, [sortBy]);

    /**
     * 新增專案
     */
    const addRecord = useCallback(async (data: ProjectFormData) => {
        setError(null);
        try {
            await createProject(data);
            await fetchRecords();
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : '新增失敗');
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 更新專案
     */
    const updateRecord = useCallback(async (projectId: string, data: Partial<ProjectFormData>) => {
        setError(null);
        try {
            await updateProject(projectId, data);
            await fetchRecords();
            setEditingRecord(null);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : '更新失敗');
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 刪除專案
     */
    const deleteRecord = useCallback(async (projectId: string) => {
        setError(null);
        try {
            await deleteProject(projectId);
            await fetchRecords();
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : '刪除失敗');
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 匯入專案
     */
    const importRecords = useCallback(async (file: File, mode: ImportMode): Promise<ImportResult> => {
        setError(null);
        try {
            const result = await importProjects(file, mode);
            await fetchRecords();
            return result;
        } catch (e) {
            setError(e instanceof Error ? e.message : '匯入失敗');
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 開始編輯
     */
    const startEdit = useCallback((record: Project) => {
        setEditingRecord(record);
    }, []);

    /**
     * 取消編輯
     */
    const cancelEdit = useCallback(() => {
        setEditingRecord(null);
    }, []);

    return {
        // 資料
        records,
        editingRecord,
        isLoading,
        error,
        // 篩選
        projectIdFilter,
        setProjectIdFilter,
        projectNameFilter,
        setProjectNameFilter,
        customerNameFilter,
        setCustomerNameFilter,
        statusFilter,
        setStatusFilter,
        managerFilter,
        setManagerFilter,
        dateFromFilter,
        setDateFromFilter,
        dateToFilter,
        setDateToFilter,
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
        importRecords,
        startEdit,
        cancelEdit,
        fetchRecords,
    };
}
