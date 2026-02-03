/**
 * Webhook API 服務
 * NOTE: 封裝與 n8n webhook 代理的 HTTP 請求
 */
import { httpRequest } from './httpClient';

/**
 * KM 查詢請求參數
 */
export interface KMQueryRequest {
    query: string;
    context?: Record<string, unknown>;
}

/**
 * KM 查詢回應
 */
export interface KMQueryResponse {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

/**
 * Webhook 健康檢查回應
 */
export interface WebhookHealthResponse {
    status: 'healthy' | 'incomplete';
    config: {
        webhook_url_configured: boolean;
        auth_name_configured: boolean;
        auth_value_configured: boolean;
    };
}

/**
 * 發送 KM 查詢
 * NOTE: 只有登入使用者才能使用此 API
 * @param request 查詢請求
 * @returns KM 查詢結果
 */
export async function queryKM(request: KMQueryRequest): Promise<KMQueryResponse> {
    return httpRequest<KMQueryResponse>('/webhook/km', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

/**
 * 檢查 Webhook 健康狀態
 * @returns Webhook 設定狀態
 */
export async function checkWebhookHealth(): Promise<WebhookHealthResponse> {
    return httpRequest<WebhookHealthResponse>('/webhook/health');
}
