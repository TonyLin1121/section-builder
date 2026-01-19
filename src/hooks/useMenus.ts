/**
 * 選單資料 Hook
 * NOTE: 從後端 API 獲取選單並處理階層結構
 */
import { useState, useEffect, useCallback } from 'react';
import { getMenus, type Menu } from '../services/systemApi';
import { useAuth } from '../contexts/AuthContext';

interface UseMenusReturn {
    menus: Menu[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

/**
 * 取得使用者可見的選單
 * NOTE: 根據使用者角色過濾選單
 */
export function useMenus(): UseMenusReturn {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { hasRole } = useAuth();

    /**
     * 過濾選單項目（僅顯示 ADMIN 可見的系統管理選單）
     */
    const filterMenusByRole = useCallback((menuList: Menu[]): Menu[] => {
        return menuList
            .filter(menu => {
                // 系統管理選單僅 ADMIN 可見
                if (menu.menu_id === 'SYSTEM' || menu.parent_menu_id === 'SYSTEM') {
                    return hasRole('ADMIN');
                }
                return menu.is_active;
            })
            .map(menu => ({
                ...menu,
                children: filterMenusByRole(menu.children || []),
            }));
    }, [hasRole]);

    /**
     * 獲取選單
     */
    const fetchMenus = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getMenus();
            const filteredMenus = filterMenusByRole(response.items);
            setMenus(filteredMenus);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入選單失敗');
            // 失敗時使用預設選單
            setMenus([]);
        } finally {
            setIsLoading(false);
        }
    }, [filterMenusByRole]);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    return {
        menus,
        isLoading,
        error,
        refresh: fetchMenus,
    };
}
