/**
 * 專案管理頁面
 */
import { useState, useCallback, useMemo } from 'react';
import { useProject } from '../hooks/useProject';
import { useExport, type ExportConfig } from '../hooks/useExport';
import { Pagination } from '../components/Pagination';
import { SortableHeader } from '../components/SortableHeader';
import { ExportDropdown, type ExportFormat } from '../components/ExportDropdown';
import { PdfPreview } from '../components/PdfPreview';
import { ImportDialog, type ImportMode, type ImportResult } from '../components/ImportDialog';
import type { ProjectFormData } from '../services/projectApi';
import './ProjectPage.css';

/**
 * 專案狀態選項
 * NOTE: 與資料庫實際存放的值一致
 */
const PROJECT_STATUSES = [
    { value: '', label: '全部狀態' },
    { value: '開發中', label: '開發中' },
    { value: '保固中', label: '保固中' },
    { value: '已結案', label: '已結案' },
];

/**
 * 專案管理頁面
 */
export function ProjectPage() {
    const {
        records,
        editingRecord,
        isLoading,
        error,
        projectIdFilter,
        setProjectIdFilter,
        projectNameFilter,
        setProjectNameFilter,
        customerNameFilter,
        setCustomerNameFilter,
        statusFilter,
        setStatusFilter,
        managerFilter,
        setManagerFilter,
        dateFromFilter,
        setDateFromFilter,
        dateToFilter,
        setDateToFilter,
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
        importRecords,
        startEdit,
        cancelEdit,
    } = useProject();

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

    // 匯入對話框
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    // 表單 Modal 開關
    const [isFormOpen, setIsFormOpen] = useState(false);

    // 空白表單預設值
    const emptyFormData: ProjectFormData = {
        project_id: '',
        so_no: '',
        project_name: '',
        customer_name: '',
        project_manager: '',
        project_status: '',
        project_plan_sdate: '',
        project_plan_edate: '',
        project_amt: 0,
    };

    // 表單狀態
    const [formData, setFormData] = useState<ProjectFormData>(emptyFormData);

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    /** 開啟新增 Modal */
    const handleOpenAdd = useCallback(() => {
        cancelEdit();
        setFormData(emptyFormData);
        setFormErrors({});
        setIsFormOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cancelEdit]);

    /** 關閉 Modal 並清空編輯狀態 */
    const handleCloseForm = useCallback(() => {
        setIsFormOpen(false);
        cancelEdit();
        setFormData(emptyFormData);
        setFormErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cancelEdit]);

    /**
     * 匯出配置
     */
    const exportConfig: ExportConfig = useMemo(() => ({
        filename: 'projects',
        title: '專案清單',
        columns: [
            { key: 'project_id', title: '專案代號', width: 20 },
            { key: 'project_name', title: '專案名稱', width: 40 },
            { key: 'customer_name', title: '客戶名稱', width: 30 },
            { key: 'project_manager', title: '專案負責人', width: 20 },
            { key: 'project_status', title: '專案狀態', width: 15 },
            { key: 'project_amt', title: '專案金額', width: 20, format: (v) => v ? Number(v).toLocaleString() : '-' },
            { key: 'project_plan_sdate', title: '計畫開始日', width: 20 },
            { key: 'project_plan_edate', title: '計畫結束日', width: 20 },
            { key: 'actual_progress', title: '實際進度', width: 15, format: (v) => v !== undefined ? `${v}%` : '-' },
        ],
    }), []);

    /**
     * 處理匯出
     */
    const handleExport = useCallback(async (format: ExportFormat) => {
        switch (format) {
            case 'preview-pdf':
                await previewPdf(records, exportConfig);
                break;
            case 'pdf':
                await downloadPdf(records, exportConfig);
                break;
            case 'csv':
                downloadCsv(records, exportConfig);
                break;
            case 'xlsx':
                downloadXlsx(records, exportConfig);
                break;
        }
    }, [records, exportConfig, previewPdf, downloadPdf, downloadCsv, downloadXlsx]);

    /**
     * 處理匯入
     */
    const handleImport = useCallback(async (file: File, mode: ImportMode): Promise<ImportResult> => {
        return importRecords(file, mode);
    }, [importRecords]);

    /**
     * 表單驗證
     */
    const validateForm = useCallback((): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.project_id?.trim()) {
            errors.project_id = '請輸入專案代號';
        } else if (formData.project_id.length > 7) {
            errors.project_id = '專案代號最多 7 個字元';
        }

        if (!formData.project_name?.trim()) {
            errors.project_name = '請輸入專案名稱';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    /**
     * 處理表單提交
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            if (editingRecord) {
                await updateRecord(editingRecord.project_id, formData);
            } else {
                await addRecord(formData);
            }
            handleCloseForm();
        } catch {
            // 錯誤已被 Hook 處理
        }
    };

    /**
     * 處理刪除
     */
    const handleDelete = async (projectId: string, projectName: string) => {
        if (window.confirm(`確定要刪除專案「${projectName || projectId}」嗎？`)) {
            try {
                await deleteRecord(projectId);
            } catch {
                // 錯誤已被 Hook 處理
            }
        }
    };

    /**
     * 開始編輯（從表格觸發 → 帶資料並開啟 Modal）
     */
    const handleStartEdit = (record: any) => {
        setFormData({
            project_id: record.project_id,
            so_no: record.so_no || '',
            project_name: record.project_name || '',
            customer_name: record.customer_name || '',
            project_manager: record.project_manager || '',
            project_status: record.project_status || '',
            project_plan_sdate: record.project_plan_sdate || '',
            project_plan_edate: record.project_plan_edate || '',
            project_amt: record.project_amt || 0,
        });
        setFormErrors({});
        startEdit(record);
        setIsFormOpen(true);
    };

    /**
     * 格式化金額
     */
    const formatAmount = (value: number | undefined) => {
        if (!value) return '-';
        return new Intl.NumberFormat('zh-TW').format(value);
    };

    /**
     * 格式化進度
     */
    const formatProgress = (value: number | undefined) => {
        if (value === undefined || value === null) return '-';
        return `${value}%`;
    };

    return (
        <div className="project-page">
            <header className="page-header">
                <h1>📊 專案管理</h1>
                <div className="header-actions">
                    <button
                        className="btn btn-import"
                        onClick={() => setIsImportDialogOpen(true)}
                    >
                        📥 匯入 Excel
                    </button>
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
                        ＋ 新增專案
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
                        <input
                            type="text"
                            placeholder="專案代號"
                            value={projectIdFilter}
                            onChange={(e) => setProjectIdFilter(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="專案名稱"
                            value={projectNameFilter}
                            onChange={(e) => setProjectNameFilter(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="客戶名稱"
                            value={customerNameFilter}
                            onChange={(e) => setCustomerNameFilter(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="負責人"
                            value={managerFilter}
                            onChange={(e) => setManagerFilter(e.target.value)}
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            {PROJECT_STATUSES.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filters filters-row-2">
                        <div className="date-filter-group">
                            <label>開始日：</label>
                            <input
                                type="date"
                                value={dateFromFilter}
                                onChange={(e) => setDateFromFilter(e.target.value)}
                            />
                        </div>
                        <div className="date-filter-group">
                            <label>結束日：</label>
                            <input
                                type="date"
                                value={dateToFilter}
                                onChange={(e) => setDateToFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* 列表 */}
                <section className="table-section">
                    <h2>專案清單 ({totalCount})</h2>
                    {isLoading ? (
                        <div className="loading">載入中...</div>
                    ) : records.length === 0 ? (
                        <div className="empty">尚無專案資料</div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="project-table">
                                    <thead>
                                        <tr>
                                            <SortableHeader
                                                label="專案代號"
                                                sortKey="project_id"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="專案名稱"
                                                sortKey="project_name"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="客戶"
                                                sortKey="customer_name"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="負責人"
                                                sortKey="project_manager"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <th>狀態</th>
                                            <SortableHeader
                                                label="金額"
                                                sortKey="project_amt"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="進度"
                                                sortKey="actual_progress"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((record) => (
                                            <tr key={record.project_id}>
                                                <td data-label="專案代號">
                                                    <span className="project-id">{record.project_id}</span>
                                                </td>
                                                <td data-label="專案名稱">
                                                    <span className="project-name">{record.project_name || '-'}</span>
                                                </td>
                                                <td data-label="客戶">{record.customer_name || '-'}</td>
                                                <td data-label="負責人">{record.project_manager || '-'}</td>
                                                <td data-label="狀態">
                                                    <span className={`status-badge status-${record.project_status?.replace(/\s/g, '') || 'unknown'}`}>
                                                        {record.project_status || '-'}
                                                    </span>
                                                </td>
                                                <td data-label="金額" className="amount-cell">
                                                    {formatAmount(record.project_amt)}
                                                </td>
                                                <td data-label="進度" className="progress-cell">
                                                    {formatProgress(record.actual_progress)}
                                                </td>
                                                <td data-label="操作">
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn-icon btn-edit"
                                                            onClick={() => handleStartEdit(record)}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn-icon btn-delete"
                                                            onClick={() => handleDelete(record.project_id, record.project_name || '')}
                                                        >
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

            {/* 專案表單 Modal（新增/編輯） */}
            {isFormOpen && (
                <div
                    className="prj-form-modal-overlay"
                    onClick={handleCloseForm}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="prj-form-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="prj-form-modal-header">
                            <h2 className="prj-form-modal-title">
                                {editingRecord ? '編輯專案' : '新增專案'}
                            </h2>
                            <button
                                type="button"
                                className="prj-form-modal-close"
                                onClick={handleCloseForm}
                                aria-label="關閉"
                            >
                                ×
                            </button>
                        </div>
                        <div className="prj-form-modal-body">
                            <form className="project-form" onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>專案代號 *</label>
                                        <input
                                            type="text"
                                            name="project_id"
                                            maxLength={7}
                                            placeholder="例: P001001"
                                            value={formData.project_id}
                                            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                            disabled={!!editingRecord}
                                            required
                                        />
                                        {formErrors.project_id && (
                                            <span className="form-error">{formErrors.project_id}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>合約代號</label>
                                        <input
                                            type="text"
                                            name="so_no"
                                            maxLength={7}
                                            placeholder="例: C001001"
                                            value={formData.so_no || ''}
                                            onChange={(e) => setFormData({ ...formData, so_no: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group form-group-wide">
                                        <label>專案名稱 *</label>
                                        <input
                                            type="text"
                                            maxLength={100}
                                            placeholder="輸入專案名稱"
                                            value={formData.project_name || ''}
                                            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                            required
                                        />
                                        {formErrors.project_name && (
                                            <span className="form-error">{formErrors.project_name}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>客戶名稱</label>
                                        <input
                                            type="text"
                                            maxLength={100}
                                            placeholder="輸入客戶名稱"
                                            value={formData.customer_name || ''}
                                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>專案負責人</label>
                                        <input
                                            type="text"
                                            maxLength={20}
                                            placeholder="輸入負責人"
                                            value={formData.project_manager || ''}
                                            onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>專案狀態</label>
                                        <select
                                            value={formData.project_status || ''}
                                            onChange={(e) => setFormData({ ...formData, project_status: e.target.value })}
                                        >
                                            <option value="">請選擇</option>
                                            <option value="開發中">開發中</option>
                                            <option value="保固中">保固中</option>
                                            <option value="已結案">已結案</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>專案金額</label>
                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="輸入金額"
                                            value={formData.project_amt || ''}
                                            onChange={(e) => setFormData({ ...formData, project_amt: Number(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>計畫開始日</label>
                                        <input
                                            type="text"
                                            maxLength={10}
                                            placeholder="YYYY/MM/DD"
                                            value={formData.project_plan_sdate || ''}
                                            onChange={(e) => setFormData({ ...formData, project_plan_sdate: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>計畫結束日</label>
                                        <input
                                            type="text"
                                            maxLength={10}
                                            placeholder="YYYY/MM/DD"
                                            value={formData.project_plan_edate || ''}
                                            onChange={(e) => setFormData({ ...formData, project_plan_edate: e.target.value })}
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

            {/* PDF 預覽 */}
            <PdfPreview
                isOpen={isPreviewOpen}
                pdfDataUrl={pdfDataUrl}
                onClose={closePreview}
                onDownload={() => downloadPdf(records, exportConfig)}
            />

            {/* 匯入對話框 */}
            <ImportDialog
                isOpen={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
                onImport={handleImport}
                title="匯入專案資料"
            />
        </div>
    );
}
