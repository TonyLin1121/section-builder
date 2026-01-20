# Section Builder - 部門人員管理系統

一個現代化的部門人員管理系統，提供完整的員工資料管理、請假維護、專案管理、年假管理和系統管理功能。

## 🚀 功能特色

### 核心功能

- 👥 **員工管理** - 完整的員工資料 CRUD 操作
  - 新增、編輯、刪除員工資料
  - 多維度搜尋與篩選（姓名、部門、員工類型、在職狀態）
  - 分頁與排序功能
  - 員工統計報表

- 📅 **請假維護** - 請假記錄管理與追蹤
  - 請假記錄 CRUD 操作
  - 日期範圍篩選
  - 員工姓名下拉選擇

- 🏖️ **年假管理** - 年度假期額度維護
  - 年假記錄 CRUD 操作
  - 年度篩選
  - 假別管理

- 📋 **專案管理** - 專案資訊維護
  - 專案 CRUD 操作
  - 專案狀態追蹤
  - Excel 批次匯入（支援全部刪除、僅新增、更新或新增三種模式）
  - 專案統計報表（依狀態、客戶、部門分組）

- ⚙️ **參數檔維護** - 系統參數配置管理
  - 代碼表 CRUD 操作
  - 假別等系統參數維護

### 系統管理（需 ADMIN 權限）

- 👤 **使用者管理** - 系統使用者帳號維護
- 🔐 **角色管理** - 角色與權限設定
- 📁 **選單管理** - 動態選單配置
- 🔒 **密碼政策** - 密碼強度與過期設定

### 資料匯出

- 📥 **多格式匯出** - 支援 PDF、CSV、Excel 格式匯出
- 👁️ **PDF 預覽** - 匯出前可預覽 PDF 內容
- 📊 **Excel 匯入** - 支援批次資料匯入

### 安全性

- 🔐 **JWT 認證** - 安全的使用者身分驗證
- 🛡️ **CSRF 保護** - 跨站請求偽造防護
- 🔑 **角色權限控制** - 基於角色的存取控制

### 使用者體驗

- 📱 **響應式設計** - 支援桌面與行動裝置
- 🌙 **深色模式** - 支援深淺色主題切換
- 🔄 **即時更新** - 無需重新整理頁面

---

## 🛠️ 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + TypeScript + Vite |
| 路由 | React Router 7 |
| 圖表 | Recharts |
| 後端 | Python FastAPI |
| 認證 | JWT (python-jose) |
| 安全 | CSRF Token (itsdangerous) |
| 資料庫 | PostgreSQL |
| 部署 | Docker + Nginx |

### 前端依賴

```json
{
  "react": "^19.2.0",
  "react-router-dom": "^7.11.0",
  "recharts": "^3.6.0",
  "jspdf": "^4.0.0",
  "html2canvas": "^1.4.1",
  "xlsx": "^0.18.5"
}
```

### 後端依賴

```text
fastapi==0.115.0
uvicorn[standard]==0.30.0
psycopg2-binary==2.9.9
python-dotenv==1.0.1
itsdangerous==2.1.2
pydantic==2.6.0
openpyxl==3.1.2
python-multipart==0.0.9
python-jose[cryptography]==3.3.0
```

---

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

---

## 📋 專案結構

```
section-builder/
├── src/                        # 前端原始碼
│   ├── components/             # React 組件
│   │   ├── ChangePasswordModal.tsx  # 變更密碼模態框
│   │   ├── EmployeeForm.tsx    # 員工表單
│   │   ├── EmployeeSelect.tsx  # 員工下拉選擇
│   │   ├── EmployeeTable.tsx   # 員工列表
│   │   ├── ExportDropdown.tsx  # 匯出下拉選單
│   │   ├── ImportDialog.tsx    # 匯入對話框
│   │   ├── Layout.tsx          # 頁面佈局（側邊選單）
│   │   ├── Pagination.tsx      # 分頁組件
│   │   ├── PdfPreview.tsx      # PDF 預覽
│   │   ├── ProtectedRoute.tsx  # 路由保護
│   │   ├── SearchBar.tsx       # 搜尋與篩選
│   │   ├── SortableHeader.tsx  # 可排序表頭
│   │   ├── ThemeProvider.tsx   # 主題提供者
│   │   └── ThemeToggle.tsx     # 主題切換按鈕
│   ├── contexts/               # React Context
│   │   └── ThemeContext.tsx    # 主題上下文
│   ├── hooks/                  # 自訂 Hooks
│   │   ├── useAnnualLeave.ts   # 年假管理
│   │   ├── useAttendance.ts    # 請假維護
│   │   ├── useCodeTable.ts     # 參數檔
│   │   ├── useEmployees.ts     # 員工管理
│   │   ├── useExport.ts        # 資料匯出
│   │   ├── useMenus.ts         # 選單管理
│   │   ├── usePdf.ts           # PDF 生成
│   │   ├── useProject.ts       # 專案管理
│   │   ├── useSystemRoles.ts   # 角色管理
│   │   ├── useSystemUsers.ts   # 使用者管理
│   │   └── useTheme.ts         # 主題管理
│   ├── pages/                  # 頁面組件
│   │   ├── AnnualLeavePage.tsx # 年假管理頁
│   │   ├── AttendancePage.tsx  # 請假維護頁
│   │   ├── CodeTablePage.tsx   # 參數檔頁
│   │   ├── EmployeeStatsPage.tsx  # 員工統計頁
│   │   ├── LoginPage.tsx       # 登入頁
│   │   ├── MenuMaintenancePage.tsx # 選單維護頁
│   │   ├── ProjectPage.tsx     # 專案管理頁
│   │   ├── ProjectStatsPage.tsx # 專案統計頁
│   │   └── SystemPage.tsx      # 系統管理頁
│   ├── services/               # API 服務
│   │   ├── api.ts              # 員工 API
│   │   ├── annualLeaveApi.ts   # 年假 API
│   │   ├── attendanceApi.ts    # 請假 API
│   │   ├── authApi.ts          # 認證 API
│   │   ├── codeTableApi.ts     # 參數檔 API
│   │   ├── httpClient.ts       # HTTP 客戶端（CSRF 處理）
│   │   ├── projectApi.ts       # 專案 API
│   │   └── systemApi.ts        # 系統管理 API
│   ├── types/                  # TypeScript 型別定義
│   │   ├── attendance.ts       # 請假型別
│   │   ├── codeTable.ts        # 參數檔型別
│   │   └── employee.ts         # 員工型別
│   ├── App.tsx                 # 主應用（員工管理）
│   ├── main.tsx                # 應用入口
│   └── router.tsx              # 路由配置
├── server/                     # 後端原始碼
│   ├── routes/                 # API 路由模組
│   │   ├── auth_routes.py      # 認證路由
│   │   └── system_routes.py    # 系統管理路由
│   ├── sql/                    # SQL 腳本
│   ├── auth.py                 # 認證處理
│   ├── csrf.py                 # CSRF 中間件
│   ├── database.py             # 資料庫連線
│   ├── main.py                 # FastAPI 主程式
│   ├── models.py               # Pydantic 模型
│   ├── requirements.txt        # Python 依賴
│   └── Dockerfile              # 後端 Docker 配置
├── docs/                       # 文件
│   └── DEPLOYMENT.md           # 部署指南
├── Dockerfile                  # 前端 Docker 配置
├── docker-compose.yml          # Docker 服務編排
├── nginx.conf                  # Nginx 配置
└── init_admin.sh               # 初始化管理員腳本
```

---

## 🔗 相關連結

| 環境 | 網址 |
|------|------|
| 前端（生產） | http://localhost |
| 前端（開發） | http://localhost:5173 |
| API 文檔 | http://localhost/docs |
| API（開發） | http://localhost:8000/docs |

---

## 📡 API 端點概覽

### 認證 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 使用者登入 |
| POST | `/api/auth/logout` | 使用者登出 |
| POST | `/api/auth/change-password` | 變更密碼 |
| GET | `/api/csrf-token` | 取得 CSRF Token |

### 員工 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/members` | 取得員工清單（分頁、篩選、排序） |
| GET | `/members/stats` | 取得員工統計 |
| GET | `/members/{emp_id}` | 取得單一員工 |
| POST | `/members` | 新增員工 |
| PUT | `/members/{emp_id}` | 更新員工 |
| DELETE | `/members/{emp_id}` | 刪除員工 |
| GET | `/divisions` | 取得部門清單 |

### 請假維護 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/attendance` | 取得請假記錄 |
| GET | `/attendance/{emp_id}/{leave_date}/{leave_type}` | 取得單一記錄 |
| POST | `/attendance` | 新增請假記錄 |
| PUT | `/attendance/{emp_id}/{leave_date}/{leave_type}` | 更新請假記錄 |
| DELETE | `/attendance/{emp_id}/{leave_date}/{leave_type}` | 刪除請假記錄 |

### 年假管理 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/annual-leave` | 取得年假記錄 |
| GET | `/annual-leave/{emp_id}/{year}/{leave_type}` | 取得單一記錄 |
| POST | `/annual-leave` | 新增年假記錄 |
| PUT | `/annual-leave/{emp_id}/{year}/{leave_type}` | 更新年假記錄 |
| DELETE | `/annual-leave/{emp_id}/{year}/{leave_type}` | 刪除年假記錄 |

### 專案管理 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/projects` | 取得專案清單 |
| GET | `/projects/stats` | 取得專案統計 |
| GET | `/projects/filter-options` | 取得篩選選項 |
| GET | `/projects/{project_id}` | 取得單一專案 |
| POST | `/projects` | 新增專案 |
| PUT | `/projects/{project_id}` | 更新專案 |
| DELETE | `/projects/{project_id}` | 刪除專案 |
| POST | `/projects/import` | 批次匯入專案 |

### 參數檔 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/codetable` | 取得參數清單 |
| GET | `/codetable/leave-types` | 取得假別清單 |
| GET | `/codetable/{code_code}/{code_subcode}` | 取得單一參數 |
| POST | `/codetable` | 新增參數 |
| PUT | `/codetable/{code_code}/{code_subcode}` | 更新參數 |
| DELETE | `/codetable/{code_code}/{code_subcode}` | 刪除參數 |

### 系統管理 API（需 ADMIN 權限）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/system/users` | 取得使用者清單 |
| POST | `/api/system/users` | 新增使用者 |
| PUT | `/api/system/users/{id}` | 更新使用者 |
| DELETE | `/api/system/users/{id}` | 刪除使用者 |
| GET | `/api/system/roles` | 取得角色清單 |
| POST | `/api/system/roles` | 新增角色 |
| PUT | `/api/system/roles/{id}` | 更新角色 |
| DELETE | `/api/system/roles/{id}` | 刪除角色 |
| GET | `/api/system/menus` | 取得選單清單 |
| POST | `/api/system/menus` | 新增選單 |
| PUT | `/api/system/menus/{id}` | 更新選單 |
| DELETE | `/api/system/menus/{id}` | 刪除選單 |
| GET | `/api/system/password-policy` | 取得密碼政策 |
| PUT | `/api/system/password-policy` | 更新密碼政策 |

---

## 📄 授權

© 2026 Section Builder
