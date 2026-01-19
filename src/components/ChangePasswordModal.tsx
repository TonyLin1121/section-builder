/**
 * 變更密碼對話框
 * NOTE: 允許登入使用者變更自己的密碼
 */
import { useState } from 'react';
import { changePassword } from '../services/authApi';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    /**
     * 處理表單提交
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 驗證
        if (newPassword !== confirmPassword) {
            setError('新密碼與確認密碼不符');
            return;
        }

        if (newPassword.length < 8) {
            setError('新密碼長度至少需要 8 個字元');
            return;
        }

        setIsLoading(true);
        try {
            await changePassword(oldPassword, newPassword);
            setSuccess(true);
            // 3 秒後關閉對話框
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (e) {
            setError(e instanceof Error ? e.message : '變更密碼失敗');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 關閉對話框並重置狀態
     */
    const handleClose = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🔐 變更密碼</h2>
                    <button className="close-btn" onClick={handleClose}>✕</button>
                </div>

                {success ? (
                    <div className="success-message">
                        <span className="success-icon">✅</span>
                        <p>密碼變更成功！</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="error-message">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label>目前密碼</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder="請輸入目前的密碼"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="form-group">
                            <label>新密碼</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="請輸入新密碼（至少 8 個字元）"
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <label>確認新密碼</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="請再次輸入新密碼"
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="password-rules">
                            <p>密碼規則：</p>
                            <ul>
                                <li className={newPassword.length >= 8 ? 'valid' : ''}>
                                    至少 8 個字元
                                </li>
                                <li className={/[A-Z]/.test(newPassword) ? 'valid' : ''}>
                                    包含大寫字母
                                </li>
                                <li className={/[a-z]/.test(newPassword) ? 'valid' : ''}>
                                    包含小寫字母
                                </li>
                                <li className={/[0-9]/.test(newPassword) ? 'valid' : ''}>
                                    包含數字
                                </li>
                            </ul>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={handleClose}>
                                取消
                            </button>
                            <button type="submit" className="btn-submit" disabled={isLoading}>
                                {isLoading ? '處理中...' : '確認變更'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
