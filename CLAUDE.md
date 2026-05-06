# CLAUDE.md

本檔案提供 Claude Code（與其他 AI coding agent）在本專案中工作的指引。閱讀完即可動手；更深入的架構說明請見 [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)。

---

## 專案速覽

**Section Builder** — 部門人員管理系統（員工、請假、年假、專案、行事曆、AI 助手、系統管理）。

- 前端：React 19 + TypeScript + Vite 7 + React Router 7（SPA）
- 後端：FastAPI + psycopg2 + PostgreSQL
- 認證：HttpOnly JWT Cookie + CSRF Token（雙重驗證）
- 部署：Docker（Nginx 反代靜態前端 + Uvicorn 後端）

---

## 常用指令

```bash
# 前端開發伺服器（http://localhost:5173，/api 自動代理到 :8000）
npm run dev

# 建置（先跑 tsc -b 嚴格型別檢查再 vite build）
npm run build

# Lint（ESLint 9 flat config）
npm run lint

# 後端
cd server
uvicorn main:app --reload --port 8000

# Docker 全套
docker compose up -d --build
./init_admin.sh      # 首次建立 ADMIN（預設密碼 Admin123）
```

> 完成 UI 變更後請至少執行 `npm run build` 一次以驗證型別；後端變更請啟動 uvicorn 並打 `/health` 驗證可載入。

---

## 架構與分層

### 前端（一個業務模組一條軌道）

```
src/types/<feature>.ts       共用型別
src/services/<feature>Api.ts 透過 httpClient 呼叫後端
src/hooks/use<Feature>.ts    狀態 + CRUD + 篩選 + 分頁
src/pages/<Feature>Page.tsx  頁面組合（+ 同名 .css）
src/components/...           可重用組件（一個組件一個 .css）
```

### 後端

```
server/main.py               FastAPI app + 部分內聯端點（member/attendance/annual-leave/projects/codetable）
server/routes/*.py           子路由（auth/system/announcement/assistant/holiday/webhook）
server/models.py             所有 Pydantic 模型集中於此
server/database.py           get_cursor() context manager（不要自己開連線）
server/auth.py               密碼雜湊 + JWT
server/csrf.py               CSRFMiddleware
server/sql/*.sql             DDL / 修補腳本
```

新增業務模組時請完整補齊上述兩側檔案。完整範本見 [docs/FEATURE_TEMPLATE.md](docs/FEATURE_TEMPLATE.md)。

---

## 路由註冊

- **前端**：在 [src/router.tsx](src/router.tsx) 加路由。預設外層包 `<ProtectedRoute>`、內層包 `<Layout>`；需 ADMIN 權限再加 `requiredRole="ADMIN"`。
- **後端**：新增 router 後在 [server/main.py](server/main.py) 用 `app.include_router(...)` 註冊。
- 前端動態側邊選單由資料庫 `sys_menu` 驅動（`useMenus`），所以新增頁面後要記得在「選單維護」加入對應條目，使用者才看得到入口。

---

## 認證與安全（重要）

1. **CSRF 必須帶**：所有非 GET 請求都要帶 `X-CSRF-Token` header。前端統一走 [src/services/httpClient.ts](src/services/httpClient.ts)，**不要直接用 `fetch` 繞過**，否則會被後端中間件擋下。
2. **JWT 在 HttpOnly Cookie**：前端不會直接讀取 token；所有頁面狀態走 `AuthContext` (`useAuth()`)。
3. **角色檢核兩端都要做**：前端用 `<ProtectedRoute requiredRole>` 或 `useAuth().hasRole()`；後端對應路由要在 router 層加角色依賴（參考 `routes/system_routes.py`）。
4. **不要把 token 寫 console / log**；不要把 `JWT_SECRET_KEY`、`PASSWORD_SALT` 寫死在程式碼裡，一律走環境變數。

---

## 資料庫操作

- 一律使用 [server/database.py](server/database.py) 的 `get_cursor()`：

  ```python
  with get_cursor() as cursor:
      cursor.execute("SELECT ... FROM member WHERE emp_id = %s", (emp_id,))
      row = cursor.fetchone()
  ```

  Context manager 已處理 commit / rollback / close。**不要自己呼叫 `psycopg2.connect`**。

- `RealDictCursor` 回傳 `dict`，可以直接 `dict(row)` 序列化，不要再手動轉 column。
- SQL 一律用參數化查詢（`%s`），**禁止字串拼接 user input**。
- 資料表變動：在 `server/sql/` 加一份 `create_<feature>_table.sql` 或 `migrate_<...>.sql`，方便部署時對齊 schema。
- 主鍵慣例：
  - `member.emp_id`（員工編號，字串）
  - `attendance` = `(emp_id, leave_date, leave_type)` 複合鍵
  - `annual_leave` = `(emp_id, year, leave_type)` 複合鍵
  - `code_table` = `(code_code, code_subcode)` 複合鍵

---

## 樣式與主題

- 一個組件 / 頁面對應一個同名 `.css`，避免全域樣式衝突。
- 深淺色主題由 `<ThemeProvider>` 在 `<html data-theme>` 切換；CSS 用 `[data-theme="dark"] .xxx { ... }` 撰寫深色變體。
- **新增 UI 時務必同時補上深色樣式**，否則切到深色模式會出現對比不足或白塊。

### FIXGate 設計系統

整體視覺採 **InfoReach Smart FIXGate** 風格，所有色彩 / 字體 / 間距 / 圓角集中在 [src/styles/theme-fixgate.css](src/styles/theme-fixgate.css) 的 CSS 變數：

| 類別 | 變數前綴 | 範例 |
|------|---------|------|
| 表面 / 背景 | `--fg-bg-*` | `--fg-bg-page` / `--fg-bg-card` / `--fg-bg-thead` / `--fg-bg-hover` |
| 邊框 | `--fg-border*` | `--fg-border` / `--fg-border-subtle` / `--fg-border-strong` |
| 文字 | `--fg-text-*` | `--fg-text-primary` / `--fg-text-secondary` / `--fg-text-muted` |
| 強調色 | `--fg-accent*` | `--fg-accent` (`#0b5cab`) / `--fg-accent-soft` / `--fg-accent-ring` |
| 狀態 | `--fg-success` / `--fg-warning` / `--fg-danger` / `--fg-info` | + 對應 `-soft` 淺色版 |
| 字體 | `--fg-font-ui` / `--fg-font-mono` | UI 用 Inter，ID/數字/路徑用 SF Mono |
| 字級 | `--fg-font-size-{xs/sm/base/md/lg/xl}` | 11 / 12 / 13 / 14 / 16 / 20 px |
| 圓角 | `--fg-radius-{sm/md/lg/pill}` | 2 / 4 / 6 / 9999 px |
| 密度 | `--fg-row-height` (32px) / `--fg-input-height` (32px) / `--fg-button-height` |

**寫新 UI 時直接用 `var(--fg-*)`**，不要寫死 hex。深色模式自動透過 `[data-theme="dark"]` 覆蓋，無需另寫。

### Modal 命名慣例

每頁的「新增/編輯表單 Modal」使用**獨立類別前綴**避免 CSS 衝突：

| 頁面 | 前綴 |
|------|------|
| 員工管理 | `.emp-form-modal-*` |
| 請假維護 | `.atd-form-modal-*` |
| 年假管理 | `.aly-form-modal-*` |
| 專案管理 | `.prj-form-modal-*` |
| 參數檔 | `.cdt-form-modal-*` |
| 系統管理 | `.sys-form-modal-*` |
| 假日檔 | `.hld-form-modal-*` |
| 公告 | `.ann-form-modal-*` |
| 選單維護 | `.mnu-form-modal-*` |

新增頁面時用未使用過的 3 字母前綴。每組固定五個元素：`-overlay` / `-content` / `-header` / `-title` / `-body` / `-close`，互動行為一致：點 backdrop / × / 取消 → 關閉，submit 成功 → 自動關閉。

---

## 匯出 / 匯入

- 匯出 PDF / CSV / Excel 共用 `<ExportDropdown>` + `useExport` + `usePdf`，新功能優先沿用而不是另寫。
- Excel 匯入共用 `<ImportDialog>`，支援三種策略：「全部刪除」、「僅新增」、「更新或新增」。

---

## 程式碼風格

- TypeScript 嚴格模式，型別定義集中於 [src/types/](src/types/) 下。
- 函式 / 組件習慣用中文 JSDoc + `NOTE:` 標記（沿用既有風格即可）。
- ESLint 設定見 [eslint.config.js](eslint.config.js)，含 `react-hooks` / `react-refresh` 規則；不要關閉規則來繞過警告。
- 請保留繁體中文 UI 文案、模型 description；不要英譯。
- 不要在 `models.py` 隨意改現有欄位的 alias（如 `預算單位代號`），會破壞與資料庫欄位對應。

---

## 環境變數

`.env`（請以 `.env.example` 為範本）必填：

```
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
JWT_SECRET_KEY        # 正式環境務必固定，否則重啟後所有 JWT 失效
PASSWORD_SALT         # 異動會使所有既有密碼失效
FRONTEND_PORT=80
BACKEND_PORT=8000
CORS_ORIGINS=...      # 額外 CORS 來源（逗號分隔，可選）
```

前端開發時不需要 `.env`，Vite dev server 會代理 `/api` → `localhost:8000`。

---

## 改動時的檢查清單

提交前自我檢查：

- [ ] 新頁面同時在 `router.tsx` 註冊、且選單維護資料有對應條目
- [ ] 新後端 route 有 `app.include_router(...)`
- [ ] 寫入請求走 `httpClient`（自動帶 CSRF），未繞過
- [ ] DB 變動有對應 `server/sql/*.sql` 並使用參數化查詢
- [ ] 新組件有同名 `.css`，且包含深色主題樣式
- [ ] `npm run build` 不報錯（含 `tsc -b` 嚴格型別）
- [ ] `npm run lint` 不出新警告
- [ ] 新增 / 修改的權限敏感端點，前後端都有 ADMIN 檢核

---

## 常見陷阱

1. **直接用 fetch 漏掉 CSRF token** → 4xx，請改用 `httpClient`。
2. **新增頁面後沒在選單維護新增條目** → 一般使用者沒有入口可進。
3. **SQL 字串拼接** → 注入風險，一律 `%s` 參數化。
4. **改動 `PASSWORD_SALT` / `JWT_SECRET_KEY`** → 影響線上所有使用者，需事前公告。
5. **路由順序**：`/projects/stats` 必須在 `/projects` 之前（避免 React Router 把 `stats` 當作 id 解析）；類似情況注意排序。
6. **複合鍵 URL**：例如 `/api/attendance/{emp_id}/{leave_date}/{leave_type}`，少一段就會 404。

---

## 不要做的事

- 不要新增不必要的後端 framework / ORM（沿用 psycopg2 + Pydantic 即可）。
- 不要在前端引入新的狀態管理庫（Redux / Zustand 等），目前用 `useState` + Context 已足夠。
- 不要建立 `.md` 文件除非使用者要求或屬於 [docs/specs/](docs/specs/) 規格書。
- 不要在 commit 時改 `.env` 或加入機密資訊。
- 不要為相容性保留死碼（被取代的舊版可直接刪除）。

---

## 相關文件

- [README.md](README.md) — 使用者導向、功能與 API 端點清單
- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) — 開發者導向架構與模組詳解
- [docs/FEATURE_TEMPLATE.md](docs/FEATURE_TEMPLATE.md) — 新功能完整程式碼範本
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker 部署
- [docs/specs/](docs/specs/) — 各模組規格書
