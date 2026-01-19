-- ============================================
-- 遷移腳本：擴展 menu_id 欄位長度
-- 日期：2026-01-18
-- ============================================

-- 1. 修改 sys_menu 表的 menu_id 欄位
ALTER TABLE sys_menu ALTER COLUMN menu_id TYPE VARCHAR(50);
ALTER TABLE sys_menu ALTER COLUMN parent_menu_id TYPE VARCHAR(50);

-- 2. 修改 sys_function 表的 menu_id 欄位
ALTER TABLE sys_function ALTER COLUMN menu_id TYPE VARCHAR(50);

-- 3. 修改 sys_role_function 表的 menu_id 欄位（如果存在）
-- ALTER TABLE sys_role_function ALTER COLUMN menu_id TYPE VARCHAR(50);

SELECT 'Migration completed: menu_id columns expanded to VARCHAR(50)' as status;
