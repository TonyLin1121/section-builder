-- ============================================
-- 公告功能資料表建立腳本
-- ============================================

-- 1. 公告類別
CREATE TABLE IF NOT EXISTS sys_announcement_category (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sys_announcement_category IS '公告類別';
COMMENT ON COLUMN sys_announcement_category.category_id IS '類別代碼';
COMMENT ON COLUMN sys_announcement_category.category_name IS '類別名稱';
COMMENT ON COLUMN sys_announcement_category.icon IS '類別圖示';
COMMENT ON COLUMN sys_announcement_category.sort_order IS '排序順序';

-- 2. 公告主檔
CREATE TABLE IF NOT EXISTS sys_announcement (
    announcement_id SERIAL PRIMARY KEY,
    category_id VARCHAR(20),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    target_type VARCHAR(20) DEFAULT 'all',  -- all, role, division, user
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    push_notification BOOLEAN DEFAULT false,
    publish_date DATE DEFAULT CURRENT_DATE,
    expire_date DATE,
    created_by VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_announcement_category FOREIGN KEY (category_id) 
        REFERENCES sys_announcement_category(category_id) ON DELETE SET NULL
);

COMMENT ON TABLE sys_announcement IS '公告主檔';
COMMENT ON COLUMN sys_announcement.announcement_id IS '公告編號';
COMMENT ON COLUMN sys_announcement.category_id IS '類別代碼';
COMMENT ON COLUMN sys_announcement.title IS '公告標題';
COMMENT ON COLUMN sys_announcement.content IS '公告內容';
COMMENT ON COLUMN sys_announcement.target_type IS '目標類型（all:全部, role:角色, division:部門, user:個人）';
COMMENT ON COLUMN sys_announcement.is_pinned IS '是否置頂';
COMMENT ON COLUMN sys_announcement.is_active IS '是否啟用';
COMMENT ON COLUMN sys_announcement.push_notification IS '是否推送通知';
COMMENT ON COLUMN sys_announcement.publish_date IS '發布日期';
COMMENT ON COLUMN sys_announcement.expire_date IS '到期日期';
COMMENT ON COLUMN sys_announcement.created_by IS '建立者';

-- 3. 公告附件
CREATE TABLE IF NOT EXISTS sys_announcement_attachment (
    attachment_id SERIAL PRIMARY KEY,
    announcement_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachment_announcement FOREIGN KEY (announcement_id) 
        REFERENCES sys_announcement(announcement_id) ON DELETE CASCADE
);

COMMENT ON TABLE sys_announcement_attachment IS '公告附件';
COMMENT ON COLUMN sys_announcement_attachment.file_name IS '檔案名稱';
COMMENT ON COLUMN sys_announcement_attachment.file_path IS '檔案路徑';
COMMENT ON COLUMN sys_announcement_attachment.file_size IS '檔案大小（bytes）';
COMMENT ON COLUMN sys_announcement_attachment.file_type IS '檔案類型（MIME）';

-- 4. 公告目標對象（非 all 時使用）
CREATE TABLE IF NOT EXISTS sys_announcement_target (
    announcement_id INTEGER NOT NULL,
    target_type VARCHAR(20) NOT NULL,  -- role, division, user
    target_value VARCHAR(50) NOT NULL,
    PRIMARY KEY (announcement_id, target_type, target_value),
    CONSTRAINT fk_target_announcement FOREIGN KEY (announcement_id) 
        REFERENCES sys_announcement(announcement_id) ON DELETE CASCADE
);

COMMENT ON TABLE sys_announcement_target IS '公告目標對象';
COMMENT ON COLUMN sys_announcement_target.target_type IS '目標類型';
COMMENT ON COLUMN sys_announcement_target.target_value IS '目標值（角色ID/部門代號/員工編號）';

-- 5. 使用者已讀記錄
CREATE TABLE IF NOT EXISTS sys_announcement_read (
    announcement_id INTEGER NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (announcement_id, user_id),
    CONSTRAINT fk_read_announcement FOREIGN KEY (announcement_id) 
        REFERENCES sys_announcement(announcement_id) ON DELETE CASCADE
);

COMMENT ON TABLE sys_announcement_read IS '公告已讀記錄';

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_announcement_category ON sys_announcement(category_id);
CREATE INDEX IF NOT EXISTS idx_announcement_active ON sys_announcement(is_active, publish_date, expire_date);
CREATE INDEX IF NOT EXISTS idx_announcement_target ON sys_announcement_target(target_type, target_value);
CREATE INDEX IF NOT EXISTS idx_announcement_read_user ON sys_announcement_read(user_id);

-- ============================================
-- 新增預設資料
-- ============================================

-- 預設類別
INSERT INTO sys_announcement_category (category_id, category_name, icon, sort_order) VALUES
    ('GENERAL', '一般公告', '📢', 1),
    ('URGENT', '緊急公告', '🚨', 2),
    ('SYSTEM', '系統通知', '⚙️', 3),
    ('HR', '人事公告', '👥', 4)
ON CONFLICT (category_id) DO NOTHING;

-- 新增公告功能清單
INSERT INTO sys_menu (menu_id, menu_name, parent_menu_id, menu_path, icon, sort_order) VALUES
    ('ANNOUNCEMENT', '公告管理', 'SYSTEM', '/system/announcements', '📢', 5)
ON CONFLICT (menu_id) DO NOTHING;

-- 新增公告功能
INSERT INTO sys_function (function_id, function_name, menu_id, function_type, api_path) VALUES
    ('ANNOUNCEMENT_VIEW', '查看公告', 'ANNOUNCEMENT', 'view', '/api/announcements'),
    ('ANNOUNCEMENT_ADD', '新增公告', 'ANNOUNCEMENT', 'add', '/api/announcements'),
    ('ANNOUNCEMENT_EDIT', '編輯公告', 'ANNOUNCEMENT', 'edit', '/api/announcements'),
    ('ANNOUNCEMENT_DELETE', '刪除公告', 'ANNOUNCEMENT', 'delete', '/api/announcements')
ON CONFLICT (function_id) DO NOTHING;

-- 將公告功能授權給 ADMIN 角色
INSERT INTO sys_role_function (role_id, function_id)
SELECT 'ADMIN', function_id FROM sys_function WHERE menu_id = 'ANNOUNCEMENT'
ON CONFLICT (role_id, function_id) DO NOTHING;

-- 將公告查看功能授權給 USER 角色
INSERT INTO sys_role_function (role_id, function_id) VALUES
    ('USER', 'ANNOUNCEMENT_VIEW')
ON CONFLICT (role_id, function_id) DO NOTHING;
