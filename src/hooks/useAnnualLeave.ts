import { useState, useEffect, useCallback } from 'react';
import type { AnnualLeaveRecord, AnnualLeaveFormData } from '../services/annualLeaveApi';
import type { LeaveType, EmployeeOption } from '../services/attendanceApi';
import * as api from '../services/annualLeaveApi';
import { getLeaveTypes, getEmployeeOptions } from '../services/attendanceApi';

type SortOrder = 'asc' | 'desc' | null;

/**
 * 年度休假管理 Hook
 */
export function useAnnualLeave() {
    const [records, setRecords] = useState<AnnualLeaveRecord[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [editingRecord, setEditingRecord] = useState<AnnualLeaveRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 篩選條件
    const [empNameFilter, setEmpNameFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

    // 分頁狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // 排序狀態
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>(null);

    /**
     * 載入假別清單
     */
    const fetchLeaveTypes = useCallback(async () => {
        try {
            const data = await getLeaveTypes();
            setLeaveTypes(data);
        } catch (e) {
            console.error('載入假別清單失敗:', e);
        }
    }, []);

    /**
     * 載入員工清單
     */
    const fetchEmployees = useCallback(async () => {
        try {
            const data = await getEmployeeOptions();
            setEmployees(data);
        } catch (e) {
            console.error('載入員工清單失敗:', e);
        }
    }, []);

    /**
     * 載入年度休假記錄
     */
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.getAnnualLeaveRecords({
                emp_name: empNameFilter || undefined,
                year: yearFilter || undefined,
                leave_type: leaveTypeFilter || undefined,
                page: currentPage,
                page_size: pageSize,
                sort_by: sortBy || undefined,
                sort_order: sortOrder || undefined,
            });
            setRecords(response.items);
            setTotalCount(response.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
            console.error('載入年度休假記錄失敗:', e);
        } finally {
            setIsLoading(false);
        }
    }, [empNameFilter, yearFilter, leaveTypeFilter, currentPage, pageSize, sortBy, sortOrder]);

    // 初始化載入
    useEffect(() => {
        fetchLeaveTypes();
        fetchEmployees();
    }, [fetchLeaveTypes, fetchEmployees]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // 篩選條件變更時重置頁碼
    useEffect(() => {
        setCurrentPage(1);
    }, [empNameFilter, yearFilter, leaveTypeFilter]);

    /**
     * 根據假別代碼取得名稱
     */
    const getLeaveTypeName = useCallback((code: string) => {
        const leaveType = leaveTypes.find(lt => lt.code_subcode === code);
        return leaveType?.code_subname || code;
    }, [leaveTypes]);

    /**
     * 新增年度休假記錄
     */
    const addRecord = useCallback(async (data: AnnualLeaveFormData) => {
        setError(null);
        try {
            await api.createAnnualLeaveRecord(data);
            await fetchRecords();
        } catch (e) {
            const message = e instanceof Error ? e.message : '新增失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 更新年度休假記錄
     */
    const updateRecord = useCallback(async (
        empId: string,
        year: string,
        leaveType: string,
        data: Partial<AnnualLeaveFormData>
    ) => {
        setError(null);
        try {
            await api.updateAnnualLeaveRecord(empId, year, leaveType, data);
            await fetchRecords();
            setEditingRecord(null);
        } catch (e) {
            const message = e instanceof Error ? e.message : '更新失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 刪除年度休假記錄
     */
    const deleteRecord = useCallback(async (
        empId: string,
        year: string,
        leaveType: string
    ) => {
        setError(null);
        try {
            await api.deleteAnnualLeaveRecord(empId, year, leaveType);
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
    const startEdit = useCallback((record: AnnualLeaveRecord) => {
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
        leaveTypes,
        employees,
        editingRecord,
        isLoading,
        error,
        // 篩選
        empNameFilter,
        setEmpNameFilter,
        yearFilter,
        setYearFilter,
        leaveTypeFilter,
        setLeaveTypeFilter,
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
        getLeaveTypeName,
    };
}
