-- ============================================
-- 清理重複的選單資料
-- 日期：2026-01-19
-- NOTE: 每個 menu_path 只應保留一筆記錄
-- ============================================

-- 1. 檢查重複的 menu_path
SELECT menu_path, COUNT(*) as cnt, array_agg(menu_id) as menu_ids
FROM sys_menu 
WHERE menu_path IS NOT NULL
GROUP BY menu_path
HAVING COUNT(*) > 1;

-- 2. 刪除重複的記錄（保留 parent_menu_id 不為 null 的，或保留第一筆）
-- 先解除 sys_function 的關聯
UPDATE sys_function SET menu_id = NULL 
WHERE menu_id IN (
    SELECT menu_id FROM (
        SELECT menu_id, menu_path,
               ROW_NUMBER() OVER (PARTITION BY menu_path ORDER BY 
                   CASE WHEN parent_menu_id IS NOT NULL THEN 0 ELSE 1 END,
                   menu_id
               ) as rn
        FROM sys_menu
        WHERE menu_path IS NOT NULL
    ) sub
    WHERE rn > 1
);

-- 刪除重複記錄
DELETE FROM sys_menu 
WHERE menu_id IN (
    SELECT menu_id FROM (
        SELECT menu_id, menu_path,
               ROW_NUMBER() OVER (PARTITION BY menu_path ORDER BY 
                   CASE WHEN parent_menu_id IS NOT NULL THEN 0 ELSE 1 END,
                   menu_id
               ) as rn
        FROM sys_menu
        WHERE menu_path IS NOT NULL
    ) sub
    WHERE rn > 1
);

-- 3. 驗證結果
SELECT menu_id, menu_name, parent_menu_id, menu_path, sort_order, is_active
FROM sys_menu
ORDER BY sort_order, menu_id;

SELECT 'Cleanup completed' as status;
