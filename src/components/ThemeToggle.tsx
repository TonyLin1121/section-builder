/**
 * 主題切換組件
 * NOTE: 提供明亮/暗黑/跟隨系統三種模式的切換按鈕
 */
import { useTheme, type ThemeMode } from '../hooks/useTheme';
import './ThemeToggle.css';

interface ThemeOption {
    mode: ThemeMode;
    icon: string;
    label: string;
}

const themeOptions: ThemeOption[] = [
    { mode: 'light', icon: '☀️', label: '明亮' },
    { mode: 'dark', icon: '🌙', label: '暗黑' },
    { mode: 'system', icon: '💻', label: '系統' },
];

/**
 * 主題切換按鈕組
 */
export function ThemeToggle() {
    const { mode, setMode } = useTheme();

    return (
        <div className="theme-toggle">
            <div className="theme-toggle-label">🎨 主題設定</div>
            <div className="theme-toggle-options">
                {themeOptions.map(option => (
                    <button
                        key={option.mode}
                        className={`theme-option ${mode === option.mode ? 'active' : ''}`}
                        onClick={() => setMode(option.mode)}
                        title={option.label}
                        aria-label={`切換到${option.label}模式`}
                    >
                        <span className="theme-option-icon">{option.icon}</span>
                        <span className="theme-option-label">{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
