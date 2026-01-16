import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

/**
 * 應用佈局組件（包含側邊選單）
 */
export function Layout({ children }: LayoutProps) {
    const location = useLocation();

    const menuItems = [
        { path: '/', label: '👥 員工管理', icon: '👥' },
        { path: '/attendance', label: '📅 請假維護', icon: '📅' },
        { path: '/annual-leave', label: '🗓️ 年度休假', icon: '🗓️' },
        { path: '/codetable', label: '⚙️ 參數檔維護', icon: '⚙️' },
    ];

    return (
        <div className="app-layout">
            {/* 側邊選單 */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>部門管理系統</h2>
                </div>
                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>
                {/* 主題設定 */}
                <ThemeToggle />
            </aside>

            {/* 主要內容區 */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

