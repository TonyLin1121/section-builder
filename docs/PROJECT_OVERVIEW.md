# Section Builder 專案說明文件

> 部門人員管理系統 — 整合員工資料、請假、年假、專案、行事曆、AI 助手與系統管理的全功能後台。

本文件提供專案的整體架構、模組關係與開發指引，供開發者快速理解整個系統。

---

## 目錄

- [一、專案定位](#一專案定位)
- [二、技術堆疊](#二技術堆疊)
- [三、系統架構](#三系統架構)
- [四、功能模組](#四功能模組)
- [五、目錄結構](#五目錄結構)
- [六、開發慣例](#六開發慣例)
- [七、認證與安全](#七認證與安全)
- [八、資料庫](#八資料庫)
- [九、開發 / 部署流程](#九開發--部署流程)
- [十、相關文件索引](#十相關文件索引)

---

## 一、專案定位

Section Builder 是一個提供「部門/人員」相關業務的內部管理系統，主要使用情境包含：

- 員工資料生命週期維護（新增、編輯、查詢、統計）
- 出勤與請假紀錄管理
- 年假額度配置
- 專案資料維護與統計
- 假日檔（國定假日）維護，影響請假行事曆顯示
- 系統公告、AI 助手對話
- 角色權限、選單、密碼政策等系統管理

系統依照 **角色（ADMIN / 一般使用者）** 切分功能可見性，並透過動態選單配置控制側邊欄內容。

---

## 二、技術堆疊

### 前端

| 類別 | 技術 |
|------|------|
| 框架 | React 19 + TypeScript |
| 建置工具 | Vite 7 |
| 路由 | React Router 7（`createBrowserRouter`） |
| 圖表 | Recharts |
| 表格匯出 | jsPDF + html2canvas（PDF）、xlsx（Excel） |
| Markdown | react-markdown + remark-gfm |
| Lint | ESLint 9 + typescript-eslint |

### 後端

| 類別 | 技術 |
|------|------|
| 框架 | FastAPI 0.115 |
| ASGI Server | Uvicorn |
| DB 客戶端 | psycopg2-binary（PostgreSQL） |
| 資料模型 | Pydantic 2 |
| JWT | python-jose |
| CSRF | itsdangerous |
| Excel 處理 | openpyxl |
| HTTP（外部呼叫） | httpx |

### 部署

- Docker（前端 Nginx static + 後端 Uvicorn）
- `docker-compose.yml` 定義 frontend、backend 兩個服務（資料庫由外部供應）

---

## 三、系統架構

```
┌──────────────────────────────────────────────────────┐
│                      使用者瀏覽器                     │
└──────────────────────────────────────────────────────┘
                          │ HTTP(S)
                          ▼
┌──────────────────────────────────────────────────────┐
│      Nginx (容器 frontend)                            │
│  ├── 提供 React 靜態資源（/）                         │
│  └── 反向代理 /api/* → backend:8000                   │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│    FastAPI (容器 backend, port 8000)                  │
│  ├── CORSMiddleware                                   │
│  ├── CSRFMiddleware（Cookie + Header 雙重驗證）       │
│  ├── routes/auth_routes.py        # 登入 / JWT        │
│  ├── routes/system_routes.py      # 使用者/角色/選單  │
│  ├── routes/announcement_routes.py                    │
│  ├── routes/assistant_routes.py   # AI 助手           │
│  ├── routes/holiday_routes.py     # 假日檔            │
│  ├── routes/webhook_routes.py     # 外部 webhook 代理 │
│  └── main.py 內聯端點             # member/attendance │
│                                   #   /annual-leave   │
│                                   #   /projects       │
│                                   #   /codetable      │
└──────────────────────────────────────────────────────┘
                          │ psycopg2
                          ▼
┌──────────────────────────────────────────────────────┐
│             PostgreSQL（外部，由 .env 設定）          │
└──────────────────────────────────────────────────────┘
```

### 前端內部分層

```
Page  ─┬─ Hook（業務邏輯 + 狀態）─┬─ Service（HTTP 呼叫）─┬─ httpClient
       │                          │                        │（CSRF/JWT 處理）
       └─ Component（UI）         │
                                  └─ Type（共用型別）
```

每個業務模組（員工、請假、年假、專案、假日、公告、AI 助手 …）皆遵循「Page → Hook → Service」三段式結構。

---

## 四、功能模組

| 模組 | 路由 | 主要頁面 | Hook | Service | 後端端點 |
|------|------|----------|------|---------|----------|
| 員工管理 | `/` | `App.tsx` | `useEmployees` | `api.ts` | `/api/members*` |
| 員工統計 | `/employees/stats` | `EmployeeStatsPage` | `useEmployees` | `api.ts` | `/api/members/stats` |
| 請假維護 | `/attendance` | `AttendancePage` | `useAttendance` | `attendanceApi.ts` | `/api/attendance*` |
| 年假管理 | `/annual-leave` | `AnnualLeavePage` | `useAnnualLeave` | `annualLeaveApi.ts` | `/api/annual-leave*` |
| 請假行事曆 | `/leave-calendar` | `LeaveCalendarPage` | `useLeaveCalendar` | `attendanceApi.ts` | `/api/attendance` + `/api/holidays` |
| 假日檔維護 | `/holidays` | `HolidayPage` | `useHoliday` | `holidayApi.ts` | `/api/holidays*` |
| 請假統計（熱力圖） | `/leave-stats` | `LeaveStatsPage` | `useLeaveStats` | `leaveStatsApi.ts` | `/api/attendance` 衍生 |
| 專案管理 | `/projects` | `ProjectPage` | `useProject` | `projectApi.ts` | `/api/projects*` |
| 專案統計 | `/projects/stats` | `ProjectStatsPage` | `useProject` | `projectApi.ts` | `/api/projects/stats` |
| 參數檔 | `/codetable` | `CodeTablePage` | `useCodeTable` | `codeTableApi.ts` | `/api/codetable*` |
| 系統管理（Tab） | `/system/{users\|roles\|menus\|password-policy}` | `SystemPage` | `useSystemUsers` / `useSystemRoles` / `useMenus` | `systemApi.ts` | `/api/system/*` |
| 選單維護 | `/system/menu-maintenance` | `MenuMaintenancePage` | `useMenus` | `systemApi.ts` | `/api/system/menus*` |
| 公告 | `/system/announcements` | `AnnouncementPage` | `useAnnouncements` | `announcementApi.ts` | `/api/announcements*` |
| AI 助手 | `/assistant` | `AssistantPage` | `useAssistant` | `assistantApi.ts` + `webhookApi.ts` | `/api/assistant*` + `/api/webhook*` |
| 認證 | `/login` | `LoginPage` | （AuthContext） | `authApi.ts` + `httpClient.ts` | `/api/auth/*` + `/api/csrf-token` |

> 系統管理頁面（`/system/*`）需要 `ADMIN` 角色，由 `ProtectedRoute` 透過 `requiredRole` props 強制檢核。

---

## 五、目錄結構

```
section-builder/
├── src/                              # 前端原始碼（React + TS）
│   ├── App.tsx                       # 員工管理首頁主應用
│   ├── main.tsx                      # 入口（掛載 RouterProvider + Provider）
│   ├── router.tsx                    # 全部路由表（含 ProtectedRoute）
│   ├── components/                   # 可重用 UI 組件 + 對應 .css
│   │   ├── Layout.tsx                # 側邊選單 + 上方標題
│   │   ├── ProtectedRoute.tsx        # 路由守衛（登入 + 角色）
│   │   ├── ThemeProvider.tsx         # 深淺色主題 Provider
│   │   ├── ExportDropdown.tsx        # 匯出 PDF/CSV/Excel
│   │   ├── ImportDialog.tsx          # Excel 批次匯入
│   │   ├── PdfPreview.tsx            # 列印前預覽
│   │   ├── EmployeeForm/Table/...    # 員工專屬組件
│   │   └── ...
│   ├── pages/                        # 一頁一檔 + 對應 .css
│   ├── hooks/                        # 一個業務模組一個 hook
│   ├── services/                     # 一個業務模組一個 API client
│   ├── contexts/                     # AuthContext（全域使用者狀態）
│   ├── types/                        # 共用型別（attendance / codeTable / employee）
│   ├── App.css / index.css           # 全域樣式
│   └── assets/
├── server/                           # 後端原始碼（FastAPI）
│   ├── main.py                       # FastAPI app + member/attendance/projects/codetable/annual-leave 端點
│   ├── database.py                   # psycopg2 連線（contextmanager get_cursor）
│   ├── models.py                     # Pydantic 資料模型
│   ├── auth.py                       # 密碼雜湊 + JWT 簽發 / 驗證
│   ├── csrf.py                       # CSRFMiddleware + token cookie 工具
│   ├── routes/                       # 子路由模組
│   │   ├── auth_routes.py
│   │   ├── system_routes.py
│   │   ├── announcement_routes.py
│   │   ├── assistant_routes.py
│   │   ├── holiday_routes.py
│   │   └── webhook_routes.py
│   ├── sql/                          # DDL / 資料修補腳本
│   │   ├── create_announcement_tables.sql
│   │   ├── create_assistant_tables.sql
│   │   ├── create_holiday_table.sql
│   │   ├── create_permission_tables.sql
│   │   ├── cleanup_duplicate_menus.sql
│   │   ├── migrate_menu_id_length.sql
│   │   └── restore_system_pages.sql
│   ├── uploads/                      # 後端上傳檔案存放
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   ├── DEPLOYMENT.md                 # Docker 部署指南
│   ├── FEATURE_TEMPLATE.md           # 新增功能完整範本（含 AI 提示詞）
│   ├── PROJECT_OVERVIEW.md           # 本文件
│   └── specs/                        # 各功能規格書
├── public/                           # 靜態資源
├── docker-compose.yml                # 前後端服務編排
├── Dockerfile                        # 前端容器（Vite 建置 + Nginx）
├── nginx.conf                        # Nginx 反向代理
├── docker-entrypoint.sh              # 前端容器啟動腳本（環境變數注入）
├── init_admin.sh                     # 建立初始 ADMIN 帳號
├── vite.config.ts                    # 開發代理 / 建置 chunk 設定
├── tsconfig*.json                    # TS 設定（app / node 拆分）
├── eslint.config.js                  # ESLint 9 flat config
├── package.json
├── .env.example                      # 環境變數範本
└── README.md                         # 使用者導向說明
```

---

## 六、開發慣例

### 1. 「一個業務模組一條軌道」

新增任何業務功能時，遵循以下檔案組合（範例：`leave`）：

```
src/types/leave.ts                # 共用型別
src/services/leaveApi.ts          # 透過 httpClient 呼叫後端
src/hooks/useLeave.ts             # 狀態 + 操作（CRUD、分頁、篩選）
src/pages/LeavePage.tsx + .css    # 頁面組合
src/components/LeaveForm.tsx      # 必要時拆出表單/表格組件
server/routes/leave_routes.py     # 後端子路由
server/models.py                  # 加上 Pydantic Model
server/sql/create_leave_table.sql # 必要時加 DDL
```

**完整範本請見 [docs/FEATURE_TEMPLATE.md](FEATURE_TEMPLATE.md)。**

### 2. 路由註冊

- 新頁面：在 [src/router.tsx](../src/router.tsx) 加路由，外層包 `<ProtectedRoute>`（需要管理權限再加 `requiredRole="ADMIN"`），內層包 `<Layout>`。
- 新後端 router：在 [server/main.py](../server/main.py) 用 `app.include_router(...)` 註冊。

### 3. CSRF 與 JWT

- **所有寫入請求（POST/PUT/DELETE）必須附上 `X-CSRF-Token` header。**前端透過 [services/httpClient.ts](../src/services/httpClient.ts) 自動帶入，不要繞過。
- 認證透過 HttpOnly Cookie 中的 JWT；前端透過 `AuthContext` 讀取登入狀態。

### 4. 樣式

- 一個組件/頁面對應一個同名 `.css`，避免全域樣式互相覆蓋。
- 主題切換由 `ThemeProvider` 在 `<html>` 注入 `data-theme="dark|light"`，CSS 以 `[data-theme="dark"] .xxx` 撰寫深色變體。
- **整體採 InfoReach Smart FIXGate 視覺風格**：白底卡片 + 企業藍 `#0b5cab` + 4px 圓角 + 等寬字體用於 ID/數字。
- **設計 token 集中於 [src/styles/theme-fixgate.css](../src/styles/theme-fixgate.css)**：所有色彩、字體、字級、圓角、密度都是 CSS 變數（`--fg-*`），深色模式自動透過 `[data-theme="dark"]` 覆蓋。寫 UI 時用 `var(--fg-bg-card)` / `var(--fg-accent)` / `var(--fg-font-mono)` 等，不要寫死 hex。

### 5. CRUD Modal 彈窗

所有業務模組（員工、請假、年假、專案、參數檔、假日、公告、選單、使用者、角色）的「新增 / 編輯」表單一律採 **Modal 彈窗**，不再 inline 佔列表空間。每頁 Modal 用**獨立類別前綴**避免 CSS 衝突：`.emp-form-modal-*`、`.atd-form-modal-*`、`.aly-form-modal-*`、`.prj-form-modal-*`、`.cdt-form-modal-*`、`.sys-form-modal-*`、`.hld-form-modal-*`、`.ann-form-modal-*`、`.mnu-form-modal-*`。互動行為一致：點 backdrop / × / 取消 → 關閉，submit 成功 → 自動關閉。

### 6. 匯出 / 匯入

- 共用 `ExportDropdown`（PDF / CSV / Excel）+ `useExport` + `usePdf`。
- Excel 匯入共用 `ImportDialog`，支援「全部刪除」、「僅新增」、「更新或新增」三種策略。

### 7. 程式碼風格

- TS 嚴格模式（見 `tsconfig.app.json`）。
- ESLint flat config，含 `react-hooks`、`react-refresh` 規則。
- 函式 / 組件預設加上中文 JSDoc 描述（如 `NOTE: ...`）。

---

## 七、認證與安全

### JWT 流程

1. 前端 `LoginPage` 呼叫 `POST /api/auth/login`。
2. 後端 `auth.py` 驗證密碼（SHA512 + 鹽值），核發 JWT，預設 8 小時有效。
3. JWT 透過 HttpOnly Cookie 回傳；後續請求由瀏覽器自動帶上。
4. `getCurrentUser()` 解析 token 取得 `user.roles`，由 `AuthContext` 廣播。

### CSRF 流程

1. 前端啟動時呼叫 `GET /api/csrf-token`，後端產生簽章 token，同時寫入 Cookie 與回應 body。
2. 後端 `CSRFMiddleware` 對每個非 GET 請求檢查 Header `X-CSRF-Token` 是否與 Cookie 相符。
3. 前端 `httpClient.ts` 在 fetch 包裝層自動讀取 Cookie 中 token 並注入 Header。

### 角色權限

- 角色資訊存在 JWT payload 內。
- 前端：`<ProtectedRoute requiredRole="ADMIN">` 控制路由可見性；`useAuth().hasRole(role)` 在 UI 中條件渲染。
- 後端：對需要管理權限的路由透過依賴注入檢查 `roles`（請見 `routes/system_routes.py`）。

### 環境變數（敏感）

- `JWT_SECRET_KEY`：未設定會在啟動時產生隨機值，**正式環境必須固定**。
- `PASSWORD_SALT`：密碼雜湊鹽值，**異動會使所有舊密碼失效**。
- `DB_*`：PostgreSQL 連線設定（見 `.env.example`）。

---

## 八、資料庫

- 統一透過 [server/database.py](../server/database.py) 的 `get_cursor()` context manager。游標自動 commit / rollback / close。
- 使用 `RealDictCursor`，查詢結果是 `dict`（直接 `dict(row)` 即可序列化）。
- 所有 DDL 變動 / 一次性資料修補腳本放 [server/sql/](../server/sql/)；新增資料表時請新增對應檔案，方便部署時統一執行。
- 資料表大致對應：
  - `member` — 員工主檔
  - `attendance` — 請假紀錄（`emp_id + leave_date + leave_type` 為複合鍵）
  - `annual_leave` — 年度假別額度（`emp_id + year + leave_type`）
  - `project_info` — 專案
  - `code_table` — 系統參數（含假別等子代碼）
  - `holiday` — 國定/公司假日
  - `sys_user` / `sys_role` / `sys_user_role` / `sys_menu` / `sys_role_menu` / `sys_password_policy` — 系統管理
  - `announcement` — 公告
  - `assistant_*` — AI 助手會話 / 訊息

---

## 九、開發 / 部署流程

### 開發

```bash
# 前端
npm install
npm run dev          # http://localhost:5173 （/api 自動代理到 8000）

# 後端
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 建置

```bash
npm run build        # tsc -b && vite build → dist/
npm run lint
```

### Docker 部署

```bash
cp .env.example .env
# 編輯 .env，填入正式 DB 連線資訊
docker compose up -d --build
./init_admin.sh      # 首次部署建立預設 ADMIN（密碼 Admin123，請立即變更）
```

詳細步驟見 [docs/DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 十、相關文件索引

| 文件 | 用途 |
|------|------|
| [README.md](../README.md) | 使用者導向：功能介紹、技術堆疊、API 端點清單 |
| [docs/PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | 開發者導向：架構、模組關係、開發慣例（本文件） |
| [docs/DEPLOYMENT.md](DEPLOYMENT.md) | Docker 部署、環境變數、常見問題 |
| [docs/FEATURE_TEMPLATE.md](FEATURE_TEMPLATE.md) | 新增業務功能完整程式碼範本（含 AI 提示詞） |
| [docs/specs/](specs/) | 各模組規格書（Employee / Attendance / Annual Leave / Project / CodeTable / System） |
| [CLAUDE.md](../CLAUDE.md) | 給 Claude / AI Coding Agent 的工作指引 |
