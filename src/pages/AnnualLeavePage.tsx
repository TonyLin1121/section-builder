import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAnnualLeave } from '../hooks/useAnnualLeave';
import { useExport, type ExportConfig } from '../hooks/useExport';
import { Pagination } from '../components/Pagination';
import { SortableHeader } from '../components/SortableHeader';
import { ExportDropdown, type ExportFormat } from '../components/ExportDropdown';
import { PdfPreview } from '../components/PdfPreview';
import { EmployeeSelect } from '../components/EmployeeSelect';
import type { AnnualLeaveFormData } from '../services/annualLeaveApi';
import './AnnualLeavePage.css';

/**
 * 驗證可休天數
 * - 必須 <= 365
 * - 小數位只能是 0 或 0.5
 */
function validateDaysOfLeave(value: number): string | null {
    if (value < 0) {
        return '可休天數不可為負數';
    }
    if (value > 365) {
        return '可休天數不可超過 365 天';
    }
    const decimalPart = value % 1;
    if (decimalPart !== 0 && decimalPart !== 0.5) {
        return '可休天數的小數位僅能為 0 或 0.5';
    }
    return null;
}

/**
 * 驗證年度
 * - 必須是 4 碼數字
 * - 合理範圍：1900 ~ 當前年份 + 1
 */
function validateYear(value: string): string | null {
    if (!/^\d{4}$/.test(value)) {
        return '給假年度必須是 4 碼西元年';
    }
    const year = parseInt(value, 10);
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
        return `給假年度須介於 1900 ~ ${currentYear + 1}`;
    }
    return null;
}

/**
 * 年度休假維護頁面
 */
export function AnnualLeavePage() {
    const {
        records,
        leaveTypes,
        employees,
        editingRecord,
        isLoading,
        error,
        empNameFilter,
        setEmpNameFilter,
        yearFilter,
        setYearFilter,
        leaveTypeFilter,
        setLeaveTypeFilter,
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
        getLeaveTypeName,
    } = useAnnualLeave();

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
     * 年度休假匯出欄位配置
     */
    const annualLeaveExportConfig: ExportConfig = useMemo(() => ({
        filename: 'annual_leave_records',
        title: '年度休假清單',
        columns: [
            { key: 'emp_id', title: '員工編號', width: 25 },
            { key: 'english_name', title: '英文名', width: 25 },
            { key: 'chinese_name', title: '中文名', width: 25 },
            { key: 'year', title: '給假年度', width: 20 },
            {
                key: 'leave_type',
                title: '假別',
                width: 25,
                format: (value) => getLeaveTypeName(String(value || ''))
            },
            { key: 'days_of_leave', title: '可休天數', width: 20 },
            { key: 'remark', title: '備註', width: 40 },
        ],
    }), [getLeaveTypeName]);

    /**
     * 處理匯出
     */
    const handleExport = useCallback(async (format: ExportFormat) => {
        switch (format) {
            case 'preview-pdf':
                await previewPdf(records, annualLeaveExportConfig);
                break;
            case 'pdf':
                await downloadPdf(records, annualLeaveExportConfig);
                break;
            case 'csv':
                downloadCsv(records, annualLeaveExportConfig);
                break;
            case 'xlsx':
                downloadXlsx(records, annualLeaveExportConfig);
                break;
        }
    }, [records, annualLeaveExportConfig, previewPdf, downloadPdf, downloadCsv, downloadXlsx]);

    // 計算年度選項：當年前後各一年
    const currentYear = new Date().getFullYear();
    const yearOptions = [
        String(currentYear - 1),
        String(currentYear),
        String(currentYear + 1),
    ];

    const [formData, setFormData] = useState<AnnualLeaveFormData>({
        emp_id: '',
        year: String(currentYear),
        leave_type: '',
        days_of_leave: 0,
        remark: '',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // NOTE: 載入假別後，自動設定預設為特休
    useEffect(() => {
        if (leaveTypes.length > 0 && !formData.leave_type && !editingRecord) {
            // 找到特休（名稱包含"特休"）
            const annualLeave = leaveTypes.find(lt =>
                lt.code_subname?.trim() === '特休' || lt.code_content?.includes('特休')
            );
            if (annualLeave) {
                setFormData(prev => ({ ...prev, leave_type: annualLeave.code_subcode }));
            }
        }
    }, [leaveTypes, formData.leave_type, editingRecord]);

    // 編輯模式下填充表單
    useEffect(() => {
        if (editingRecord) {
            setFormData({
                emp_id: editingRecord.emp_id,
                year: editingRecord.year,
                leave_type: editingRecord.leave_type,
                days_of_leave: editingRecord.days_of_leave,
                remark: editingRecord.remark || '',
            });
            setFormErrors({});
        }
    }, [editingRecord]);

    /**
     * 表單驗證
     */
    const validateForm = useCallback((): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.emp_id) {
            errors.emp_id = '請選擇員工';
        }

        const yearError = validateYear(formData.year);
        if (yearError) {
            errors.year = yearError;
        }

        if (!formData.leave_type) {
            errors.leave_type = '請選擇假別';
        }

        const daysError = validateDaysOfLeave(formData.days_of_leave);
        if (daysError) {
            errors.days_of_leave = daysError;
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            if (editingRecord) {
                await updateRecord(
                    editingRecord.emp_id,
                    editingRecord.year,
                    editingRecord.leave_type,
                    {
                        days_of_leave: formData.days_of_leave,
                        remark: formData.remark,
                    }
                );
            } else {
                await addRecord(formData);
            }
            // 重置表單
            const annualLeave = leaveTypes.find(lt =>
                lt.code_subname?.trim() === '特休' || lt.code_content?.includes('特休')
            );
            setFormData({
                emp_id: '',
                year: String(currentYear),
                leave_type: annualLeave?.code_subcode || '',
                days_of_leave: 0,
                remark: '',
            });
            setFormErrors({});
        } catch (e) {
            console.error('提交失敗:', e);
        }
    };

    const handleDelete = async (record: any) => {
        if (window.confirm(`確定要刪除此年度休假記錄嗎？`)) {
            try {
                await deleteRecord(record.emp_id, record.year, record.leave_type);
            } catch (e) {
                console.error('刪除失敗:', e);
            }
        }
    };

    /**
     * 處理可休天數輸入
     * 限制只能輸入整數或 .5 小數
     */
    const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // 允許空值、整數或 .5 小數
        if (value === '' || /^\d+\.?5?$/.test(value) || /^\d+$/.test(value)) {
            const numValue = value === '' ? 0 : parseFloat(value);
            setFormData({ ...formData, days_of_leave: numValue });
        }
    };

    return (
        <div className="annual-leave-page">
            <header className="page-header">
                <h1>🗓️ 年度休假維護</h1>
                <div className="header-actions">
                    <ExportDropdown
                        onExport={handleExport}
                        isGenerating={isGenerating}
                        disabled={records.length === 0}
                    />
                </div>
            </header>

            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                </div>
            )}

            <div className="page-content">
                {/* 表單 */}
                <section className="form-section">
                    <form className="annual-leave-form" onSubmit={handleSubmit}>
                        <h2>{editingRecord ? '編輯年度休假' : '新增年度休假'}</h2>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>員工 *</label>
                                <EmployeeSelect
                                    employees={employees}
                                    value={formData.emp_id}
                                    onChange={(empId) => setFormData({ ...formData, emp_id: empId })}
                                    disabled={!!editingRecord}
                                    required
                                    placeholder="輸入英文名搜尋或選擇員工"
                                />
                                {formErrors.emp_id && (
                                    <span className="form-error">{formErrors.emp_id}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>給假年度 *</label>
                                <select
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    disabled={!!editingRecord}
                                    required
                                >
                                    {yearOptions.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                {formErrors.year && (
                                    <span className="form-error">{formErrors.year}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>假別 *</label>
                                <select
                                    value={formData.leave_type}
                                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                    disabled={!!editingRecord}
                                    required
                                >
                                    <option value="">請選擇</option>
                                    {leaveTypes.map(type => (
                                        <option key={type.code_subcode} value={type.code_subcode}>
                                            {type.code_subname}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.leave_type && (
                                    <span className="form-error">{formErrors.leave_type}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>可休天數 *</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="365"
                                    value={formData.days_of_leave || ''}
                                    onChange={handleDaysChange}
                                    required
                                />
                                {formErrors.days_of_leave && (
                                    <span className="form-error">{formErrors.days_of_leave}</span>
                                )}
                            </div>

                            <div className="form-group form-group-full">
                                <label>備註</label>
                                <textarea
                                    value={formData.remark || ''}
                                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            {editingRecord && (
                                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                                    取消
                                </button>
                            )}
                            <button type="submit" className="btn btn-primary">
                                {editingRecord ? '更新' : '新增'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* 篩選 */}
                <section className="filter-section">
                    <div className="filters">
                        <input
                            type="text"
                            placeholder="員工姓名篩選"
                            value={empNameFilter}
                            onChange={(e) => setEmpNameFilter(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="年度篩選 (例: 2026)"
                            maxLength={4}
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value.replace(/\D/g, ''))}
                        />
                        <select
                            value={leaveTypeFilter}
                            onChange={(e) => setLeaveTypeFilter(e.target.value)}
                        >
                            <option value="">所有假別</option>
                            {leaveTypes.map(type => (
                                <option key={type.code_subcode} value={type.code_subcode}>
                                    {type.code_subname}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* 列表 */}
                <section className="table-section">
                    <h2>年度休假清單 ({totalCount})</h2>
                    {isLoading ? (
                        <div className="loading">載入中...</div>
                    ) : records.length === 0 ? (
                        <div className="empty">尚無年度休假記錄</div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="annual-leave-table">
                                    <thead>
                                        <tr>
                                            <SortableHeader
                                                label="員工"
                                                sortKey="chinese_name"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="年度"
                                                sortKey="year"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="假別"
                                                sortKey="leave_type"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <SortableHeader
                                                label="可休天數"
                                                sortKey="days_of_leave"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                            />
                                            <th className="hide-tablet">備註</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((record) => (
                                            <tr key={`${record.emp_id}-${record.year}-${record.leave_type}`}>
                                                <td data-label="員工">
                                                    <div className="employee-info">
                                                        <span className="employee-name">
                                                            {record.english_name || '-'} - {record.chinese_name || '-'}
                                                        </span>
                                                        <span className="employee-id">{record.emp_id}</span>
                                                    </div>
                                                </td>
                                                <td data-label="年度">{record.year}</td>
                                                <td data-label="假別">
                                                    <span className="badge">
                                                        {getLeaveTypeName(record.leave_type)}
                                                    </span>
                                                </td>
                                                <td data-label="可休天數" className="days-cell">
                                                    {record.days_of_leave} 天
                                                </td>
                                                <td data-label="備註" className="hide-tablet">
                                                    {record.remark || '-'}
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

            {/* PDF 預覽模態框 */}
            <PdfPreview
                isOpen={isPreviewOpen}
                pdfDataUrl={pdfDataUrl}
                onClose={closePreview}
                onDownload={() => downloadPdf(records, annualLeaveExportConfig)}
            />
        </div>
    );
}
