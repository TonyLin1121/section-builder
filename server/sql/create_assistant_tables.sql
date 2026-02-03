-- ============================================
-- i 助手相關資料表
-- ============================================

-- 使用者設定表
CREATE TABLE IF NOT EXISTS user_assistant_settings (
    user_id VARCHAR(20) PRIMARY KEY,
    webhook_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 對話歷史表
CREATE TABLE IF NOT EXISTS assistant_chat_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- 'user' 或 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON assistant_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON assistant_chat_history(user_id, created_at DESC);

-- 註解
COMMENT ON TABLE user_assistant_settings IS 'i 助手使用者設定';
COMMENT ON TABLE assistant_chat_history IS 'i 助手對話歷史';
