/**
 * i 助手 API 服務
 * NOTE: 提供 n8n Webhook 代理、使用者設定、對話歷史功能
 */
import { httpRequest } from './httpClient';

// ============================================
// 類型定義
// ============================================

/**
 * 使用者設定
 */
export interface AssistantSettings {
    user_id: string;
    webhook_url: string | null;
    created_at: string | null;
    updated_at: string | null;
}

/**
 * 更新設定請求
 */
export interface AssistantSettingsUpdate {
    webhook_url: string | null;
}

/**
 * 聊天訊息
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    created_at: string | null;
}

/**
 * 發送訊息請求
 */
export interface ChatRequest {
    message: string;
}

/**
 * 訊息回應
 */
export interface ChatResponse {
    response: string;
    message_id: number | null;
}

/**
 * 對話歷史回應
 */
export interface ChatHistoryResponse {
    messages: ChatMessage[];
    total: number;
}

// ============================================
// API 函數
// ============================================

/**
 * 取得使用者設定
 */
export async function getSettings(): Promise<AssistantSettings> {
    return httpRequest<AssistantSettings>('/assistant/settings');
}

/**
 * 更新使用者設定
 */
export async function updateSettings(settings: AssistantSettingsUpdate): Promise<AssistantSettings> {
    return httpRequest<AssistantSettings>('/assistant/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

/**
 * 發送訊息到 n8n Webhook
 */
export async function sendMessage(message: string): Promise<ChatResponse> {
    return httpRequest<ChatResponse>('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
    });
}

/**
 * 取得對話歷史
 */
export async function getHistory(limit = 50): Promise<ChatHistoryResponse> {
    return httpRequest<ChatHistoryResponse>(`/assistant/history?limit=${limit}`);
}

/**
 * 清除對話歷史
 */
export async function clearHistory(): Promise<{ message: string }> {
    return httpRequest<{ message: string }>('/assistant/history', {
        method: 'DELETE',
    });
}
