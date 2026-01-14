import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useExport, type ExportConfig } from '../hooks/useExport';
import { Pagination } from '../components/Pagination';
import { SortableHeader } from '../components/SortableHeader';
import { ExportDropdown, type ExportFormat } from '../components/ExportDropdown';
import { PdfPreview } from '../components/PdfPreview';
import type { AttendanceFormData } from '../types/attendance';
import { DAY_PERIOD_OPTIONS } from '../types/attendance';
import './AttendancePage.css';

/**
 * 請假維護頁面
 */
export function AttendancePage() {
    const {
        records,
        leaveTypes,
        employees,
        editingRecord,
        isLoading,
        error,
        empNameFilter,
        setEmpNameFilter,
        leaveTypeFilter,
        setLeaveTypeFilter,
        startDateFilter,
        setStartDateFilter,
        endDateFilter,
        setEndDateFilter,
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
    } = useAttendance();

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
     * 請假記錄匯出欄位配置
     */
    const attendanceExportConfig: ExportConfig = useMemo(() => ({
        filename: 'attendance_records',
        title: '請假記錄清單',
        columns: [
            { key: 'emp_id', title: '員工編號', width: 25 },
            { key: 'chinese_name', title: '員工姓名', width: 30 },
            {
                key: 'leave_date',
                title: '請假日期',
                width: 25,
                format: (value) => {
                    const dateStr = String(value || '');
                    return dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                }
            },
            {
                key: 'leave_type',
                title: '假別',
                width: 25,
                format: (value) => getLeaveTypeName(String(value || ''))
            },
            {
                key: 'day_period',
                title: '時段',
                width: 20,
                format: (value) => DAY_PERIOD_OPTIONS.find(o => o.value === value)?.label || '-'
            },
            { key: 'duration_days', title: '天數', width: 15 },
            { key: 'substitute', title: '代理人', width: 25 },
            { key: 'remark', title: '備註', width: 40 },
        ],
    }), [getLeaveTypeName]);

    /**
     * 處理匯出
     */
    const handleExport = useCallback(async (format: ExportFormat) => {
        switch (format) {
            case 'preview-pdf':
                await previewPdf(records, attendanceExportConfig);
                break;
            case 'pdf':
                await downloadPdf(records, attendanceExportConfig);
                break;
            case 'csv':
                downloadCsv(records, attendanceExportConfig);
                break;
            case 'xlsx':
                downloadXlsx(records, attendanceExportConfig);
                break;
        }
    }, [records, attendanceExportConfig, previewPdf, downloadPdf, downloadCsv, downloadXlsx]);

    const [formData, setFormData] = useState<AttendanceFormData>({
        emp_id: '',
        leave_date: '',
        leave_type: '',
        day_period: '0',
        duration_days: 1,
        job_logged: '0',
        mynote_logged: '0',
        substitute: '',
        remark: '',
    });

    // 編輯模式下填充表單
    useEffect(() => {
        if (editingRecord) {
            setFormData(editingRecord);
        }
    }, [editingRecord]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRecord) {
                await updateRecord(
                    editingRecord.emp_id,
                    editingRecord.leave_date,
                    editingRecord.leave_type,
                    formData
                );
            } else {
                await addRecord(formData);
            }
            // 重置表單
            setFormData({
                emp_id: '',
                leave_date: '',
                leave_type: '',
                day_period: '0',
                duration_days: 1,
                job_logged: '0',
                mynote_logged: '0',
                substitute: '',
                remark: '',
            });
        } catch (e) {
            console.error('提交失敗:', e);
        }
    };

    const handleDelete = async (record: any) => {
        if (window.confirm(`確定要刪除此請假記錄嗎？`)) {
            try {
                await deleteRecord(record.emp_id, record.leave_date, record.leave_type);
            } catch (e) {
                console.error('刪除失敗:', e);
            }
        }
    };

    return (
        <div className="attendance-page">
            <header className="page-header">
                <h1>📅 請假維護</h1>
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
                    <form className="attendance-form" onSubmit={handleSubmit}>
                        <h2>{editingRecord ? '編輯請假記錄' : '新增請假記錄'}</h2>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>員工 *</label>
                                <select
                                    value={formData.emp_id}
                                    onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                                    disabled={!!editingRecord}
                                    required
                                >
                                    <option value="">請選擇員工</option>
                                    {employees.map(emp => (
                                        <option key={emp.emp_id} value={emp.emp_id}>
                                            {emp.chinese_name || emp.name} ({emp.emp_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>請假日期 *</label>
                                <input
                                    type="date"
                                    value={formData.leave_date?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || ''}
                                    onChange={(e) => setFormData({ ...formData, leave_date: e.target.value.replace(/-/g, '') })}
                                    disabled={!!editingRecord}
                                    required
                                />
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
                            </div>

                            <div className="form-group">
                                <label>時段</label>
                                <select
                                    value={formData.day_period || '0'}
                                    onChange={(e) => setFormData({ ...formData, day_period: e.target.value })}
                                >
                                    {DAY_PERIOD_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>請假天數</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={formData.duration_days || ''}
                                    onChange={(e) => setFormData({ ...formData, duration_days: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div className="form-group">
                                <label>代理人</label>
                                <input
                                    type="text"
                                    value={formData.substitute || ''}
                                    onChange={(e) => setFormData({ ...formData, substitute: e.target.value })}
                                />
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
                        <div className="date-range">
                            <input
                                type="date"
                                placeholder="開始日期"
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                            />
                            <span>～</span>
                            <input
                                type="date"
                                placeholder="結束日期"
                                value={endDateFilter}
                                onChange={(e) => setEndDateFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* 列表 */}
                <section className="table-section">
                    <h2>請假記錄清單 ({totalCount})</h2>
                    {isLoading ? (
                        <div className="loading">載入中...</div>
                    ) : records.length === 0 ? (
                        <div className="empty">尚無請假記錄</div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="attendance-table">
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
                                                label="請假日期"
                                                sortKey="leave_date"
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
                                            <th className="hide-mobile">時段</th>
                                            <SortableHeader
                                                label="天數"
                                                sortKey="duration_days"
                                                currentSortBy={sortBy}
                                                currentSortOrder={sortOrder}
                                                onSort={handleSort}
                                                className="hide-mobile"
                                            />
                                            <th className="hide-tablet">代理人</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((record) => (
                                            <tr key={`${record.emp_id}-${record.leave_date}-${record.leave_type}`}>
                                                <td data-label="員工">
                                                    <div className="employee-info">
                                                        <span className="employee-name">{record.chinese_name || record.english_name || '-'}</span>
                                                        <span className="employee-id">{record.emp_id}</span>
                                                    </div>
                                                </td>
                                                <td data-label="請假日期">{record.leave_date?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</td>
                                                <td data-label="假別">
                                                    <span className="badge">
                                                        {getLeaveTypeName(record.leave_type)}
                                                    </span>
                                                </td>
                                                <td data-label="時段" className="hide-mobile">
                                                    {DAY_PERIOD_OPTIONS.find(o => o.value === record.day_period)?.label || '-'}
                                                </td>
                                                <td data-label="天數" className="hide-mobile">{record.duration_days || '-'}</td>
                                                <td data-label="代理人" className="hide-tablet">{record.substitute || '-'}</td>
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
                onDownload={() => downloadPdf(records, attendanceExportConfig)}
            />
        </div>
    );
}
