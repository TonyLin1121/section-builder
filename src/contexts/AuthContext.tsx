/**
 * 認證 Context
 * NOTE: 管理全域認證狀態
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getCurrentUser, logout as logoutApi, type UserInfo } from '../services/authApi';
import { initCsrfToken } from '../services/httpClient';

interface AuthContextType {
    user: UserInfo | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    hasRole: (role: string) => boolean;
    login: (user: UserInfo) => void;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    /**
     * 檢查使用者是否擁有指定角色
     */
    const hasRole = useCallback((role: string) => {
        return user?.roles?.includes(role) ?? false;
    }, [user]);

    /**
     * 設定登入使用者
     */
    const login = useCallback((userInfo: UserInfo) => {
        setUser(userInfo);
    }, []);

    /**
     * 登出
     */
    const logout = useCallback(async () => {
        try {
            await logoutApi();
        } catch (e) {
            // 忽略錯誤
        }
        setUser(null);
    }, []);

    /**
     * 重新取得使用者資訊
     */
    const refreshUser = useCallback(async () => {
        try {
            const userInfo = await getCurrentUser();
            setUser(userInfo);
        } catch (e) {
            setUser(null);
        }
    }, []);

    /**
     * 初始載入時檢查登入狀態
     * NOTE: 先初始化 CSRF token，確保後續 API 請求都有有效的 token
     */
    useEffect(() => {
        async function checkAuth() {
            try {
                // 先初始化 CSRF token
                await initCsrfToken();

                // 再檢查登入狀態
                const userInfo = await getCurrentUser();
                setUser(userInfo);
            } catch (e) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        }
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated,
            hasRole,
            login,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * 使用認證 Context
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
