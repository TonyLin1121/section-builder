import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCodeTable } from '../hooks/useCodeTable';
import { useExport, type ExportConfig } from '../hooks/useExport';
import { Pagination } from '../components/Pagination';
import { SortableHeader } from '../components/SortableHeader';
import { ExportDropdown, type ExportFormat } from '../components/ExportDropdown';
import { PdfPreview } from '../components/PdfPreview';
import type { CodeTableFormData } from '../types/codeTable';
import { USED_MARK_OPTIONS } from '../types/codeTable';
import './CodeTablePage.css';

/**
 * 參數檔維護頁面
 */
export function CodeTablePage() {
    const {
        records,
        categories,
        editingRecord,
        isLoading,
        error,
        codeCodeFilter,
        setCodeCodeFilter,
        usedMarkFilter,
        setUsedMarkFilter,
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
    } = useCodeTable();

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
     * 參數檔匯出欄位配置
     */
    const codeTableExportConfig: ExportConfig = useMemo(() => ({
        filename: 'code_table',
        title: '參數檔清單',
        columns: [
            { key: 'code_code', title: '主分類代碼', width: 25 },
            { key: 'code_subcode', title: '子分類代碼', width: 25 },
            { key: 'code_subname', title: '子分類名稱', width: 35 },
            { key: 'code_content', title: '內容說明', width: 60 },
            {
                key: 'used_mark',
                title: '使用狀態',
                width: 20,
                format: (value) => value === '1' ? '使用中' : '停用'
            },
            {
                key: 'upddate',
                title: '更新日期',
                width: 25,
                format: (value) => {
                    const dateStr = String(value || '');
                    return dateStr ? dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '-';
                }
            },
            { key: 'remark', title: '備註', width: 40 },
        ],
    }), []);

    /**
     * 處理匯出
     */
    const handleExport = useCallback(async (format: ExportFormat) => {
        switch (format) {
            case 'preview-pdf':
                await previewPdf(records, codeTableExportConfig);
                break;
            case 'pdf':
                await downloadPdf(records, codeTableExportConfig);
                break;
            case 'csv':
                downloadCsv(records, codeTableExportConfig);
                break;
            case 'xlsx':
                downloadXlsx(records, codeTableExportConfig);
                break;
        }
    }, [records, codeTableExportConfig, previewPdf, downloadPdf, downloadCsv, downloadXlsx]);

    // 表單 Modal 開關
    const [isFormOpen, setIsFormOpen] = useState(false);

    // 空白表單預設值
    const emptyFormData: CodeTableFormData = {
        code_code: '',
        code_subcode: '',
        code_subname: '',
        code_content: '',
        sysmark: '0',
        used_mark: '1',
        remark: '',
    };

    const [formData, setFormData] = useState<CodeTableFormData>(emptyFormData);

    // 編輯模式下填充表單，並自動開啟 Modal
    useEffect(() => {
        if (editingRecord) {
            setFormData(editingRecord);
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

    /** 關閉 Modal 並清空編輯狀態 */
    const handleCloseForm = useCallback(() => {
        setIsFormOpen(false);
        cancelEdit();
        setFormData(emptyFormData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cancelEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRecord) {
                await updateRecord(
                    editingRecord.code_code,
                    editingRecord.code_subcode,
                    formData
                );
            } else {
                await addRecord(formData);
            }
            handleCloseForm();
        } catch (e) {
            console.error('提交失敗:', e);
        }
    };

    const handleDelete = async (record: any) => {
        if (window.confirm(`確定要刪除參數「${record.code_code}-${record.code_subcode}」嗎？`)) {
            try {
                await deleteRecord(record.code_code, record.code_subcode);
            } catch (e) {
                console.error('刪除失敗:', e);
            }
        }
    };

    return (
        <div className="codetable-page">
            <header className="page-header">
                <h1>⚙️ 參數檔維護</h1>
                <div className="header-actions">
                    <ExportDropdown
                        onExport={handleExport}
                        isGenerating={isGenerating}
                        disabled={records.length === 0}
                    />
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenAdd}
                    >
                        ＋ 新增參數
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
                            value={codeCodeFilter}
                            onChange={(e) => setCodeCodeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">所有分類</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            value={usedMarkFilter}
                            onChange={(e) => setUsedMarkFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">所有狀態</option>
                            {USED_MARK_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* 列表 */}
                <section className="table-section">
                    <h2>參數清單 ({totalCount})</h2>
                    {isLoading ? (
                        <div className="loading">載入中...</div>
                    ) : records.length === 0 ? (
                        <div className="empty">尚無參數資料</div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="codetable-table">
                                    <thead>
                                        <tr>
                                            <SortableHeader
                                                label="主分類"
                                                sortKey="code_code"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="子分類"
                                                sortKey="code_subcode"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="名稱"
                                                sortKey="code_subname"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <th className="hide-mobile">內容說明</th>
                                            <SortableHeader
                                                label="狀態"
                                                sortKey="used_mark"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="更新日期"
                                                sortKey="upddate"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                                className="hide-tablet"
                                            />
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((record) => (
                                            <tr key={`${record.code_code}-${record.code_subcode}`}>
                                                <td data-label="主分類">
                                                    <code className="code-badge">{record.code_code}</code>
                                                </td>
                                                <td data-label="子分類">
                                                    <code className="code-badge">{record.code_subcode}</code>
                                                </td>
                                                <td data-label="名稱">
                                                    <span className="code-name">{record.code_subname || '-'}</span>
                                                </td>
                                                <td data-label="內容說明" className="hide-mobile">
                                                    {record.code_content || '-'}
                                                </td>
                                                <td data-label="狀態">
                                                    <span className={`status-badge ${record.used_mark === '1' ? 'active' : 'inactive'}`}>
                                                        {record.used_mark === '1' ? '使用中' : '停用'}
                                                    </span>
                                                </td>
                                                <td data-label="更新日期" className="hide-tablet">
                                                    {record.upddate ? record.upddate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '-'}
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

            {/* 參數表單 Modal（新增/編輯） */}
            {isFormOpen && (
                <div
                    className="cdt-form-modal-overlay"
                    onClick={handleCloseForm}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="cdt-form-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="cdt-form-modal-header">
                            <h2 className="cdt-form-modal-title">
                                {editingRecord ? '編輯參數' : '新增參數'}
                            </h2>
                            <button
                                type="button"
                                className="cdt-form-modal-close"
                                onClick={handleCloseForm}
                                aria-label="關閉"
                            >
                                ×
                            </button>
                        </div>
                        <div className="cdt-form-modal-body">
                            <form className="codetable-form" onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>主分類代碼 *</label>
                                        <input
                                            type="text"
                                            value={formData.code_code}
                                            onChange={(e) => setFormData({ ...formData, code_code: e.target.value })}
                                            disabled={!!editingRecord}
                                            maxLength={4}
                                            placeholder="例: 0001"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>子分類代碼 *</label>
                                        <input
                                            type="text"
                                            value={formData.code_subcode}
                                            onChange={(e) => setFormData({ ...formData, code_subcode: e.target.value })}
                                            disabled={!!editingRecord}
                                            maxLength={4}
                                            placeholder="例: 01"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>子分類名稱 *</label>
                                        <input
                                            type="text"
                                            value={formData.code_subname || ''}
                                            onChange={(e) => setFormData({ ...formData, code_subname: e.target.value })}
                                            maxLength={20}
                                            placeholder="例: 特休"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>使用狀態</label>
                                        <select
                                            value={formData.used_mark || '1'}
                                            onChange={(e) => setFormData({ ...formData, used_mark: e.target.value })}
                                        >
                                            {USED_MARK_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group form-group-full">
                                        <label>內容說明</label>
                                        <input
                                            type="text"
                                            value={formData.code_content || ''}
                                            onChange={(e) => setFormData({ ...formData, code_content: e.target.value })}
                                            maxLength={100}
                                            placeholder="詳細說明"
                                        />
                                    </div>

                                    <div className="form-group form-group-full">
                                        <label>備註</label>
                                        <textarea
                                            value={formData.remark || ''}
                                            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                            rows={2}
                                            maxLength={30}
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

            {/* PDF 預覽模態框 */}
            <PdfPreview
                isOpen={isPreviewOpen}
                pdfDataUrl={pdfDataUrl}
                onClose={closePreview}
                onDownload={() => downloadPdf(records, codeTableExportConfig)}
            />
        </div>
    );
}
