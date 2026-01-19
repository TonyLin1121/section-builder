/**
 * 系統角色管理 Hook
 * NOTE: 處理角色列表的獲取和 CRUD 操作
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getFunctions,
    getMenus,
    type Role,
    type RoleRequest,
    type SystemFunction,
    type Menu,
} from '../services/systemApi';

/**
 * 按選單分組的功能結構
 */
export interface FunctionGroup {
    menu_id: string;
    menu_name: string;
    icon?: string;
    functions: SystemFunction[];
}

interface UseSystemRolesReturn {
    // 資料
    roles: Role[];
    functions: SystemFunction[];
    functionGroups: FunctionGroup[];
    editingRole: Role | null;

    // 狀態
    isLoading: boolean;
    error: string | null;

    // 操作
    addRole: (data: RoleRequest) => Promise<void>;
    modifyRole: (roleId: string, data: RoleRequest) => Promise<void>;
    removeRole: (roleId: string) => Promise<void>;
    startEdit: (role: Role) => void;
    cancelEdit: () => void;
    refresh: () => void;
}

export function useSystemRoles(): UseSystemRolesReturn {
    const [roles, setRoles] = useState<Role[]>([]);
    const [functions, setFunctions] = useState<SystemFunction[]>([]);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * 按選單分組功能
     */
    const functionGroups = useMemo(() => {
        // 建立選單映射（支援巢狀選單）
        const flattenMenus = (menuList: Menu[]): Map<string, Menu> => {
            const map = new Map<string, Menu>();
            const traverse = (items: Menu[]) => {
                for (const menu of items) {
                    map.set(menu.menu_id, menu);
                    if (menu.children?.length) {
                        traverse(menu.children);
                    }
                }
            };
            traverse(menuList);
            return map;
        };

        const menuMap = flattenMenus(menus);
        const groupMap = new Map<string, FunctionGroup>();

        for (const func of functions) {
            const menuId = func.menu_id || 'OTHER';
            const menu = menuMap.get(menuId);

            if (!groupMap.has(menuId)) {
                groupMap.set(menuId, {
                    menu_id: menuId,
                    menu_name: menu?.menu_name || '其他',
                    icon: menu?.icon,
                    functions: [],
                });
            }
            groupMap.get(menuId)!.functions.push(func);
        }

        // 按選單排序
        return Array.from(groupMap.values()).sort((a, b) => {
            const menuA = menuMap.get(a.menu_id);
            const menuB = menuMap.get(b.menu_id);
            return (menuA?.sort_order || 999) - (menuB?.sort_order || 999);
        });
    }, [functions, menus]);

    /**
     * 獲取角色列表
     */
    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getRoles();
            setRoles(response.items);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入角色失敗');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 獲取功能列表和選單
     */
    const fetchFunctionsAndMenus = useCallback(async () => {
        try {
            const [functionsRes, menusRes] = await Promise.all([
                getFunctions(),
                getMenus(),
            ]);
            setFunctions(functionsRes.items);
            setMenus(menusRes.items);
        } catch (e) {
            console.error('載入功能列表失敗:', e);
        }
    }, []);

    useEffect(() => {
        fetchRoles();
        fetchFunctionsAndMenus();
    }, [fetchRoles, fetchFunctionsAndMenus]);

    /**
     * 新增角色
     */
    const addRole = useCallback(async (data: RoleRequest) => {
        await createRole(data);
        await fetchRoles();
    }, [fetchRoles]);

    /**
     * 更新角色
     */
    const modifyRole = useCallback(async (roleId: string, data: RoleRequest) => {
        await updateRole(roleId, data);
        await fetchRoles();
        setEditingRole(null);
    }, [fetchRoles]);

    /**
     * 刪除角色
     */
    const removeRole = useCallback(async (roleId: string) => {
        await deleteRole(roleId);
        await fetchRoles();
    }, [fetchRoles]);

    /**
     * 開始編輯
     */
    const startEdit = useCallback((role: Role) => {
        setEditingRole(role);
    }, []);

    /**
     * 取消編輯
     */
    const cancelEdit = useCallback(() => {
        setEditingRole(null);
    }, []);

    /**
     * 重新整理
     */
    const refresh = useCallback(() => {
        fetchRoles();
        fetchFunctionsAndMenus();
    }, [fetchRoles, fetchFunctionsAndMenus]);

    return {
        roles,
        functions,
        functionGroups,
        editingRole,
        isLoading,
        error,
        addRole,
        modifyRole,
        removeRole,
        startEdit,
        cancelEdit,
        refresh,
    };
}
