/**
 * 主題 Provider 組件
 * NOTE: 包裝應用根組件，提供全局主題管理
 */
import { ThemeContext, useThemeManager } from '../hooks/useTheme';

interface ThemeProviderProps {
    children: React.ReactNode;
}

/**
 * 主題 Provider
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    const themeValue = useThemeManager();

    return (
        <ThemeContext.Provider value={themeValue}>
            {children}
        </ThemeContext.Provider>
    );
}
