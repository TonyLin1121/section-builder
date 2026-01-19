/**
 * 系統使用者管理 Hook
 * NOTE: 處理使用者列表的獲取、搜尋、分頁和 CRUD 操作
 */
import { useState, useEffect, useCallback } from 'react';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getAvailableMembers,
    getRoles,
    type SystemUser,
    type CreateUserRequest,
    type UpdateUserRequest,
    type AvailableMember,
    type Role,
} from '../services/systemApi';

interface UseSystemUsersReturn {
    // 資料
    users: SystemUser[];
    availableMembers: AvailableMember[];
    roles: Role[];
    editingUser: SystemUser | null;

    // 狀態
    isLoading: boolean;
    error: string | null;

    // 分頁
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    totalCount: number;

    // 搜尋
    searchTerm: string;
    setSearchTerm: (term: string) => void;

    // 操作
    addUser: (data: CreateUserRequest) => Promise<void>;
    modifyUser: (userId: string, data: UpdateUserRequest) => Promise<void>;
    removeUser: (userId: string) => Promise<void>;
    startEdit: (user: SystemUser) => void;
    cancelEdit: () => void;
    refresh: () => void;
    searchAvailableMembers: (search: string) => Promise<void>;
}

export function useSystemUsers(): UseSystemUsersReturn {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * 獲取使用者列表
     */
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getUsers({
                page: currentPage,
                page_size: pageSize,
                search: searchTerm || undefined,
            });
            setUsers(response.items);
            setTotalCount(response.total);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入使用者失敗');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, searchTerm]);

    /**
     * 獲取角色列表
     */
    const fetchRoles = useCallback(async () => {
        try {
            const response = await getRoles();
            setRoles(response.items);
        } catch (e) {
            console.error('載入角色失敗:', e);
        }
    }, []);

    /**
     * 搜尋可建立帳號的員工
     */
    const searchAvailableMembers = useCallback(async (search: string) => {
        try {
            const response = await getAvailableMembers(search);
            setAvailableMembers(response.items);
        } catch (e) {
            console.error('搜尋員工失敗:', e);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchRoles();
        searchAvailableMembers('');
    }, [fetchRoles, searchAvailableMembers]);

    /**
     * 新增使用者
     */
    const addUser = useCallback(async (data: CreateUserRequest) => {
        await createUser(data);
        await fetchUsers();
        await searchAvailableMembers('');
    }, [fetchUsers, searchAvailableMembers]);

    /**
     * 更新使用者
     */
    const modifyUser = useCallback(async (userId: string, data: UpdateUserRequest) => {
        await updateUser(userId, data);
        await fetchUsers();
        setEditingUser(null);
    }, [fetchUsers]);

    /**
     * 刪除使用者
     */
    const removeUser = useCallback(async (userId: string) => {
        await deleteUser(userId);
        await fetchUsers();
        await searchAvailableMembers('');
    }, [fetchUsers, searchAvailableMembers]);

    /**
     * 開始編輯
     */
    const startEdit = useCallback((user: SystemUser) => {
        setEditingUser(user);
    }, []);

    /**
     * 取消編輯
     */
    const cancelEdit = useCallback(() => {
        setEditingUser(null);
    }, []);

    /**
     * 重新整理
     */
    const refresh = useCallback(() => {
        fetchUsers();
        fetchRoles();
    }, [fetchUsers, fetchRoles]);

    return {
        users,
        availableMembers,
        roles,
        editingUser,
        isLoading,
        error,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalCount,
        searchTerm,
        setSearchTerm,
        addUser,
        modifyUser,
        removeUser,
        startEdit,
        cancelEdit,
        refresh,
        searchAvailableMembers,
    };
}
