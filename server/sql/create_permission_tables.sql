-- ============================================
-- 系統權限功能資料表建立腳本
-- ============================================

-- 1. 使用者帳號
CREATE TABLE IF NOT EXISTS sys_user (
    user_id VARCHAR(20) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    active_date DATE DEFAULT CURRENT_DATE,
    expire_date DATE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_fail_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sys_user_member FOREIGN KEY (user_id) REFERENCES member(emp_id)
);

COMMENT ON TABLE sys_user IS '使用者帳號';
COMMENT ON COLUMN sys_user.user_id IS '使用者帳號（= member.emp_id）';
COMMENT ON COLUMN sys_user.password_hash IS '密碼雜湊值（bcrypt）';
COMMENT ON COLUMN sys_user.is_active IS '是否啟用';
COMMENT ON COLUMN sys_user.active_date IS '啟用日期';
COMMENT ON COLUMN sys_user.expire_date IS '帳號到期日';
COMMENT ON COLUMN sys_user.last_login_at IS '最後登入時間';
COMMENT ON COLUMN sys_user.login_fail_count IS '連續登入失敗次數';
COMMENT ON COLUMN sys_user.locked_until IS '鎖定到期時間';
COMMENT ON COLUMN sys_user.password_changed_at IS '密碼最後更新時間';

-- 2. 角色
CREATE TABLE IF NOT EXISTS sys_role (
    role_id VARCHAR(20) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sys_role IS '角色定義';
COMMENT ON COLUMN sys_role.role_id IS '角色代碼';
COMMENT ON COLUMN sys_role.role_name IS '角色名稱';
COMMENT ON COLUMN sys_role.description IS '角色說明';

-- 3. 使用者角色對應
CREATE TABLE IF NOT EXISTS sys_user_role (
    user_id VARCHAR(20) NOT NULL,
    role_id VARCHAR(20) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(20),
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES sys_role(role_id) ON DELETE CASCADE
);

COMMENT ON TABLE sys_user_role IS '使用者角色對應';
COMMENT ON COLUMN sys_user_role.granted_at IS '授權時間';
COMMENT ON COLUMN sys_user_role.granted_by IS '授權者';

-- 4. 功能清單
CREATE TABLE IF NOT EXISTS sys_menu (
    menu_id VARCHAR(50) PRIMARY KEY,
    menu_name VARCHAR(50) NOT NULL,
    parent_menu_id VARCHAR(50),
    menu_path VARCHAR(100),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_parent FOREIGN KEY (parent_menu_id) REFERENCES sys_menu(menu_id)
);

COMMENT ON TABLE sys_menu IS '功能清單';
COMMENT ON COLUMN sys_menu.menu_id IS '功能清單代碼';
COMMENT ON COLUMN sys_menu.menu_name IS '功能清單名稱';
COMMENT ON COLUMN sys_menu.parent_menu_id IS '上層功能清單';
COMMENT ON COLUMN sys_menu.menu_path IS '前端路由路徑';
COMMENT ON COLUMN sys_menu.icon IS '圖示';
COMMENT ON COLUMN sys_menu.sort_order IS '排序順序';

-- 5. 功能
CREATE TABLE IF NOT EXISTS sys_function (
    function_id VARCHAR(30) PRIMARY KEY,
    function_name VARCHAR(50) NOT NULL,
    menu_id VARCHAR(50),
    function_type VARCHAR(10),
    api_path VARCHAR(100),
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_function_menu FOREIGN KEY (menu_id) REFERENCES sys_menu(menu_id)
);

COMMENT ON TABLE sys_function IS '功能定義';
COMMENT ON COLUMN sys_function.function_id IS '功能代碼';
COMMENT ON COLUMN sys_function.function_name IS '功能名稱';
COMMENT ON COLUMN sys_function.menu_id IS '所屬功能清單';
COMMENT ON COLUMN sys_function.function_type IS '類型（view/add/edit/delete/export/import）';
COMMENT ON COLUMN sys_function.api_path IS '對應 API 路徑';

-- 6. 角色功能對應
CREATE TABLE IF NOT EXISTS sys_role_function (
    role_id VARCHAR(20) NOT NULL,
    function_id VARCHAR(30) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(20),
    PRIMARY KEY (role_id, function_id),
    CONSTRAINT fk_role_func_role FOREIGN KEY (role_id) REFERENCES sys_role(role_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_func_func FOREIGN KEY (function_id) REFERENCES sys_function(function_id) ON DELETE CASCADE
);

COMMENT ON TABLE sys_role_function IS '角色功能對應';

-- 7. 密碼規範
CREATE TABLE IF NOT EXISTS sys_password_policy (
    policy_id SERIAL PRIMARY KEY,
    policy_name VARCHAR(50) NOT NULL,
    min_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_number BOOLEAN DEFAULT true,
    require_special BOOLEAN DEFAULT false,
    max_login_attempts INTEGER DEFAULT 5,
    lockout_duration_min INTEGER DEFAULT 30,
    password_expire_days INTEGER DEFAULT 90,
    password_history_count INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sys_password_policy IS '密碼規範';
COMMENT ON COLUMN sys_password_policy.min_length IS '最小密碼長度';
COMMENT ON COLUMN sys_password_policy.require_uppercase IS '需要大寫字母';
COMMENT ON COLUMN sys_password_policy.require_lowercase IS '需要小寫字母';
COMMENT ON COLUMN sys_password_policy.require_number IS '需要數字';
COMMENT ON COLUMN sys_password_policy.require_special IS '需要特殊符號';
COMMENT ON COLUMN sys_password_policy.max_login_attempts IS '最大登入失敗次數';
COMMENT ON COLUMN sys_password_policy.lockout_duration_min IS '鎖定時間（分鐘）';
COMMENT ON COLUMN sys_password_policy.password_expire_days IS '密碼有效天數';
COMMENT ON COLUMN sys_password_policy.password_history_count IS '不可與前幾代密碼重複';

-- 8. 密碼歷史
CREATE TABLE IF NOT EXISTS sys_password_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pwd_history_user FOREIGN KEY (user_id) REFERENCES sys_user(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE sys_password_history IS '密碼歷史';

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_sys_user_active ON sys_user(is_active);
CREATE INDEX IF NOT EXISTS idx_sys_user_role_user ON sys_user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_sys_user_role_role ON sys_user_role(role_id);
CREATE INDEX IF NOT EXISTS idx_sys_function_menu ON sys_function(menu_id);
CREATE INDEX IF NOT EXISTS idx_sys_role_function_role ON sys_role_function(role_id);
CREATE INDEX IF NOT EXISTS idx_sys_password_history_user ON sys_password_history(user_id);

-- ============================================
-- 新增預設資料
-- ============================================

-- 預設角色
INSERT INTO sys_role (role_id, role_name, description) VALUES
    ('ADMIN', '系統管理員', '擁有所有系統權限'),
    ('USER', '一般使用者', '基本使用權限')
ON CONFLICT (role_id) DO NOTHING;

-- 預設密碼規範
INSERT INTO sys_password_policy (policy_name, min_length, require_uppercase, require_lowercase, require_number, require_special, max_login_attempts, lockout_duration_min, password_expire_days, password_history_count) VALUES
    ('預設規範', 8, true, true, true, false, 5, 30, 90, 3)
ON CONFLICT DO NOTHING;

-- 預設功能清單
INSERT INTO sys_menu (menu_id, menu_name, parent_menu_id, menu_path, icon, sort_order) VALUES
    ('MEMBER', '人員管理', NULL, '/member', '👥', 1),
    ('ATTENDANCE', '請假維護', NULL, '/attendance', '📅', 2),
    ('CODETABLE', '代碼維護', NULL, '/code-table', '📋', 3),
    ('PROJECT', '專案管理', NULL, '/projects', '📊', 4),
    ('SYSTEM', '系統管理', NULL, NULL, '⚙️', 99),
    ('SYS_USER', '使用者管理', 'SYSTEM', '/system/users', '👤', 1),
    ('SYS_ROLE', '角色管理', 'SYSTEM', '/system/roles', '🎭', 2),
    ('SYS_MENU', '功能清單', 'SYSTEM', '/system/menus', '📑', 3),
    ('SYS_PWD_POLICY', '密碼規範', 'SYSTEM', '/system/password-policy', '🔐', 4)
ON CONFLICT (menu_id) DO NOTHING;

-- 預設功能
INSERT INTO sys_function (function_id, function_name, menu_id, function_type, api_path) VALUES
    -- 人員管理
    ('MEMBER_VIEW', '查看人員', 'MEMBER', 'view', '/api/member'),
    ('MEMBER_ADD', '新增人員', 'MEMBER', 'add', '/api/member'),
    ('MEMBER_EDIT', '編輯人員', 'MEMBER', 'edit', '/api/member'),
    ('MEMBER_DELETE', '刪除人員', 'MEMBER', 'delete', '/api/member'),
    -- 請假維護
    ('ATTENDANCE_VIEW', '查看請假', 'ATTENDANCE', 'view', '/api/attendance'),
    ('ATTENDANCE_ADD', '新增請假', 'ATTENDANCE', 'add', '/api/attendance'),
    ('ATTENDANCE_EDIT', '編輯請假', 'ATTENDANCE', 'edit', '/api/attendance'),
    ('ATTENDANCE_DELETE', '刪除請假', 'ATTENDANCE', 'delete', '/api/attendance'),
    -- 專案管理
    ('PROJECT_VIEW', '查看專案', 'PROJECT', 'view', '/api/projects'),
    ('PROJECT_ADD', '新增專案', 'PROJECT', 'add', '/api/projects'),
    ('PROJECT_EDIT', '編輯專案', 'PROJECT', 'edit', '/api/projects'),
    ('PROJECT_DELETE', '刪除專案', 'PROJECT', 'delete', '/api/projects'),
    ('PROJECT_IMPORT', '匯入專案', 'PROJECT', 'import', '/api/projects/import'),
    -- 系統管理
    ('SYS_USER_VIEW', '查看使用者', 'SYS_USER', 'view', '/api/system/users'),
    ('SYS_USER_ADD', '新增使用者', 'SYS_USER', 'add', '/api/system/users'),
    ('SYS_USER_EDIT', '編輯使用者', 'SYS_USER', 'edit', '/api/system/users'),
    ('SYS_USER_DELETE', '刪除使用者', 'SYS_USER', 'delete', '/api/system/users'),
    ('SYS_ROLE_VIEW', '查看角色', 'SYS_ROLE', 'view', '/api/system/roles'),
    ('SYS_ROLE_EDIT', '編輯角色', 'SYS_ROLE', 'edit', '/api/system/roles')
ON CONFLICT (function_id) DO NOTHING;

-- 將所有功能授權給 ADMIN 角色
INSERT INTO sys_role_function (role_id, function_id)
SELECT 'ADMIN', function_id FROM sys_function
ON CONFLICT (role_id, function_id) DO NOTHING;

-- 將查看功能授權給 USER 角色
INSERT INTO sys_role_function (role_id, function_id)
SELECT 'USER', function_id FROM sys_function WHERE function_type = 'view'
ON CONFLICT (role_id, function_id) DO NOTHING;
