import { useState, useEffect, useCallback } from 'react';
import type { Member, MemberFormData } from '../types/employee';
import * as api from '../services/api';

type SortOrder = 'asc' | 'desc' | null;

/**
 * 員工資料管理 Hook
 * NOTE: 使用 API 進行 CRUD 操作，支援分頁和排序
 */
export function useEmployees() {
    const [members, setMembers] = useState<Member[]>([]);
    const [divisions, setDivisions] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [memberTypeFilter, setMemberTypeFilter] = useState<string[]>([]);
    const [isEmployedFilter, setIsEmployedFilter] = useState<boolean | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Member | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 分頁狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // 排序狀態
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>(null);

    /**
     * 載入員工清單
     */
    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.getMembers({
                search: searchTerm || undefined,
                division: departmentFilter || undefined,
                member_type: memberTypeFilter.length > 0 ? memberTypeFilter : undefined,
                is_employed: isEmployedFilter ?? undefined,
                page: currentPage,
                page_size: pageSize,
                sort_by: sortBy || undefined,
                sort_order: sortOrder || undefined,
            });
            setMembers(response.items);
            setTotalCount(response.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
            console.error('載入員工清單失敗:', e);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, departmentFilter, memberTypeFilter, isEmployedFilter, currentPage, pageSize, sortBy, sortOrder]);

    /**
     * 載入部門清單
     */
    const fetchDivisions = useCallback(async () => {
        try {
            const data = await api.getDivisions();
            setDivisions(data);
        } catch (e) {
            console.error('載入部門清單失敗:', e);
        }
    }, []);

    // 初始化載入部門
    useEffect(() => {
        fetchDivisions();
    }, [fetchDivisions]);

    // 搜尋/篩選變更時重新載入並重置頁碼
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, departmentFilter, memberTypeFilter]);

    // 搜尋/篩選/分頁變更時重新載入
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMembers();
        }, 300); // debounce 300ms

        return () => clearTimeout(timer);
    }, [fetchMembers]);

    /**
     * 新增員工
     */
    const addEmployee = useCallback(async (data: MemberFormData & { emp_id: string }) => {
        setError(null);
        try {
            await api.createMember(data);
            await fetchMembers();
        } catch (e) {
            const message = e instanceof Error ? e.message : '新增失敗';
            setError(message);
            throw e;
        }
    }, [fetchMembers]);

    /**
     * 更新員工資料
     */
    const updateEmployee = useCallback(async (empId: string, data: MemberFormData) => {
        setError(null);
        try {
            await api.updateMember(empId, data);
            await fetchMembers();
            setEditingEmployee(null);
        } catch (e) {
            const message = e instanceof Error ? e.message : '更新失敗';
            setError(message);
            throw e;
        }
    }, [fetchMembers]);

    /**
     * 刪除員工
     */
    const deleteEmployee = useCallback(async (empId: string) => {
        setError(null);
        try {
            await api.deleteMember(empId);
            await fetchMembers();
        } catch (e) {
            const message = e instanceof Error ? e.message : '刪除失敗';
            setError(message);
            throw e;
        }
    }, [fetchMembers]);

    /**
     * 開始編輯員工
     * NOTE: 同時捲動到頁面頂部，讓使用者看到表單區域
     */
    const startEdit = useCallback((member: Member) => {
        setEditingEmployee(member);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    /**
     * 取消編輯
     */
    const cancelEdit = useCallback(() => {
        setEditingEmployee(null);
    }, []);

    /**
     * 變更排序
     */
    const handleSort = useCallback((key: string, order: SortOrder) => {
        setSortBy(order ? key : null);
        setSortOrder(order);
    }, []);

    /**
     * 重新載入資料
     */
    const refresh = useCallback(() => {
        fetchMembers();
        fetchDivisions();
    }, [fetchMembers, fetchDivisions]);

    return {
        employees: members,
        allEmployees: members,
        divisions,
        searchTerm,
        setSearchTerm,
        departmentFilter,
        setDepartmentFilter,
        memberTypeFilter,
        setMemberTypeFilter,
        isEmployedFilter,
        setIsEmployedFilter,
        editingEmployee,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        startEdit,
        cancelEdit,
        refresh,
        isLoading,
        error,
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
    };
}
