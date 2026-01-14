import { useState, useEffect, useCallback } from 'react';
import type { AttendanceFormData } from '../types/attendance';
import type { LeaveType, AttendanceWithName, EmployeeOption } from '../services/attendanceApi';
import * as api from '../services/attendanceApi';

type SortOrder = 'asc' | 'desc' | null;

/**
 * 請假記錄管理 Hook
 */
export function useAttendance() {
    const [records, setRecords] = useState<AttendanceWithName[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [editingRecord, setEditingRecord] = useState<AttendanceWithName | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 篩選條件
    const [empNameFilter, setEmpNameFilter] = useState('');
    const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

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
            const data = await api.getLeaveTypes();
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
            const data = await api.getEmployeeOptions();
            setEmployees(data);
        } catch (e) {
            console.error('載入員工清單失敗:', e);
        }
    }, []);

    /**
     * 載入請假記錄
     */
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.getAttendanceRecords({
                emp_name: empNameFilter || undefined,
                leave_type: leaveTypeFilter || undefined,
                start_date: startDateFilter ? startDateFilter.replace(/-/g, '') : undefined,
                end_date: endDateFilter ? endDateFilter.replace(/-/g, '') : undefined,
                page: currentPage,
                page_size: pageSize,
                sort_by: sortBy || undefined,
                sort_order: sortOrder || undefined,
            });
            setRecords(response.items);
            setTotalCount(response.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
            console.error('載入請假記錄失敗:', e);
        } finally {
            setIsLoading(false);
        }
    }, [empNameFilter, leaveTypeFilter, startDateFilter, endDateFilter, currentPage, pageSize, sortBy, sortOrder]);

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
    }, [empNameFilter, leaveTypeFilter, startDateFilter, endDateFilter]);

    /**
     * 根據假別代碼取得名稱
     */
    const getLeaveTypeName = useCallback((code: string) => {
        const leaveType = leaveTypes.find(lt => lt.code_subcode === code);
        return leaveType?.code_subname || code;
    }, [leaveTypes]);

    /**
     * 新增請假記錄
     */
    const addRecord = useCallback(async (data: AttendanceFormData) => {
        setError(null);
        try {
            await api.createAttendanceRecord(data);
            await fetchRecords();
        } catch (e) {
            const message = e instanceof Error ? e.message : '新增失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 更新請假記錄
     */
    const updateRecord = useCallback(async (
        empId: string,
        leaveDate: string,
        leaveType: string,
        data: Partial<AttendanceFormData>
    ) => {
        setError(null);
        try {
            await api.updateAttendanceRecord(empId, leaveDate, leaveType, data);
            await fetchRecords();
            setEditingRecord(null);
        } catch (e) {
            const message = e instanceof Error ? e.message : '更新失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 刪除請假記錄
     */
    const deleteRecord = useCallback(async (
        empId: string,
        leaveDate: string,
        leaveType: string
    ) => {
        setError(null);
        try {
            await api.deleteAttendanceRecord(empId, leaveDate, leaveType);
            await fetchRecords();
        } catch (e) {
            const message = e instanceof Error ? e.message : '刪除失敗';
            setError(message);
            throw e;
        }
    }, [fetchRecords]);

    /**
     * 開始編輯
     * NOTE: 同時捲動到頁面頂部，讓使用者看到表單區域
     */
    const startEdit = useCallback((record: AttendanceWithName) => {
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
        leaveTypeFilter,
        setLeaveTypeFilter,
        startDateFilter,
        setStartDateFilter,
        endDateFilter,
        setEndDateFilter,
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
