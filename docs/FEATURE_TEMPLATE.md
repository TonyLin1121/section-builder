# Section Builder 功能開發範本

本文件以「員工管理」功能為範例，說明如何開發一個完整的 CRUD 作業，包含前端頁面、Hook、API 服務，以及後端 API 端點。

---

## 目錄

- [架構概覽](#架構概覽)
- [檔案結構](#檔案結構)
- [開發步驟](#開發步驟)
- [程式碼範本](#程式碼範本)
  - [1. 型別定義](#1-型別定義)
  - [2. API 服務](#2-api-服務)
  - [3. 自訂 Hook](#3-自訂-hook)
  - [4. 表單組件](#4-表單組件)
  - [5. 表格組件](#5-表格組件)
  - [6. 頁面組件](#6-頁面組件)
  - [7. 後端 Pydantic 模型](#7-後端-pydantic-模型)
  - [8. 後端 API 端點](#8-後端-api-端點)
- [共用組件](#共用組件)
- [樣式規範](#樣式規範)
- [AI 提示詞範本](#ai-提示詞範本)

---

## 架構概覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (React + TypeScript)                │
├─────────────────────────────────────────────────────────────────┤
│  Page Component (頁面組件)                                      │
│    ├── 整合 Hook 取得狀態與方法                                 │
│    ├── 處理使用者互動                                           │
│    └── 組合表單、表格、分頁等子組件                             │
├─────────────────────────────────────────────────────────────────┤
│  Custom Hook (自訂 Hook)                                        │
│    ├── 管理狀態 (useState)                                      │
│    ├── 處理副作用 (useEffect)                                   │
│    ├── 呼叫 API 服務                                            │
│    └── 提供 CRUD 操作方法                                       │
├─────────────────────────────────────────────────────────────────┤
│  API Service (API 服務層)                                       │
│    ├── 封裝 HTTP 請求                                           │
│    ├── 處理 CSRF Token                                          │
│    └── 統一錯誤處理                                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        後端 (FastAPI + PostgreSQL)              │
├─────────────────────────────────────────────────────────────────┤
│  API Endpoint (API 端點)                                        │
│    ├── 接收請求、驗證參數                                       │
│    ├── 執行資料庫操作                                           │
│    └── 回傳 JSON 結果                                           │
├─────────────────────────────────────────────────────────────────┤
│  Pydantic Model (資料模型)                                      │
│    ├── Base (基礎欄位)                                          │
│    ├── Create (新增用，含主鍵)                                  │
│    ├── Update (更新用，全部可選)                                │
│    └── Response (回應用，含主鍵)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 檔案結構

以「XXX 管理」功能為例，需要建立以下檔案：

```
src/
├── types/
│   └── xxx.ts              # 型別定義
├── services/
│   └── xxxApi.ts           # API 服務
├── hooks/
│   └── useXxx.ts           # 自訂 Hook
├── components/
│   ├── XxxForm.tsx         # 表單組件
│   ├── XxxForm.css         # 表單樣式
│   ├── XxxTable.tsx        # 表格組件
│   └── XxxTable.css        # 表格樣式
├── pages/
│   ├── XxxPage.tsx         # 頁面組件
│   └── XxxPage.css         # 頁面樣式
└── router.tsx              # 路由配置（新增路由）

server/
├── models.py               # 新增 Pydantic 模型
└── main.py                 # 新增 API 端點
```

---

## 開發步驟

### 1. 定義資料結構

1. 確認資料庫表結構
2. 建立前端 TypeScript 型別 (`src/types/xxx.ts`)
3. 建立後端 Pydantic 模型 (`server/models.py`)

### 2. 建立 API 層

1. 後端：建立 CRUD API 端點 (`server/main.py`)
2. 前端：建立 API 服務函式 (`src/services/xxxApi.ts`)

### 3. 建立自訂 Hook

1. 建立自訂 Hook (`src/hooks/useXxx.ts`)
2. 實作狀態管理、API 呼叫、CRUD 方法

### 4. 建立 UI 組件

1. 建立表單組件 (`src/components/XxxForm.tsx`)
2. 建立表格組件 (`src/components/XxxTable.tsx`)
3. 建立對應的 CSS 樣式檔

### 5. 建立頁面組件

1. 建立頁面組件 (`src/pages/XxxPage.tsx`)
2. 整合 Hook 與子組件

### 6. 設定路由

1. 更新 `src/router.tsx` 加入新路由
2. 更新 `src/components/Layout.tsx` 加入側邊選單項目

---

## 程式碼範本

### 1. 型別定義

**檔案：** `src/types/xxx.ts`

```typescript
/**
 * XXX 資料介面
 * NOTE: 對應 PostgreSQL xxx 資料表結構
 */
export interface Xxx {
  /** 主鍵 */
  id: string;
  /** 名稱 */
  name?: string;
  /** 描述 */
  description?: string;
  /** 狀態 */
  is_active?: boolean;
  /** 備註 */
  remark?: string;
}

/**
 * 新增/編輯表單資料
 */
export type XxxFormData = Omit<Xxx, 'id'> & { id?: string };

/**
 * 狀態選項（如有需要）
 */
export const XXX_STATUS_OPTIONS = [
  { key: 'active', label: '啟用' },
  { key: 'inactive', label: '停用' },
] as const;
```

---

### 2. API 服務

**檔案：** `src/services/xxxApi.ts`

```typescript
/**
 * XXX API 服務模組
 * NOTE: 封裝與後端的 HTTP 請求
 */
import type { Xxx, XxxFormData } from '../types/xxx';
import { httpRequest, type PaginatedResponse } from './httpClient';

/**
 * 取得清單（支援分頁、排序）
 */
export async function getXxxList(params?: {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<Xxx>> {
  const searchParams = new URLSearchParams();

  if (params?.search) {
    searchParams.set('search', params.search);
  }
  if (params?.is_active !== undefined) {
    searchParams.set('is_active', String(params.is_active));
  }
  if (params?.page) {
    searchParams.set('page', params.page.toString());
  }
  if (params?.page_size) {
    searchParams.set('page_size', params.page_size.toString());
  }
  if (params?.sort_by) {
    searchParams.set('sort_by', params.sort_by);
  }
  if (params?.sort_order) {
    searchParams.set('sort_order', params.sort_order);
  }

  const query = searchParams.toString();
  return httpRequest<PaginatedResponse<Xxx>>(`/xxx${query ? `?${query}` : ''}`);
}

/**
 * 取得單筆資料
 */
export async function getXxx(id: string): Promise<Xxx> {
  return httpRequest<Xxx>(`/xxx/${encodeURIComponent(id)}`);
}

/**
 * 新增
 */
export async function createXxx(data: XxxFormData & { id: string }): Promise<Xxx> {
  return httpRequest<Xxx>('/xxx', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新
 */
export async function updateXxx(id: string, data: XxxFormData): Promise<Xxx> {
  return httpRequest<Xxx>(`/xxx/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 刪除
 */
export async function deleteXxx(id: string): Promise<{ message: string; id: string }> {
  return httpRequest<{ message: string; id: string }>(`/xxx/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
```

---

### 3. 自訂 Hook

**檔案：** `src/hooks/useXxx.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Xxx, XxxFormData } from '../types/xxx';
import * as api from '../services/xxxApi';

type SortOrder = 'asc' | 'desc' | null;

/**
 * XXX 資料管理 Hook
 * NOTE: 使用 API 進行 CRUD 操作，支援分頁和排序
 */
export function useXxx() {
  // 資料狀態
  const [items, setItems] = useState<Xxx[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Xxx | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // 排序狀態
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  /**
   * 載入資料清單
   */
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getXxxList({
        search: searchTerm || undefined,
        page: currentPage,
        page_size: pageSize,
        sort_by: sortBy || undefined,
        sort_order: sortOrder || undefined,
      });
      setItems(response.items);
      setTotalCount(response.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
      console.error('載入資料失敗:', e);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, currentPage, pageSize, sortBy, sortOrder]);

  // 搜尋變更時重置頁碼
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 參數變更時重新載入（含 debounce）
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  /**
   * 新增資料
   */
  const addItem = useCallback(async (data: XxxFormData & { id: string }) => {
    setError(null);
    try {
      await api.createXxx(data);
      await fetchItems();
    } catch (e) {
      const message = e instanceof Error ? e.message : '新增失敗';
      setError(message);
      throw e;
    }
  }, [fetchItems]);

  /**
   * 更新資料
   */
  const updateItem = useCallback(async (id: string, data: XxxFormData) => {
    setError(null);
    try {
      await api.updateXxx(id, data);
      await fetchItems();
      setEditingItem(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : '更新失敗';
      setError(message);
      throw e;
    }
  }, [fetchItems]);

  /**
   * 刪除資料
   */
  const deleteItem = useCallback(async (id: string) => {
    setError(null);
    try {
      await api.deleteXxx(id);
      await fetchItems();
    } catch (e) {
      const message = e instanceof Error ? e.message : '刪除失敗';
      setError(message);
      throw e;
    }
  }, [fetchItems]);

  /**
   * 開始編輯
   */
  const startEdit = useCallback((item: Xxx) => {
    setEditingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /**
   * 取消編輯
   */
  const cancelEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  /**
   * 變更排序
   */
  const handleSort = useCallback((key: string, order: SortOrder) => {
    setSortBy(order ? key : null);
    setSortOrder(order);
  }, []);

  /**
   * 重新載入
   */
  const refresh = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    searchTerm,
    setSearchTerm,
    editingItem,
    addItem,
    updateItem,
    deleteItem,
    startEdit,
    cancelEdit,
    refresh,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    sortBy,
    sortOrder,
    handleSort,
  };
}
```

---

### 4. 表單組件

**檔案：** `src/components/XxxForm.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import type { Xxx, XxxFormData } from '../types/xxx';
import './XxxForm.css';

interface XxxFormProps {
  /** 編輯模式下的資料 */
  editingItem?: Xxx | null;
  /** 表單提交回調 */
  onSubmit: (data: XxxFormData & { id: string }) => void;
  /** 取消編輯回調 */
  onCancel?: () => void;
}

const INITIAL_FORM_DATA: XxxFormData & { id: string } = {
  id: '',
  name: '',
  description: '',
  is_active: true,
  remark: '',
};

/**
 * XXX 表單組件
 * NOTE: 支援新增與編輯兩種模式
 */
export function XxxForm({ editingItem, onSubmit, onCancel }: XxxFormProps) {
  const [formData, setFormData] = useState<XxxFormData & { id: string }>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const isEditing = !!editingItem;

  // 編輯模式下填充表單資料
  useEffect(() => {
    if (editingItem) {
      setFormData({ ...INITIAL_FORM_DATA, ...editingItem });
    } else {
      setFormData(INITIAL_FORM_DATA);
    }
    setErrors({});
  }, [editingItem]);

  /**
   * 驗證表單
   */
  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (!formData.id?.trim()) {
      newErrors.id = '請輸入編號';
    }
    if (!formData.name?.trim()) {
      newErrors.name = '請輸入名稱';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 處理輸入變更
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * 處理表單提交
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
      if (!isEditing) {
        setFormData(INITIAL_FORM_DATA);
      }
    }
  };

  /**
   * 處理取消
   */
  const handleCancel = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    onCancel?.();
  };

  return (
    <form className="xxx-form" onSubmit={handleSubmit}>
      <h2 className="form-title">
        {isEditing ? '編輯資料' : '新增資料'}
      </h2>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="id">編號 *</label>
          <input
            type="text"
            id="id"
            name="id"
            value={formData.id}
            onChange={handleChange}
            placeholder="請輸入編號"
            className={errors.id ? 'error' : ''}
            disabled={isEditing}
          />
          {errors.id && <span className="error-message">{errors.id}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="name">名稱 *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="請輸入名稱"
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group form-group-full">
          <label htmlFor="description">描述</label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="描述說明..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_active"
              checked={!!formData.is_active}
              onChange={handleChange}
            />
            <span>啟用</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        {isEditing && (
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>
            取消
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {isEditing ? '更新' : '新增'}
        </button>
      </div>
    </form>
  );
}
```

---

### 5. 表格組件

**檔案：** `src/components/XxxTable.tsx`

```typescript
import type { Xxx } from '../types/xxx';
import { SortableHeader } from './SortableHeader';
import type { SortOrder } from './SortableHeader';
import './XxxTable.css';

interface XxxTableProps {
  /** 資料清單 */
  items: Xxx[];
  /** 編輯回調 */
  onEdit: (item: Xxx) => void;
  /** 刪除回調 */
  onDelete: (id: string) => void;
  /** 載入中狀態 */
  isLoading?: boolean;
  /** 當前排序欄位 */
  sortBy?: string | null;
  /** 當前排序方向 */
  sortOrder?: SortOrder;
  /** 排序變更回調 */
  onSort?: (key: string, order: SortOrder) => void;
}

/**
 * XXX 列表表格組件
 * NOTE: 展示資料並提供編輯、刪除操作
 */
export function XxxTable({
  items,
  onEdit,
  onDelete,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
}: XxxTableProps) {
  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>尚無資料</h3>
        <p>請使用上方表單新增資料</p>
      </div>
    );
  }

  const handleDelete = (item: Xxx) => {
    const name = item.name || item.id;
    if (window.confirm(`確定要刪除「${name}」嗎？`)) {
      onDelete(item.id);
    }
  };

  const handleSort = onSort || (() => {});

  return (
    <div className="table-container">
      <table className="xxx-table">
        <thead>
          <tr>
            <SortableHeader
              label="編號"
              sortKey="id"
              currentSortBy={sortBy || null}
              currentSortOrder={sortOrder || null}
              onSort={handleSort}
            />
            <SortableHeader
              label="名稱"
              sortKey="name"
              currentSortBy={sortBy || null}
              currentSortOrder={sortOrder || null}
              onSort={handleSort}
            />
            <th>描述</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} style={{ animationDelay: `${index * 0.03}s` }}>
              <td data-label="編號">
                <code className="item-id">{item.id}</code>
              </td>
              <td data-label="名稱">{item.name || '-'}</td>
              <td data-label="描述">{item.description || '-'}</td>
              <td data-label="狀態">
                <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                  {item.is_active ? '啟用' : '停用'}
                </span>
              </td>
              <td data-label="操作">
                <div className="action-buttons">
                  <button className="btn-icon btn-edit" onClick={() => onEdit(item)} title="編輯">
                    ✏️
                  </button>
                  <button className="btn-icon btn-delete" onClick={() => handleDelete(item)} title="刪除">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 6. 頁面組件

**檔案：** `src/pages/XxxPage.tsx`

```typescript
import { useCallback, useMemo } from 'react';
import { useXxx } from '../hooks/useXxx';
import { useExport, type ExportConfig } from '../hooks/useExport';
import { XxxForm } from '../components/XxxForm';
import { XxxTable } from '../components/XxxTable';
import { PdfPreview } from '../components/PdfPreview';
import { ExportDropdown, type ExportFormat } from '../components/ExportDropdown';
import { Pagination } from '../components/Pagination';
import type { XxxFormData, Xxx } from '../types/xxx';
import './XxxPage.css';

/**
 * XXX 管理頁面
 * NOTE: 整合所有組件，提供完整的 CRUD 和匯出功能
 */
export function XxxPage() {
  const {
    items,
    searchTerm,
    setSearchTerm,
    editingItem,
    addItem,
    updateItem,
    deleteItem,
    startEdit,
    cancelEdit,
    refresh,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    sortBy,
    sortOrder,
    handleSort,
  } = useXxx();

  const {
    isPreviewOpen,
    pdfDataUrl,
    isGenerating,
    previewPdf,
    downloadPdf,
    downloadCsv,
    downloadXlsx,
    closePreview,
  } = useExport();

  /**
   * 匯出欄位配置
   */
  const exportConfig: ExportConfig = useMemo(() => ({
    filename: 'xxx_list',
    title: 'XXX 清單',
    columns: [
      { key: 'id', title: '編號', width: 25 },
      { key: 'name', title: '名稱', width: 40 },
      { key: 'description', title: '描述', width: 60 },
      {
        key: 'is_active',
        title: '狀態',
        width: 20,
        format: (value) => value ? '啟用' : '停用'
      },
    ],
  }), []);

  /**
   * 處理表單提交
   */
  const handleFormSubmit = async (data: XxxFormData & { id: string }) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, data);
      } else {
        await addItem(data);
      }
    } catch (e) {
      console.error('表單提交失敗:', e);
    }
  };

  /**
   * 處理刪除
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
    } catch (e) {
      console.error('刪除失敗:', e);
    }
  };

  /**
   * 處理匯出
   */
  const handleExport = useCallback(async (format: ExportFormat) => {
    switch (format) {
      case 'preview-pdf':
        await previewPdf(items, exportConfig);
        break;
      case 'pdf':
        await downloadPdf(items, exportConfig);
        break;
      case 'csv':
        downloadCsv(items, exportConfig);
        break;
      case 'xlsx':
        downloadXlsx(items, exportConfig);
        break;
    }
  }, [items, exportConfig, previewPdf, downloadPdf, downloadCsv, downloadXlsx]);

  return (
    <div className="xxx-page">
      {/* 頁首 */}
      <header className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>📋 XXX 管理</h1>
            <p className="header-subtitle">XXX Management</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={refresh} disabled={isLoading}>
              🔄 重新載入
            </button>
            <ExportDropdown
              onExport={handleExport}
              isGenerating={isGenerating}
              disabled={items.length === 0}
            />
          </div>
        </div>
      </header>

      {/* 錯誤提示 */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => refresh()}>重試</button>
        </div>
      )}

      {/* 主要內容 */}
      <main className="page-main">
        <div className="container">
          {/* 表單區 */}
          <section className="section">
            <XxxForm
              editingItem={editingItem}
              onSubmit={handleFormSubmit}
              onCancel={cancelEdit}
            />
          </section>

          {/* 搜尋區 */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                資料清單
                <span className="badge-count">{totalCount}</span>
              </h2>
            </div>
            <div className="search-bar">
              <input
                type="text"
                placeholder="搜尋..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </section>

          {/* 列表區 */}
          <section className="section">
            <XxxTable
              items={items}
              onEdit={startEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            {!isLoading && items.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </section>
        </div>
      </main>

      {/* PDF 預覽 */}
      <PdfPreview
        isOpen={isPreviewOpen}
        pdfDataUrl={pdfDataUrl}
        onClose={closePreview}
        onDownload={() => downloadPdf(items, exportConfig)}
      />
    </div>
  );
}
```

---

### 7. 後端 Pydantic 模型

**檔案：** `server/models.py` （新增以下內容）

```python
# ============================================
# Xxx 模型
# ============================================

class XxxBase(BaseModel):
    """
    Xxx 基礎資料模型
    """
    name: Optional[str] = Field(None, max_length=100, description="名稱")
    description: Optional[str] = Field(None, max_length=255, description="描述")
    is_active: Optional[bool] = Field(True, description="是否啟用")
    remark: Optional[str] = Field(None, max_length=255, description="備註")


class XxxCreate(XxxBase):
    """
    新增時使用的模型
    """
    id: str = Field(..., max_length=20, description="編號")


class XxxUpdate(XxxBase):
    """
    更新時使用的模型（所有欄位皆為可選）
    """
    pass


class Xxx(XxxBase):
    """
    完整資料模型（包含主鍵）
    """
    id: str = Field(..., max_length=20, description="編號")

    class Config:
        from_attributes = True
```

---

### 8. 後端 API 端點

**檔案：** `server/main.py` （新增以下內容）

```python
# ============================================
# Xxx API 端點
# ============================================

@app.get("/api/xxx")
def get_xxx_list(
    search: Optional[str] = Query(None, description="搜尋關鍵字"),
    is_active: Optional[bool] = Query(None, description="啟用狀態篩選"),
    page: int = Query(1, ge=1, description="頁碼"),
    page_size: int = Query(20, ge=1, le=100, description="每頁筆數"),
    sort_by: Optional[str] = Query(None, description="排序欄位"),
    sort_order: Optional[str] = Query("asc", description="排序方向 asc/desc"),
):
    """
    取得 Xxx 清單
    支援分頁、排序和篩選
    """
    try:
        with get_cursor() as cursor:
            base_sql = "SELECT * FROM xxx WHERE 1=1"
            params = []

            if search:
                base_sql += " AND (name ILIKE %s OR id ILIKE %s)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])

            if is_active is not None:
                base_sql += " AND is_active = %s"
                params.append(is_active)

            # 計算總筆數
            count_sql = f"SELECT COUNT(*) as total FROM ({base_sql}) as subquery"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']

            # 排序
            allowed_sort_fields = ['id', 'name', 'is_active']
            if sort_by and sort_by in allowed_sort_fields:
                order_direction = 'ASC' if sort_order == 'asc' else 'DESC'
                base_sql += f" ORDER BY {sort_by} {order_direction}"
            else:
                base_sql += " ORDER BY id"

            # 分頁
            offset = (page - 1) * page_size
            base_sql += " LIMIT %s OFFSET %s"
            params.extend([page_size, offset])

            cursor.execute(base_sql, params)
            rows = cursor.fetchall()

            total_pages = (total + page_size - 1) // page_size

            return {
                "items": [dict(row) for row in rows],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            }

    except Exception as e:
        logger.error(f"取得 Xxx 清單失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/xxx/{id}", response_model=Xxx)
def get_xxx(id: str):
    """
    根據 ID 取得單筆資料
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("SELECT * FROM xxx WHERE id = %s", (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="資料不存在")
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取得資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/xxx", response_model=Xxx)
def create_xxx(data: XxxCreate):
    """
    新增資料
    """
    try:
        with get_cursor() as cursor:
            # 檢查是否已存在
            cursor.execute("SELECT id FROM xxx WHERE id = %s", (data.id,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="編號已存在")

            # 取得非 None 的欄位
            data_dict = data.model_dump(exclude_none=True)
            columns = ", ".join(data_dict.keys())
            placeholders = ", ".join(["%s"] * len(data_dict))
            values = list(data_dict.values())

            sql = f"INSERT INTO xxx ({columns}) VALUES ({placeholders}) RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"新增資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/xxx/{id}", response_model=Xxx)
def update_xxx(id: str, data: XxxUpdate):
    """
    更新資料
    """
    try:
        with get_cursor() as cursor:
            # 檢查是否存在
            cursor.execute("SELECT id FROM xxx WHERE id = %s", (id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="資料不存在")

            # 取得非 None 的欄位進行更新
            data_dict = data.model_dump(exclude_none=True)
            if not data_dict:
                raise HTTPException(status_code=400, detail="沒有要更新的欄位")

            set_clause = ", ".join([f"{k} = %s" for k in data_dict.keys()])
            values = list(data_dict.values()) + [id]

            sql = f"UPDATE xxx SET {set_clause} WHERE id = %s RETURNING *"
            cursor.execute(sql, values)
            row = cursor.fetchone()
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/xxx/{id}")
def delete_xxx(id: str):
    """
    刪除資料
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("DELETE FROM xxx WHERE id = %s RETURNING id", (id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="資料不存在")
            return {"message": "刪除成功", "id": id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除資料失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 共用組件

本系統已提供以下共用組件，可直接使用：

| 組件 | 路徑 | 說明 |
|------|------|------|
| `Pagination` | `components/Pagination.tsx` | 分頁控制組件 |
| `SortableHeader` | `components/SortableHeader.tsx` | 可排序表頭 |
| `ExportDropdown` | `components/ExportDropdown.tsx` | 匯出下拉選單 |
| `PdfPreview` | `components/PdfPreview.tsx` | PDF 預覽模態框 |
| `useExport` | `hooks/useExport.ts` | 匯出功能 Hook |

---

## 樣式規範

### CSS 類別命名

- 使用 BEM 命名規範：`block__element--modifier`
- 頁面級 CSS 類別以頁面名稱開頭：`.xxx-page`
- 組件級 CSS 類別以組件名稱開頭：`.xxx-form`, `.xxx-table`

### 共用 CSS 變數

```css
:root {
  --primary-color: #3b82f6;
  --success-color: #22c55e;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --border-radius: 8px;
  --transition-fast: 0.15s ease;
}
```

---

## AI 提示詞範本

以下為請 AI 協助開發新功能時的提示詞範本：

### 新增完整 CRUD 作業

```
請依照 docs/FEATURE_TEMPLATE.md 的開發範本，為「[功能名稱]」建立完整的 CRUD 作業。

資料表名稱：[table_name]
主鍵欄位：[primary_key]
資料表結構：
- [欄位1]: [類型] [說明]
- [欄位2]: [類型] [說明]
...

需求說明：
1. [具體需求1]
2. [具體需求2]
...

請依序建立以下檔案：
1. src/types/[name].ts - 型別定義
2. src/services/[name]Api.ts - API 服務
3. src/hooks/use[Name].ts - 自訂 Hook
4. src/components/[Name]Form.tsx - 表單組件
5. src/components/[Name]Table.tsx - 表格組件
6. src/pages/[Name]Page.tsx - 頁面組件
7. server/models.py - 新增 Pydantic 模型
8. server/main.py - 新增 API 端點
9. src/router.tsx - 新增路由
10. src/components/Layout.tsx - 新增側邊選單項目
```

### 新增篩選功能

```
請為「[功能名稱]」頁面新增以下篩選條件：
1. [篩選欄位1] - [篩選類型：下拉/文字/日期範圍]
2. [篩選欄位2] - [篩選類型]
...

請更新以下檔案：
1. src/services/[name]Api.ts - 新增篩選參數
2. src/hooks/use[Name].ts - 新增篩選狀態
3. src/pages/[Name]Page.tsx - 新增篩選 UI
4. server/main.py - 更新 API 端點支援篩選
```

### 新增匯入功能

```
請為「[功能名稱]」頁面新增 Excel 匯入功能。

匯入欄位對照：
- Excel 欄位 A -> 資料表欄位 field1
- Excel 欄位 B -> 資料表欄位 field2
...

匯入模式：
1. 全部刪除後新增
2. 僅新增不存在
3. 存在更新，不存在新增

請參考 ProjectPage 的匯入實作。
```

---

## 注意事項

1. **CSRF Token**：所有寫入操作都需要 CSRF Token，已在 `httpClient.ts` 中統一處理
2. **錯誤處理**：API 錯誤會拋出到 Hook 層，在 Hook 中設定 error 狀態
3. **載入狀態**：使用 isLoading 狀態控制載入中的 UI 顯示
4. **分頁重置**：搜尋/篩選條件變更時，需重置頁碼為 1
5. **Debounce**：搜尋輸入使用 300ms debounce 避免過多 API 請求
6. **編輯模式**：點擊編輯時自動捲動到頁面頂部，讓使用者看到表單
