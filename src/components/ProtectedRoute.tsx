/**
 * 受保護路由組件
 * NOTE: 未登入時重定向至登入頁
 */
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, hasRole, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // 載入中顯示載入畫面
    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>載入中...</p>
            </div>
        );
    }

    // 未登入，重定向至登入頁
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 檢查角色權限
    if (requiredRole && !hasRole(requiredRole)) {
        const handleGoHome = () => {
            navigate('/');
        };
        const handleLogout = async () => {
            await logout();
            navigate('/login');
        };

        return (
            <div className="access-denied">
                <h1>🚫 權限不足</h1>
                <p>您沒有權限訪問此頁面</p>
                <div className="access-denied-actions">
                    <button onClick={handleGoHome} className="btn-primary">
                        返回首頁
                    </button>
                    <button onClick={handleLogout} className="btn-secondary">
                        重新登入
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
