/**
 * useAssistant Hook
 * NOTE: 管理 i 助手聊天狀態、設定和對話歷史
 */
import { useState, useCallback, useEffect } from 'react';
import * as assistantApi from '../services/assistantApi';
import type { AssistantSettings, ChatMessage } from '../services/assistantApi';

/**
 * 本地訊息狀態（包含載入中狀態）
 */
export interface LocalMessage extends ChatMessage {
    id: string;
    isLoading?: boolean;
    isError?: boolean;
}

/**
 * Hook 回傳值
 */
export interface UseAssistantReturn {
    // 狀態
    messages: LocalMessage[];
    settings: AssistantSettings | null;
    isLoading: boolean;
    isSending: boolean;
    isSettingsOpen: boolean;
    error: string | null;

    // 操作
    sendMessage: (content: string) => Promise<void>;
    loadHistory: () => Promise<void>;
    clearHistory: () => Promise<void>;
    loadSettings: () => Promise<void>;
    updateSettings: (webhookUrl: string | null) => Promise<void>;
    openSettings: () => void;
    closeSettings: () => void;
    clearError: () => void;
}

/**
 * 產生唯一 ID
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * i 助手 Hook
 */
export function useAssistant(): UseAssistantReturn {
    const [messages, setMessages] = useState<LocalMessage[]>([]);
    const [settings, setSettings] = useState<AssistantSettings | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 載入設定
     */
    const loadSettings = useCallback(async () => {
        try {
            const data = await assistantApi.getSettings();
            setSettings(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '載入設定失敗');
        }
    }, []);

    /**
     * 更新設定
     */
    const updateSettings = useCallback(async (webhookUrl: string | null) => {
        try {
            const data = await assistantApi.updateSettings({ webhook_url: webhookUrl });
            setSettings(data);
            setIsSettingsOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新設定失敗');
            throw err;
        }
    }, []);

    /**
     * 載入對話歷史
     */
    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await assistantApi.getHistory();
            const localMessages: LocalMessage[] = data.messages.map(msg => ({
                ...msg,
                id: generateId(),
            }));
            setMessages(localMessages);
        } catch (err) {
            setError(err instanceof Error ? err.message : '載入歷史失敗');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 清除對話歷史
     */
    const clearHistory = useCallback(async () => {
        try {
            await assistantApi.clearHistory();
            setMessages([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : '清除歷史失敗');
            throw err;
        }
    }, []);

    /**
     * 發送訊息
     */
    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return;

        // 檢查是否已設定 Webhook
        if (!settings?.webhook_url) {
            setError('請先設定 Webhook URL');
            setIsSettingsOpen(true);
            return;
        }

        // 新增使用者訊息
        const userMessage: LocalMessage = {
            id: generateId(),
            role: 'user',
            content: content.trim(),
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);

        // 新增載入中的助手訊息
        const loadingMessage: LocalMessage = {
            id: generateId(),
            role: 'assistant',
            content: '',
            created_at: null,
            isLoading: true,
        };
        setMessages(prev => [...prev, loadingMessage]);
        setIsSending(true);

        try {
            const response = await assistantApi.sendMessage(content.trim());

            // 更新助手訊息
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMessage.id
                    ? {
                        ...msg,
                        content: response.response,
                        created_at: new Date().toISOString(),
                        isLoading: false,
                    }
                    : msg
            ));
        } catch (err) {
            // 標記為錯誤訊息
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMessage.id
                    ? {
                        ...msg,
                        content: err instanceof Error ? err.message : '發送失敗',
                        isLoading: false,
                        isError: true,
                    }
                    : msg
            ));
            setError(err instanceof Error ? err.message : '發送訊息失敗');
        } finally {
            setIsSending(false);
        }
    }, [settings?.webhook_url]);

    /**
     * 開啟設定
     */
    const openSettings = useCallback(() => {
        setIsSettingsOpen(true);
    }, []);

    /**
     * 關閉設定
     */
    const closeSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    /**
     * 清除錯誤
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * 初始化
     */
    useEffect(() => {
        loadSettings();
        loadHistory();
    }, [loadSettings, loadHistory]);

    return {
        messages,
        settings,
        isLoading,
        isSending,
        isSettingsOpen,
        error,
        sendMessage,
        loadHistory,
        clearHistory,
        loadSettings,
        updateSettings,
        openSettings,
        closeSettings,
        clearError,
    };
}
