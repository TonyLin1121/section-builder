# Section Builder - 部門人員管理系統

一個現代化的部門人員管理系統，提供員工資料管理、請假維護和參數檔維護功能。

## 🚀 功能特色

- 👥 **員工管理** - 完整的員工資料 CRUD 操作
- 📅 **請假維護** - 請假記錄管理與追蹤
- ⚙️ **參數檔維護** - 系統參數配置管理
- 📥 **資料匯出** - 支援 PDF、CSV、Excel 格式匯出
- 📱 **響應式設計** - 支援桌面與行動裝置

## 🛠️ 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + TypeScript + Vite |
| 後端 | Python FastAPI |
| 資料庫 | PostgreSQL |
| 部署 | Docker + Nginx |

## 📦 快速開始

### 開發環境

```bash
# 安裝前端依賴
npm install

# 啟動前端開發伺服器
npm run dev

# 啟動後端服務
cd server
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Docker 部署

```bash
# 複製環境設定
cp .env.example .env

# 編輯 .env 設定資料庫連線
nano .env

# 建置並啟動
docker compose up -d --build
```

詳細部署說明請參閱 **[部署指南](docs/DEPLOYMENT.md)**

## 📋 專案結構

```
section-builder/
├── src/                    # 前端原始碼
│   ├── components/         # React 組件
│   ├── hooks/              # 自訂 Hooks
│   ├── pages/              # 頁面組件
│   ├── services/           # API 服務
│   └── types/              # TypeScript 型別定義
├── server/                 # 後端原始碼
│   ├── main.py             # FastAPI 主程式
│   ├── database.py         # 資料庫連線
│   ├── models.py           # Pydantic 模型
│   └── requirements.txt    # Python 依賴
├── docs/                   # 文件
│   └── DEPLOYMENT.md       # 部署指南
├── Dockerfile              # 前端 Docker 配置
├── docker-compose.yml      # Docker 服務編排
└── nginx.conf              # Nginx 配置
```

## 🔗 相關連結

- 前端：http://localhost (生產) / http://localhost:5173 (開發)
- API 文檔：http://localhost/docs

## 📄 授權

© 2026 Section Builder
