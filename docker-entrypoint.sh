#!/bin/sh
# Nginx entrypoint 腳本
# NOTE: 在啟動 Nginx 前替換環境變數

# 設定預設值
BACKEND_HOST=${BACKEND_HOST:-backend}
BACKEND_PORT=${BACKEND_PORT:-8000}

echo "配置後端位址: ${BACKEND_HOST}:${BACKEND_PORT}"

# 替換 Nginx 配置中的變數
sed -i "s|backend:8000|${BACKEND_HOST}:${BACKEND_PORT}|g" /etc/nginx/conf.d/default.conf

# 啟動 Nginx
exec nginx -g 'daemon off;'
