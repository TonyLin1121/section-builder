import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMenus } from '../hooks/useMenus';
import { ThemeToggle } from './ThemeToggle';
import { ChangePasswordModal } from './ChangePasswordModal';
import type { Menu } from '../services/systemApi';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

/**
 * 選單項目組件
 * NOTE: 遞迴渲染階層式選單
 */
function MenuItem({ menu, level = 0 }: { menu: Menu; level?: number }) {
    const location = useLocation();
    // 預設收合，只有當前活動頁面的父選單才展開
    const [isExpanded, setIsExpanded] = useState(
        menu.children?.some(child => location.pathname === child.menu_path) || false
    );

    const hasChildren = menu.children && menu.children.length > 0;
    const isActive = location.pathname === menu.menu_path;
    const isParentActive = menu.children?.some(child => location.pathname === child.menu_path);

    /**
     * 處理點擊
     */
    const handleClick = (e: React.MouseEvent) => {
        if (hasChildren && !menu.menu_path) {
            // 只有子選單沒有路徑的情況下才展開/收合
            e.preventDefault();
            setIsExpanded(!isExpanded);
        } else if (hasChildren) {
            // 有路徑也展開子選單
            setIsExpanded(true);
        }
    };

    return (
        <div className={`menu-item-wrapper ${level > 0 ? 'submenu' : ''}`}>
            {menu.menu_path ? (
                <Link
                    to={menu.menu_path}
                    className={`nav-item ${isActive ? 'active' : ''} ${isParentActive ? 'parent-active' : ''}`}
                    onClick={handleClick}
                    style={{ paddingLeft: `${16 + level * 16}px` }}
                >
                    <span className="nav-icon">{menu.icon || '📄'}</span>
                    <span className="nav-label">{menu.menu_name}</span>
                    {hasChildren && (
                        <span className={`nav-arrow ${isExpanded ? 'expanded' : ''}`}>▸</span>
                    )}
                </Link>
            ) : (
                <button
                    className={`nav-item nav-item-btn ${isParentActive ? 'parent-active' : ''}`}
                    onClick={handleClick}
                    style={{ paddingLeft: `${16 + level * 16}px` }}
                >
                    <span className="nav-icon">{menu.icon || '📄'}</span>
                    <span className="nav-label">{menu.menu_name}</span>
                    {hasChildren && (
                        <span className={`nav-arrow ${isExpanded ? 'expanded' : ''}`}>▸</span>
                    )}
                </button>
            )}

            {/* 子選單 */}
            {hasChildren && isExpanded && (
                <div className="submenu-container">
                    {menu.children!.map(child => (
                        <MenuItem key={child.menu_id} menu={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * 路徑映射：資料庫路徑 -> 前端路由
 * NOTE: 資料庫的路徑與前端路由不一定完全相同
 */
const PATH_MAPPING: Record<string, string> = {
    '/member': '/',
    '/code-table': '/codetable',
    // 系統管理子選單不轉換，保持原路徑
};

/**
 * 應用佈局組件（包含側邊選單）
 * NOTE: 從後端動態載入選單，支援階層展開
 */
export function Layout({ children }: LayoutProps) {
    const navigate = useNavigate();
    const { user, hasRole, logout } = useAuth();
    const { menus, isLoading } = useMenus();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    /**
     * 處理選單路徑映射
     */
    const processedMenus = useMemo(() => {
        const processMenu = (menu: Menu): Menu => ({
            ...menu,
            menu_path: menu.menu_path ? (PATH_MAPPING[menu.menu_path] || menu.menu_path) : undefined,
            children: menu.children?.map(processMenu) || [],
        });
        return menus.map(processMenu);
    }, [menus]);

    /**
     * 預設選單（API 載入失敗時使用）
     */
    const defaultMenus: Menu[] = useMemo(() => [
        { menu_id: 'MEMBER', menu_name: '員工管理', menu_path: '/', icon: '👥', sort_order: 1, is_active: true, children: [] },
        { menu_id: 'ATTENDANCE', menu_name: '請假維護', menu_path: '/attendance', icon: '📅', sort_order: 2, is_active: true, children: [] },
        { menu_id: 'ANNUAL', menu_name: '年度休假', menu_path: '/annual-leave', icon: '🗓️', sort_order: 3, is_active: true, children: [] },
        { menu_id: 'PROJECT', menu_name: '專案管理', menu_path: '/projects', icon: '📊', sort_order: 4, is_active: true, children: [] },
        { menu_id: 'CODETABLE', menu_name: '參數檔維護', menu_path: '/codetable', icon: '⚙️', sort_order: 5, is_active: true, children: [] },
        ...(hasRole('ADMIN') ? [{
            menu_id: 'SYSTEM',
            menu_name: '系統管理',
            icon: '🔐',
            sort_order: 99,
            is_active: true,
            children: [
                { menu_id: 'SYS_USER', menu_name: '使用者管理', menu_path: '/system', icon: '👤', sort_order: 1, is_active: true, children: [] },
            ]
        }] : [])
    ], [hasRole]);

    /**
     * 使用的選單列表
     */
    const displayMenus = processedMenus.length > 0 ? processedMenus : defaultMenus;

    /**
     * 處理登出
     */
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    /**
     * 取得用戶名稱首字
     */
    const getUserInitial = () => {
        if (!user) return '?';
        const name = user.user_name || user.user_id;
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="app-layout">
            {/* 側邊選單 */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">S</div>
                    {!isCollapsed && <h2>部門管理</h2>}
                    <button
                        className="sidebar-toggle"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? '展開選單' : '收合選單'}
                    >
                        {isCollapsed ? '»' : '«'}
                    </button>
                </div>
                {!isCollapsed && (
                    <nav className="sidebar-nav">
                        {isLoading ? (
                            <div className="menu-loading">載入中...</div>
                        ) : (
                            displayMenus.map(menu => (
                                <MenuItem key={menu.menu_id} menu={menu} />
                            ))
                        )}
                    </nav>
                )}

                {/* 用戶資訊與設定 */}
                <div className="sidebar-footer">
                    {user && (
                        <div className="user-info">
                            <div className="user-avatar" title={user.user_name || user.user_id}>{getUserInitial()}</div>
                            {!isCollapsed && (
                                <div className="user-details">
                                    <span className="user-name">{user.user_name || user.user_id}</span>
                                    {user.roles.includes('ADMIN') && (
                                        <span className="user-role-tag">Admin</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {!isCollapsed && (
                        <div className="sidebar-actions">
                            <button
                                className="change-password-btn"
                                onClick={() => setIsPasswordModalOpen(true)}
                                title="變更密碼"
                            >
                                🔑 <span>變更密碼</span>
                            </button>
                            <ThemeToggle />
                            <button className="logout-btn" onClick={handleLogout} title="登出">
                                🚪 <span>登出</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* 主要內容區 */}
            <main className="main-content">
                {children}
            </main>

            {/* 變更密碼對話框 */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
