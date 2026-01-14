# Section Builder 部署指南

本文件說明如何使用 Docker 部署 Section Builder 應用程式。

## 目錄

- [前置需求](#前置需求)
- [快速開始](#快速開始)
- [環境配置](#環境配置)
- [部署步驟](#部署步驟)
- [服務管理](#服務管理)
- [常見問題](#常見問題)

---

## 前置需求

確保您的系統已安裝以下軟體：

| 軟體 | 最低版本 | 檢查指令 |
|------|----------|----------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | 2.0+ | `docker compose version` |

> [!IMPORTANT]
> 確保 Docker 服務正在運行：`docker info`

---

## 快速開始

### 1. 複製環境變數檔案

```bash
cp .env.example .env
```

### 2. 編輯環境變數

```bash
# 使用您喜好的編輯器
nano .env
# 或
code .env
```

### 3. 建置並啟動服務

```bash
docker compose up -d --build
```

### 4. 驗證服務狀態

```bash
docker compose ps
```

### 5. 開啟應用程式

前端：http://localhost
API 文檔：http://localhost/docs

---

## 環境配置

### 環境變數說明

編輯 `.env` 檔案設定以下參數：

```bash
# ---------- 服務埠號 ----------
FRONTEND_PORT=80        # 前端服務埠號
BACKEND_PORT=8000       # 後端 API 埠號

# ---------- 資料庫連線設定 ----------
DB_HOST=your-db-host    # PostgreSQL 主機位址
DB_PORT=5432            # PostgreSQL 埠號
DB_NAME=your-db-name    # 資料庫名稱
DB_USER=your-db-user    # 資料庫使用者
DB_PASSWORD=your-pwd    # 資料庫密碼
```

> [!WARNING]
> 請勿將 `.env` 檔案提交到版本控制系統中！

---

## 部署步驟

### 步驟一：準備環境

```bash
# 克隆專案
git clone <repository-url>
cd section-builder

# 複製環境設定檔
cp .env.example .env
```

### 步驟二：設定資料庫連線

編輯 `.env` 檔案，填入正確的 PostgreSQL 連線資訊：

```bash
DB_HOST=192.168.1.100   # 您的資料庫伺服器 IP
DB_PORT=5432
DB_NAME=section_builder
DB_USER=app_user
DB_PASSWORD=secure_password
```

### 步驟三：建置 Docker 映像檔

```bash
# 建置所有服務映像檔
docker compose build

# 或強制重新建置（不使用快取）
docker compose build --no-cache
```

### 步驟四：啟動服務

```bash
# 前景模式（可看到即時日誌）
docker compose up

# 背景模式
docker compose up -d
```

### 步驟五：驗證部署

```bash
# 檢查服務狀態
docker compose ps

# 檢查服務日誌
docker compose logs

# 健康檢查
curl http://localhost/health
curl http://localhost:8000/health
```

---

## 服務管理

### 常用指令

| 操作 | 指令 |
|------|------|
| 啟動服務 | `docker compose up -d` |
| 停止服務 | `docker compose down` |
| 重啟服務 | `docker compose restart` |
| 查看狀態 | `docker compose ps` |
| 查看日誌 | `docker compose logs -f` |
| 查看特定服務日誌 | `docker compose logs -f frontend` |
| 進入容器 | `docker compose exec backend bash` |
| 重建並啟動 | `docker compose up -d --build` |

### 更新部署

當有新版本時，執行以下步驟：

```bash
# 1. 拉取最新程式碼
git pull origin main

# 2. 重新建置並啟動
docker compose up -d --build

# 3. 清理舊的映像檔（可選）
docker image prune -f
```

### 資源清理

```bash
# 停止並移除容器、網路
docker compose down

# 同時移除資料卷（謹慎使用）
docker compose down -v

# 清理所有未使用的資源
docker system prune -f
```

---

## 常見問題

### Q1：容器無法啟動

**檢查步驟：**
```bash
# 查看詳細日誌
docker compose logs backend
docker compose logs frontend
```

**常見原因：**
- 資料庫連線失敗：檢查 `.env` 中的資料庫設定
- 埠號衝突：確認 80 和 8000 埠未被佔用

### Q2：無法連線到資料庫

**檢查步驟：**
```bash
# 進入後端容器測試連線
docker compose exec backend python -c "from database import get_connection; conn = get_connection(); print('連線成功'); conn.close()"
```

**解決方案：**
1. 確認資料庫服務正在運行
2. 確認防火牆允許連線
3. 確認資料庫使用者權限正確

### Q3：前端頁面空白

**檢查步驟：**
```bash
# 檢查 Nginx 日誌
docker compose logs frontend
```

**解決方案：**
1. 清除瀏覽器快取
2. 確認建置過程沒有錯誤
3. 檢查 Nginx 配置

### Q4：API 請求失敗 (CORS)

**解決方案：**
在 `.env` 中加入自訂 CORS 來源：
```bash
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

---

## 生產環境建議

### 安全性

- [ ] 使用 HTTPS（建議使用反向代理如 Traefik 或 Caddy）
- [ ] 定期更新基礎映像檔
- [ ] 使用 Docker secrets 管理敏感資訊
- [ ] 限制容器資源使用量

### 效能

- [ ] 啟用 Nginx gzip 壓縮（已預設啟用）
- [ ] 考慮使用 Redis 快取
- [ ] 監控容器資源使用狀況

### 備份

- [ ] 定期備份 PostgreSQL 資料庫
- [ ] 備份 `.env` 設定檔（安全存放）

---

## 架構圖

```
                    ┌─────────────────────────────────────────────┐
                    │              Docker Host                     │
                    │                                              │
  User Request ────▶│  ┌──────────────┐    ┌──────────────────┐  │
                    │  │   Frontend   │    │     Backend      │  │
                    │  │    (Nginx)   │───▶│    (FastAPI)     │  │
                    │  │    :80       │    │     :8000        │  │
                    │  └──────────────┘    └────────┬─────────┘  │
                    │                               │             │
                    └───────────────────────────────┼─────────────┘
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │   PostgreSQL     │
                                           │   (External)     │
                                           └──────────────────┘
```

---

## 聯絡與支援

如有問題，請透過以下方式尋求協助：
- 開啟 GitHub Issue
- 查閱專案 Wiki
