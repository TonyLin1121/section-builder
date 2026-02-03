/**
 * i 助手聊天頁面
 * NOTE: 類似 Claude Code 風格的 AI 聊天介面
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAssistant } from '../hooks/useAssistant';
import type { LocalMessage } from '../hooks/useAssistant';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AssistantPage.css';

/**
 * 訊息氣泡組件
 */
function MessageBubble({ message }: { message: LocalMessage }) {
    const isUser = message.role === 'user';

    return (
        <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
            <div className="message-avatar">
                {isUser ? '👤' : '🤖'}
            </div>
            <div className={`message-bubble ${message.isError ? 'error' : ''}`}>
                {message.isLoading ? (
                    <div className="message-loading">
                        <span className="loading-dot"></span>
                        <span className="loading-dot"></span>
                        <span className="loading-dot"></span>
                    </div>
                ) : isUser ? (
                    <p>{message.content}</p>
                ) : (
                    <div className="message-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}
                {message.created_at && !message.isLoading && (
                    <div className="message-time">
                        {new Date(message.created_at).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * 設定對話框組件
 */
function SettingsDialog({
    isOpen,
    webhookUrl,
    onClose,
    onSave,
}: {
    isOpen: boolean;
    webhookUrl: string;
    onClose: () => void;
    onSave: (url: string) => Promise<void>;
}) {
    const [url, setUrl] = useState(webhookUrl);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setUrl(webhookUrl);
        setError(null);
    }, [webhookUrl, isOpen]);

    const handleSave = async () => {
        if (!url.trim()) {
            setError('請輸入 Webhook URL');
            return;
        }

        // 簡單的 URL 格式驗證
        try {
            new URL(url);
        } catch {
            setError('請輸入有效的 URL 格式');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await onSave(url.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : '儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-dialog" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h3>⚙️ i 助手設定</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="settings-body">
                    <div className="form-group">
                        <label htmlFor="webhook-url">n8n Webhook URL</label>
                        <input
                            id="webhook-url"
                            type="url"
                            placeholder="https://your-n8n.com/webhook/xxx"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            disabled={isSaving}
                        />
                        <p className="form-hint">
                            輸入您的 n8n Webhook URL，系統將透過此端點與 AI 進行對話。
                        </p>
                    </div>
                    {error && <div className="settings-error">{error}</div>}
                </div>
                <div className="settings-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={isSaving}>
                        取消
                    </button>
                    <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? '儲存中...' : '儲存設定'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * i 助手主頁面
 */
export function AssistantPage() {
    const {
        messages,
        settings,
        isLoading,
        isSending,
        isSettingsOpen,
        error,
        sendMessage,
        clearHistory,
        updateSettings,
        openSettings,
        closeSettings,
        clearError,
    } = useAssistant();

    const [input, setInput] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    /**
     * 自動滾動到底部
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /**
     * 自動聚焦輸入框
     */
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    /**
     * 處理發送訊息
     */
    const handleSend = useCallback(async () => {
        if (!input.trim() || isSending) return;
        const message = input;
        setInput('');
        await sendMessage(message);
        inputRef.current?.focus();
    }, [input, isSending, sendMessage]);

    /**
     * 處理鍵盤事件
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    /**
     * 處理清除歷史
     */
    const handleClearHistory = async () => {
        try {
            await clearHistory();
            setShowClearConfirm(false);
        } catch {
            // 錯誤已在 hook 中處理
        }
    };

    /**
     * 自動調整文字區域高度
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        // 自動調整高度
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
    };

    return (
        <div className="assistant-page">
            {/* 頁面標題列 */}
            <div className="assistant-header">
                <div className="header-title">
                    <span className="header-icon">🤖</span>
                    <h1>i 助手</h1>
                </div>
                <div className="header-actions">
                    {messages.length > 0 && (
                        <button
                            className="action-btn danger"
                            onClick={() => setShowClearConfirm(true)}
                            title="清除對話"
                        >
                            🗑️ 清除對話
                        </button>
                    )}
                    <button
                        className="action-btn"
                        onClick={openSettings}
                        title="設定"
                    >
                        ⚙️ 設定
                    </button>
                </div>
            </div>

            {/* 錯誤訊息 */}
            {error && (
                <div className="error-banner">
                    <span>{error}</span>
                    <button onClick={clearError}>×</button>
                </div>
            )}

            {/* 聊天區域 */}
            <div className="chat-container">
                {isLoading ? (
                    <div className="chat-loading">
                        <div className="spinner"></div>
                        <p>載入對話歷史...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        <div className="empty-icon">🤖</div>
                        <h2>歡迎使用 i 助手</h2>
                        <p>開始輸入您的問題，我會盡力為您解答。</p>
                        {!settings?.webhook_url && (
                            <button className="btn-primary" onClick={openSettings}>
                                設定 Webhook URL
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.map(message => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* 輸入區域 */}
            <div className="input-container">
                <div className="input-wrapper">
                    <textarea
                        ref={inputRef}
                        placeholder="輸入您的訊息... (Shift+Enter 換行)"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isSending}
                        rows={1}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        title="發送訊息"
                    >
                        {isSending ? (
                            <span className="sending-icon">⏳</span>
                        ) : (
                            <span>➤</span>
                        )}
                    </button>
                </div>
                <p className="input-hint">
                    使用 Enter 發送，Shift+Enter 換行
                </p>
            </div>

            {/* 設定對話框 */}
            <SettingsDialog
                isOpen={isSettingsOpen}
                webhookUrl={settings?.webhook_url || ''}
                onClose={closeSettings}
                onSave={updateSettings}
            />

            {/* 清除確認對話框 */}
            {showClearConfirm && (
                <div className="confirm-overlay" onClick={() => setShowClearConfirm(false)}>
                    <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                        <h3>確認清除</h3>
                        <p>確定要清除所有對話記錄嗎？此操作無法復原。</p>
                        <div className="confirm-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowClearConfirm(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn-danger"
                                onClick={handleClearHistory}
                            >
                                確認清除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
