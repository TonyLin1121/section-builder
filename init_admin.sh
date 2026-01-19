#!/bin/bash
# ============================================
# 建立初始 ADMIN 帳號腳本
# 使用方式: ./init_admin.sh
# ============================================

echo "=== 建立初始 ADMIN 帳號 ==="

# 設定變數
DB_CONTAINER="section-builder-db-1"
BACKEND_CONTAINER="section-builder-backend-1"
PASSWORD="Admin123"  # 預設密碼，請登入後立即變更

# 1. 獲取第一個可用的員工編號
echo "正在查詢可用的員工..."
EMP_ID=$(docker exec -i $DB_CONTAINER psql -U postgres -d testDB -t -c "
    SELECT emp_id FROM member 
    WHERE emp_id NOT IN (SELECT user_id FROM sys_user)
    ORDER BY emp_id
    LIMIT 1;
" | tr -d ' ')

if [ -z "$EMP_ID" ]; then
    echo "錯誤：沒有可用的員工可建立帳號"
    echo "請先確保 member 表中有員工資料"
    exit 1
fi

echo "找到員工: $EMP_ID"

# 2. 生成密碼雜湊
echo "正在生成密碼雜湊..."
PASSWORD_HASH=$(docker exec -i $BACKEND_CONTAINER python -c "
import hashlib
import os
PASSWORD_SALT = os.getenv('PASSWORD_SALT', 'section-builder-salt-2026')
password = '$PASSWORD'
salted = f'{PASSWORD_SALT}{password}{PASSWORD_SALT}'
print(hashlib.sha512(salted.encode('utf-8')).hexdigest())
")

if [ -z "$PASSWORD_HASH" ]; then
    echo "錯誤：無法生成密碼雜湊"
    exit 1
fi

# 3. 建立使用者帳號
echo "正在建立使用者帳號..."
docker exec -i $DB_CONTAINER psql -U postgres -d testDB << EOF
-- 建立使用者
INSERT INTO sys_user (user_id, password_hash, is_active)
VALUES ('$EMP_ID', '$PASSWORD_HASH', true)
ON CONFLICT (user_id) DO UPDATE SET password_hash = '$PASSWORD_HASH';

-- 指派 ADMIN 角色
INSERT INTO sys_user_role (user_id, role_id)
VALUES ('$EMP_ID', 'ADMIN')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 確認結果
SELECT u.user_id, m.chinese_name, ur.role_id
FROM sys_user u
LEFT JOIN member m ON u.user_id = m.emp_id
LEFT JOIN sys_user_role ur ON u.user_id = ur.user_id
WHERE u.user_id = '$EMP_ID';
EOF

echo ""
echo "=== ADMIN 帳號建立完成 ==="
echo "帳號: $EMP_ID"
echo "密碼: $PASSWORD"
echo ""
echo "請登入後立即變更密碼！"
