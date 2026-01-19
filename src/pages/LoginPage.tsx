/**
 * 登入頁面
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login as loginApi } from '../services/authApi';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // 取得重定向目標
    const from = (location.state as any)?.from?.pathname || '/';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const result = await loginApi(userId, password);

            if (result.success && result.user_id) {
                // 設定認證狀態
                login({
                    user_id: result.user_id,
                    user_name: result.user_name,
                    roles: result.roles || [],
                    is_active: true,
                });

                // 重定向回原本頁面
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '登入失敗');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <h1>🔐 系統登入</h1>
                        <p>請輸入您的帳號密碼</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        {error && (
                            <div className="login-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="userId">帳號</label>
                            <input
                                id="userId"
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="請輸入員工編號"
                                required
                                autoFocus
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">密碼</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="請輸入密碼"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-button"
                            disabled={isLoading || !userId || !password}
                        >
                            {isLoading ? '登入中...' : '登入'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>部門人員管理系統 v1.0</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
