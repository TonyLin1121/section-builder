#!/bin/sh
# Nginx entrypoint 腳本
# NOTE: 在啟動 Nginx 前替換環境變數

# 設定預設值
BACKEND_HOST=${BACKEND_HOST:-backend}
BACKEND_PORT=${BACKEND_PORT:-8000}

# 移除可能的 tcp:// 前綴和端口
BACKEND_HOST=$(echo "$BACKEND_HOST" | sed 's|tcp://||g' | sed 's|:.*||g')

echo "========================================"
echo "Section Builder Frontend 啟動中..."
echo "後端位址: ${BACKEND_HOST}:${BACKEND_PORT}"
echo "========================================"

# 替換 Nginx 配置中的變數
sed -i "s|backend:8000|${BACKEND_HOST}:${BACKEND_PORT}|g" /etc/nginx/conf.d/default.conf

# 顯示替換後的 upstream 設定
echo "Nginx upstream 設定:"
grep -o "proxy_pass.*;" /etc/nginx/conf.d/default.conf | head -1

# 啟動 Nginx
exec nginx -g 'daemon off;'
