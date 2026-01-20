# 專案管理功能規格說明書

| 項目 | 內容 |
|------|------|
| 文件編號 | SRS-PRJ-001 |
| 版本 | 1.0 |
| 建立日期 | 2026-01-20 |
| 作者 | System Analyst |
| 狀態 | 已核准 |

---

## 1. 文件簡介

### 1.1 目的

本文件詳細描述「專案管理」功能的完整需求規格，供開發人員依據本文件進行系統設計與實作。

### 1.2 範圍

本功能涵蓋專案資料的新增、查詢、修改、刪除（CRUD）操作，以及 Excel 批次匯入與統計報表功能。

### 1.3 名詞定義

| 名詞 | 說明 |
|------|------|
| 專案代號 (project_id) | 專案唯一識別碼，為主鍵 |
| 專案狀態 (project_status) | 專案進行狀態（如：進行中、已結案等） |
| 匯入模式 | delete_all/insert_only/upsert |

---

## 2. 功能概述

### 2.1 功能目的

管理企業專案資訊，追蹤專案進度、成本、人力配置等資料，並提供統計報表分析。

### 2.2 功能架構

```
專案管理
├── 專案清單
│   ├── 列表展示
│   ├── 多維度篩選（代號、名稱、客戶、狀態、部門、日期範圍）
│   ├── 分頁排序
│   └── 資料匯出
├── 新增專案
├── 編輯專案
├── 刪除專案
├── Excel 批次匯入
│   ├── 全部刪除後新增
│   ├── 僅新增不存在
│   └── 存在更新/不存在新增
└── 專案統計報表
    ├── 依狀態統計
    ├── 依客戶統計
    └── 依部門統計
```

### 2.3 使用情境

| 情境編號 | 情境描述 |
|----------|----------|
| UC-001 | PM 新增專案資料 |
| UC-002 | PM 更新專案進度狀態 |
| UC-003 | 管理層查詢特定客戶的所有專案 |
| UC-004 | 財務人員查詢專案金額與成本 |
| UC-005 | 人資人員批次匯入專案資料 |
| UC-006 | 主管檢視專案統計報表 |

---

## 3. 功能需求

### 3.1 專案清單查詢 (FR-001)

#### 3.1.1 輸入條件

| 參數名稱 | 資料型態 | 必填 | 說明 |
|----------|----------|------|------|
| project_id | string | 否 | 專案代號篩選 |
| project_name | string | 否 | 專案名稱篩選（模糊比對） |
| customer_name | string | 否 | 客戶名稱篩選 |
| project_status | string[] | 否 | 專案狀態篩選（可多選） |
| project_department | string | 否 | 歸屬部門篩選 |
| date_from | string | 否 | 計畫開始日（起） |
| date_to | string | 否 | 計畫開始日（迄） |
| page | integer | 否 | 頁碼 |
| page_size | integer | 否 | 每頁筆數 |
| sort_by | string | 否 | 排序欄位 |
| sort_order | string | 否 | 排序方向 |

#### 3.1.2 可排序欄位

- project_id（專案代號）
- project_name（專案名稱）
- customer_name（客戶名稱）
- project_plan_sdate（計畫開始日）
- project_status（專案狀態）
- project_amt（專案金額）

---

### 3.2 新增專案 (FR-002)

#### 3.2.1 輸入欄位

| 欄位名稱 | 資料型態 | 必填 | 說明 |
|----------|----------|------|------|
| project_id | string(7) | ✓ | 專案代號（主鍵） |
| so_no | string(7) | - | 合約代號 |
| project_name | string(100) | - | 專案名稱 |
| customer_name | string(100) | - | 客戶名稱 |
| project_plan_sdate | string(10) | - | 計畫開始日 YYYY-MM-DD |
| project_plan_edate | string(10) | - | 計畫結束日 |
| warranty_sdate | string(10) | - | 保固開始日 |
| warranty_edate | string(10) | - | 保固結束日 |
| project_amt | float | - | 專案金額 |
| project_department | string(100) | - | 歸屬部門 |
| project_manager | string(20) | - | 專案負責人 |
| project_status | string(10) | - | 專案狀態 |
| agreed_acceptance_date | string(10) | - | 約定驗收日 |
| estimated_acceptance_date | string(10) | - | 預計驗收日 |
| actual_acceptance_date | string(10) | - | 實際驗收日 |
| actual_progress | float | - | 實際進度 (%) |
| actual_cost | float | - | 實際成本 |
| project_category | string(50) | - | 專案類別 |

---

### 3.3 Excel 批次匯入 (FR-003)

#### 3.3.1 功能描述

支援從 Excel 檔案（.xlsx, .xls）批次匯入專案資料。

#### 3.3.2 匯入模式

| 模式 | 說明 |
|------|------|
| delete_all | 全部刪除後新增：先清空資料表，再匯入所有資料 |
| insert_only | 僅新增不存在：跳過已存在的專案代號 |
| upsert | 存在更新/不存在新增：依專案代號判斷 |

#### 3.3.3 Excel 欄位對照

| Excel 欄位 | 資料表欄位 |
|------------|------------|
| 專案代號 | project_id |
| 合約代號 | so_no |
| 專案名稱 | project_name |
| 客戶名稱 | customer_name |
| 計畫開始日 | project_plan_sdate |
| 計畫結束日 | project_plan_edate |
| 專案金額 | project_amt |
| 歸屬部門 | project_department |
| 專案負責人 | project_manager |
| 專案狀態 | project_status |

#### 3.3.4 處理邏輯

1. 前端選擇 Excel 檔案
2. 前端選擇匯入模式
3. 呼叫後端匯入 API
4. 後端解析 Excel 內容
5. 依模式執行對應操作
6. 回傳匯入結果（成功/失敗筆數）

---

### 3.4 專案統計報表 (FR-004)

#### 3.4.1 統計維度

| 維度 | 說明 |
|------|------|
| status | 依專案狀態分組統計 |
| customer | 依客戶名稱分組統計 |
| department | 依歸屬部門分組統計 |

#### 3.4.2 篩選條件

- 日期範圍（計畫開始日）
- 專案狀態（可多選）

#### 3.4.3 輸出內容

每個分組的專案數量，並以圖表呈現。

---

## 4. 資料規格

### 4.1 資料表結構

**資料表名稱：** `project_info`

| 欄位名稱 | 資料型態 | 主鍵 | 說明 |
|----------|----------|------|------|
| project_id | VARCHAR(7) | ✓ | 專案代號 |
| so_no | VARCHAR(7) | - | 合約代號 |
| project_name | VARCHAR(100) | - | 專案名稱 |
| customer_name | VARCHAR(100) | - | 客戶名稱 |
| project_plan_sdate | VARCHAR(10) | - | 計畫開始日 |
| project_plan_edate | VARCHAR(10) | - | 計畫結束日 |
| warranty_sdate | VARCHAR(10) | - | 保固開始日 |
| warranty_edate | VARCHAR(10) | - | 保固結束日 |
| project_amt | NUMERIC | - | 專案金額 |
| project_department | VARCHAR(100) | - | 歸屬部門 |
| project_manager | VARCHAR(20) | - | 專案負責人 |
| project_status | VARCHAR(10) | - | 專案狀態 |
| actual_progress | NUMERIC | - | 實際進度 |
| actual_cost | NUMERIC | - | 實際成本 |
| project_category | VARCHAR(50) | - | 專案類別 |

---

## 5. 介面規格

### 5.1 頁面佈局

```
┌──────────────────────────────────────────────────────────────┐
│ Header: 📋 專案管理     [重新載入] [匯入] [匯出 ▼]            │
├──────────────────────────────────────────────────────────────┤
│ Form: 新增/編輯專案                                           │
│ [專案代號*] [合約代號] [專案名稱] [客戶名稱] [狀態▼]          │
│ [開始日期] [結束日期] [金額] [部門] [負責人]                  │
├──────────────────────────────────────────────────────────────┤
│ Search: 專案清單                                              │
│ [代號] [名稱] [客戶▼] [狀態▼] [部門▼] [日期範圍]             │
├──────────────────────────────────────────────────────────────┤
│ Table: 專案代號 | 專案名稱 | 客戶 | 狀態 | 金額 | 部門 | 操作 │
├──────────────────────────────────────────────────────────────┤
│ Pagination                                                    │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 匯入對話框

```
┌─────────────────────────────────────┐
│ 匯入專案資料                         │
├─────────────────────────────────────┤
│ 選擇檔案: [選擇 Excel 檔案...]      │
│                                     │
│ 匯入模式:                           │
│ ○ 全部刪除後新增                    │
│ ○ 僅新增不存在                      │
│ ● 存在更新，不存在新增              │
│                                     │
│              [取消] [開始匯入]      │
└─────────────────────────────────────┘
```

---

## 6. API 規格

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/projects` | GET | 取得專案清單 |
| `/api/projects/stats` | GET | 取得專案統計 |
| `/api/projects/filter-options` | GET | 取得篩選選項 |
| `/api/projects/{project_id}` | GET | 取得單一專案 |
| `/api/projects` | POST | 新增專案 |
| `/api/projects/{project_id}` | PUT | 更新專案 |
| `/api/projects/{project_id}` | DELETE | 刪除專案 |
| `/api/projects/import` | POST | 批次匯入專案 |

### 6.1 匯入 API 特殊規格

| 項目 | 規格 |
|------|------|
| 端點 | `POST /api/projects/import` |
| Content-Type | multipart/form-data |
| 參數 - file | Excel 檔案（.xlsx, .xls） |
| 參數 - mode | delete_all / insert_only / upsert |

**Response:**

```json
{
  "message": "匯入完成",
  "total_rows": 100,
  "inserted": 80,
  "updated": 15,
  "skipped": 5,
  "errors": []
}
```

---

## 7. 商業規則

| 規則編號 | 規則描述 |
|----------|----------|
| BR-001 | 專案代號為主鍵，不可重複，最大 7 字元 |
| BR-002 | 批次匯入時，空值欄位不覆蓋既有資料（upsert 模式） |
| BR-003 | delete_all 模式會清空所有專案資料，需謹慎使用 |
| BR-004 | 統計報表可依多個維度分組呈現 |

---

## 8. 錯誤處理

| 錯誤代碼 | 中文訊息 |
|----------|----------|
| PRJ_NOT_FOUND | 專案不存在 |
| PRJ_ID_EXISTS | 專案代號已存在 |
| INVALID_FILE | 檔案格式不正確，請上傳 Excel 檔案 |
| IMPORT_FAILED | 匯入失敗 |

---

## 附錄：變更歷史

| 版本 | 日期 | 作者 | 變更說明 |
|------|------|------|----------|
| 1.0 | 2026-01-20 | SA | 初版建立 |
