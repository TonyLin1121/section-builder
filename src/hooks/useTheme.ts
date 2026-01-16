/**
 * 主題管理 Hook
 * NOTE: 提供明亮/暗黑/跟隨系統三種主題模式
 */
import { useState, useEffect, useCallback, createContext, useContext } from 'react';

/** 主題模式類型 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 實際應用的主題 */
export type AppliedTheme = 'light' | 'dark';

/** 主題 Context 介面 */
interface ThemeContextValue {
    /** 用戶選擇的模式 */
    mode: ThemeMode;
    /** 實際應用的主題 */
    appliedTheme: AppliedTheme;
    /** 設置主題模式 */
    setMode: (mode: ThemeMode) => void;
}

/** localStorage 儲存的鍵名 */
const THEME_STORAGE_KEY = 'theme-mode';

/**
 * 取得系統偏好的主題
 */
function getSystemTheme(): AppliedTheme {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // 預設暗黑模式
}

/**
 * 從 localStorage 讀取儲存的主題模式
 */
function getStoredMode(): ThemeMode {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
    }
    return 'system'; // 預設跟隨系統
}

/**
 * 計算實際應用的主題
 */
function resolveTheme(mode: ThemeMode): AppliedTheme {
    if (mode === 'system') {
        return getSystemTheme();
    }
    return mode;
}

/**
 * 主題 Context
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * 使用主題 Hook
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme 必須在 ThemeProvider 內使用');
    }
    return context;
}

/**
 * 主題管理邏輯 Hook（供 ThemeProvider 使用）
 */
export function useThemeManager(): ThemeContextValue {
    const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
    const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => resolveTheme(getStoredMode()));

    /**
     * 設置主題模式
     */
    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        localStorage.setItem(THEME_STORAGE_KEY, newMode);
    }, []);

    /**
     * 更新 DOM 上的主題屬性
     */
    useEffect(() => {
        const resolved = resolveTheme(mode);
        setAppliedTheme(resolved);
        document.documentElement.setAttribute('data-theme', resolved);
    }, [mode]);

    /**
     * 監聽系統主題變更（僅在 system 模式下生效）
     */
    useEffect(() => {
        if (mode !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'dark' : 'light';
            setAppliedTheme(newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [mode]);

    return { mode, appliedTheme, setMode };
}
