-- ============================================
-- 恢復被刪除的系統頁面
-- 日期：2026-01-18
-- ============================================

-- 恢復預設功能清單（頁面）
INSERT INTO sys_menu (menu_id, menu_name, parent_menu_id, menu_path, icon, sort_order, is_active) VALUES
    ('MEMBER', '人員管理', NULL, '/member', '👥', 1, true),
    ('ATTENDANCE', '請假維護', NULL, '/attendance', '📅', 2, true),
    ('CODETABLE', '代碼維護', NULL, '/code-table', '📋', 3, true),
    ('PROJECT', '專案管理', NULL, '/projects', '📊', 4, true),
    ('SYSTEM', '系統管理', NULL, NULL, '⚙️', 99, true),
    ('SYS_USER', '使用者管理', 'SYSTEM', '/system/users', '👤', 1, true),
    ('SYS_ROLE', '角色管理', 'SYSTEM', '/system/roles', '🎭', 2, true),
    ('SYS_MENU', '功能清單', 'SYSTEM', '/system/menus', '📑', 3, true),
    ('SYS_PWD_POLICY', '密碼規範', 'SYSTEM', '/system/password-policy', '🔐', 4, true)
ON CONFLICT (menu_id) DO UPDATE SET
    menu_name = EXCLUDED.menu_name,
    menu_path = EXCLUDED.menu_path,
    icon = EXCLUDED.icon,
    is_active = true;

-- 恢復預設功能
INSERT INTO sys_function (function_id, function_name, menu_id, function_type, api_path, is_active) VALUES
    -- 人員管理
    ('MEMBER_VIEW', '查看人員', 'MEMBER', 'view', '/api/member', true),
    ('MEMBER_ADD', '新增人員', 'MEMBER', 'add', '/api/member', true),
    ('MEMBER_EDIT', '編輯人員', 'MEMBER', 'edit', '/api/member', true),
    ('MEMBER_DELETE', '刪除人員', 'MEMBER', 'delete', '/api/member', true),
    -- 請假維護
    ('ATTENDANCE_VIEW', '查看請假', 'ATTENDANCE', 'view', '/api/attendance', true),
    ('ATTENDANCE_ADD', '新增請假', 'ATTENDANCE', 'add', '/api/attendance', true),
    ('ATTENDANCE_EDIT', '編輯請假', 'ATTENDANCE', 'edit', '/api/attendance', true),
    ('ATTENDANCE_DELETE', '刪除請假', 'ATTENDANCE', 'delete', '/api/attendance', true),
    -- 專案管理
    ('PROJECT_VIEW', '查看專案', 'PROJECT', 'view', '/api/projects', true),
    ('PROJECT_ADD', '新增專案', 'PROJECT', 'add', '/api/projects', true),
    ('PROJECT_EDIT', '編輯專案', 'PROJECT', 'edit', '/api/projects', true),
    ('PROJECT_DELETE', '刪除專案', 'PROJECT', 'delete', '/api/projects', true),
    ('PROJECT_IMPORT', '匯入專案', 'PROJECT', 'import', '/api/projects/import', true),
    -- 系統管理
    ('SYS_USER_VIEW', '查看使用者', 'SYS_USER', 'view', '/api/system/users', true),
    ('SYS_USER_ADD', '新增使用者', 'SYS_USER', 'add', '/api/system/users', true),
    ('SYS_USER_EDIT', '編輯使用者', 'SYS_USER', 'edit', '/api/system/users', true),
    ('SYS_USER_DELETE', '刪除使用者', 'SYS_USER', 'delete', '/api/system/users', true),
    ('SYS_ROLE_VIEW', '查看角色', 'SYS_ROLE', 'view', '/api/system/roles', true),
    ('SYS_ROLE_EDIT', '編輯角色', 'SYS_ROLE', 'edit', '/api/system/roles', true)
ON CONFLICT (function_id) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    is_active = true;

-- 將所有功能授權給 ADMIN 角色
INSERT INTO sys_role_function (role_id, function_id)
SELECT 'ADMIN', function_id FROM sys_function
ON CONFLICT (role_id, function_id) DO NOTHING;

SELECT 'Data restored successfully' as status;
