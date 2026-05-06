/**
 * 假日檔維護頁面
 * NOTE: 提供假日與補班日記錄的 CRUD 管理
 */
import { useState, useEffect, useCallback } from 'react';
import { useHoliday } from '../hooks/useHoliday';
import { Pagination } from '../components/Pagination';
import { SortableHeader } from '../components/SortableHeader';
import type { HolidayFormData } from '../services/holidayApi';
import './HolidayPage.css';

/** 類型選項 */
const TYPE_OPTIONS = [
    { value: 'true', label: '例假日' },
    { value: 'false', label: '補班日' },
];

/**
 * 格式化日期：YYYYMMDD -> YYYY-MM-DD
 */
function formatDateDisplay(dateStr: string): string {
    return dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
}

/**
 * 產生年份選項（從 2024 到當前年份 +1）
 */
function getYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let y = currentYear + 1; y >= 2024; y--) {
        years.push(String(y));
    }
    return years;
}

/**
 * 假日檔維護頁面元件
 */
export function HolidayPage() {
    const {
        records,
        editingRecord,
        isLoading,
        error,
        yearFilter,
        setYearFilter,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalCount,
        sortBy,
        sortOrder,
        handleSort,
        addRecord,
        updateRecord,
        deleteRecord,
        startEdit,
        cancelEdit,
    } = useHoliday();

    const yearOptions = getYearOptions();

    // Modal 開關
    const [isFormOpen, setIsFormOpen] = useState(false);

    const emptyFormData: HolidayFormData = {
        date: '',
        is_holiday: true,
        description: '',
    };

    const [formData, setFormData] = useState<HolidayFormData>(emptyFormData);

    // 編輯模式下填充表單，並自動開啟 Modal
    useEffect(() => {
        if (editingRecord) {
            setFormData({
                date: editingRecord.date,
                is_holiday: editingRecord.is_holiday,
                description: editingRecord.description,
            });
            setIsFormOpen(true);
        }
    }, [editingRecord]);

    /** 開啟新增 Modal */
    const handleOpenAdd = useCallback(() => {
        cancelEdit();
        setFormData(emptyFormData);
        setIsFormOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cancelEdit]);

    /** 關閉 Modal */
    const handleCloseForm = useCallback(() => {
        setIsFormOpen(false);
        cancelEdit();
        setFormData(emptyFormData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cancelEdit]);

    /**
     * 處理表單提交
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // NOTE: 日期欄位轉換 YYYY-MM-DD -> YYYYMMDD
            const submitData = {
                ...formData,
                date: formData.date.replace(/-/g, ''),
            };

            if (editingRecord) {
                await updateRecord(editingRecord.date, {
                    is_holiday: submitData.is_holiday,
                    description: submitData.description,
                });
            } else {
                await addRecord(submitData);
            }
            handleCloseForm();
        } catch (e) {
            console.error('提交失敗:', e);
        }
    };

    /**
     * 處理刪除
     */
    const handleDelete = async (record: { date: string; description: string }) => {
        if (window.confirm(`確定要刪除 ${formatDateDisplay(record.date)} (${record.description}) 嗎？`)) {
            try {
                await deleteRecord(record.date);
            } catch (e) {
                console.error('刪除失敗:', e);
            }
        }
    };

    return (
        <div className="holiday-page">
            <header className="page-header">
                <h1>🗓️ 假日維護</h1>
                <div className="header-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenAdd}
                    >
                        ＋ 新增假日記錄
                    </button>
                </div>
            </header>

            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                </div>
            )}

            <div className="page-content">
                {/* 篩選 */}
                <section className="filter-section">
                    <div className="filters">
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                        >
                            <option value="">所有年份</option>
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y} 年</option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* 列表 */}
                <section className="table-section">
                    <h2>假日記錄清單 ({totalCount})</h2>
                    {isLoading ? (
                        <div className="loading">載入中...</div>
                    ) : records.length === 0 ? (
                        <div className="empty">尚無假日記錄</div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="holiday-table">
                                    <thead>
                                        <tr>
                                            <SortableHeader
                                                label="日期"
                                                sortKey="date"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="類型"
                                                sortKey="is_holiday"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="描述"
                                                sortKey="description"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((record) => (
                                            <tr key={record.date}>
                                                <td data-label="日期">
                                                    {formatDateDisplay(record.date)}
                                                </td>
                                                <td data-label="類型">
                                                    <span className={`badge ${record.is_holiday ? 'badge-holiday' : 'badge-makeup'}`}>
                                                        {record.is_holiday ? '例假日' : '補班日'}
                                                    </span>
                                                </td>
                                                <td data-label="描述">
                                                    {record.description}
                                                </td>
                                                <td data-label="操作">
                                                    <div className="action-buttons">
                                                        <button className="btn-icon btn-edit" onClick={() => startEdit(record)}>
                                                            ✏️
                                                        </button>
                                                        <button className="btn-icon btn-delete" onClick={() => handleDelete(record)}>
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalCount={totalCount}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setPageSize}
                            />
                        </>
                    )}
                </section>
            </div>

            {/* 假日表單 Modal（新增/編輯） */}
            {isFormOpen && (
                <div
                    className="hld-form-modal-overlay"
                    onClick={handleCloseForm}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="hld-form-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="hld-form-modal-header">
                            <h2 className="hld-form-modal-title">
                                {editingRecord ? '編輯假日記錄' : '新增假日記錄'}
                            </h2>
                            <button
                                type="button"
                                className="hld-form-modal-close"
                                onClick={handleCloseForm}
                                aria-label="關閉"
                            >
                                ×
                            </button>
                        </div>
                        <div className="hld-form-modal-body">
                            <form className="holiday-form" onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>日期 *</label>
                                        <input
                                            type="date"
                                            value={formData.date.includes('-')
                                                ? formData.date
                                                : formatDateDisplay(formData.date)}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            disabled={!!editingRecord}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>類型 *</label>
                                        <select
                                            value={String(formData.is_holiday)}
                                            onChange={(e) => setFormData({ ...formData, is_holiday: e.target.value === 'true' })}
                                            required
                                        >
                                            {TYPE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>描述 *</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="例：元旦、春節、補班（春節調整）"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
                                        取消
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingRecord ? '更新' : '新增'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
