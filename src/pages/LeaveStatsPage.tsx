import { useLeaveStats } from '../hooks/useLeaveStats';
import { useExport, type ExportConfig } from '../hooks/useExport';
import { ExportDropdown, type ExportFormat } from '../components/ExportDropdown';
import { PdfPreview } from '../components/PdfPreview';
import React, { useCallback, useMemo } from 'react';
import './LeaveStatsPage.css';

/**
 * 休假統計頁面
 * NOTE: 顯示每位員工各假別的可休、已休、未休天數統計
 */
export function LeaveStatsPage() {
    const {
        records,
        leaveTypes,
        isLoading,
        error,
        mode,
        setMode,
        selectedYear,
        setSelectedYear,
        selectedMonth,
        setSelectedMonth,
        yearOptions,
        monthOptions,
        sortBy,
        sortOrder,
        handleSort,
    } = useLeaveStats();

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
    const exportConfig: ExportConfig = useMemo(() => {
        // 基礎欄位
        const baseColumns = [
            { key: 'emp_id', title: '員編', width: 15 },
            { key: 'english_name', title: '英文名', width: 20 },
            { key: 'chinese_name', title: '姓名', width: 15 },
        ];

        // 動態假別欄位
        const leaveColumns = leaveTypes.flatMap(lt => [
            {
                key: `leave_stats.${lt.code}.available`,
                title: `${lt.name}-可休`,
                width: 12,
                format: (_value: unknown, row: Record<string, unknown>) => {
                    const stats = row.leave_stats as Record<string, { available: number }> | undefined;
                    return stats?.[lt.code]?.available?.toString() || '-';
                }
            },
            {
                key: `leave_stats.${lt.code}.used`,
                title: `${lt.name}-已休`,
                width: 12,
                format: (_value: unknown, row: Record<string, unknown>) => {
                    const stats = row.leave_stats as Record<string, { used: number }> | undefined;
                    return stats?.[lt.code]?.used?.toString() || '-';
                }
            },
            {
                key: `leave_stats.${lt.code}.remaining`,
                title: `${lt.name}-未休`,
                width: 12,
                format: (_value: unknown, row: Record<string, unknown>) => {
                    const stats = row.leave_stats as Record<string, { remaining: number }> | undefined;
                    return stats?.[lt.code]?.remaining?.toString() || '-';
                }
            },
        ]);

        return {
            filename: `leave_stats_${selectedYear}${mode === 'month' ? `_${selectedMonth}` : ''}`,
            title: `休假統計 - ${selectedYear}${mode === 'month' ? `年${parseInt(selectedMonth)}月` : '年度'}`,
            columns: [...baseColumns, ...leaveColumns],
        };
    }, [leaveTypes, selectedYear, selectedMonth, mode]);

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
     * 渲染排序指示器
     */
    const renderSortIndicator = (key: 'emp_id' | 'english_name' | 'chinese_name') => {
        if (sortBy !== key) return null;
        return sortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    /**
     * 取得儲存格的 className
     * NOTE: 當可休=已休（休完）時使用藍色字型
     */
    const getCellClassName = (available: number, used: number) => {
        if (available > 0 && available === used) {
            return 'leave-complete';
        }
        return '';
    };

    return (
        <div className="leave-stats-page">
            <header className="page-header">
                <h1>📊 休假統計</h1>
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
                {/* 篩選區 */}
                <section className="filter-section">
                    <div className="filters">
                        {/* 統計模式切換 */}
                        <div className="mode-toggle">
                            <button
                                className={`mode-btn ${mode === 'year' ? 'active' : ''}`}
                                onClick={() => setMode('year')}
                            >
                                年度統計
                            </button>
                            <button
                                className={`mode-btn ${mode === 'month' ? 'active' : ''}`}
                                onClick={() => setMode('month')}
                            >
                                月份統計
                            </button>
                        </div>

                        {/* 年度選擇 */}
                        <div className="filter-group">
                            <label>年度</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* 月份選擇（僅月份模式顯示） */}
                        {mode === 'month' && (
                            <div className="filter-group">
                                <label>月份</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    {monthOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </section>

                {/* 統計表格 */}
                <section className="table-section">
                    <h2>
                        {mode === 'year'
                            ? `${selectedYear} 年度休假統計`
                            : `${selectedYear} 年 ${parseInt(selectedMonth)} 月休假統計`
                        }
                        <span className="record-count">({records.length} 人)</span>
                    </h2>

                    {isLoading ? (
                        <div className="loading">載入中...</div>
                    ) : records.length === 0 ? (
                        <div className="empty">無統計資料</div>
                    ) : (
                        <div className="table-container">
                            <table className="leave-stats-table">
                                <thead>
                                    <tr>
                                        <th
                                            className="sortable sticky-col"
                                            onClick={() => handleSort('emp_id')}
                                        >
                                            員編{renderSortIndicator('emp_id')}
                                        </th>
                                        <th
                                            className="sortable sticky-col-2"
                                            onClick={() => handleSort('english_name')}
                                        >
                                            英文名{renderSortIndicator('english_name')}
                                        </th>
                                        <th
                                            className="sortable sticky-col-3"
                                            onClick={() => handleSort('chinese_name')}
                                        >
                                            姓名{renderSortIndicator('chinese_name')}
                                        </th>
                                        {/* 動態假別欄位 */}
                                        {leaveTypes.map((lt, index) => (
                                            <th key={lt.code} colSpan={3} className={`leave-type-header leave-type-${index % 7}`}>
                                                {lt.name}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="sub-header">
                                        <th className="sticky-col"></th>
                                        <th className="sticky-col-2"></th>
                                        <th className="sticky-col-3"></th>
                                        {leaveTypes.map((lt, index) => (
                                            <React.Fragment key={lt.code}>
                                                <th className={`leave-sub-header leave-type-${index % 7}`}>可休</th>
                                                <th className={`leave-sub-header leave-type-${index % 7}`}>已休</th>
                                                <th className={`leave-sub-header leave-type-${index % 7}`}>未休</th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((record, rowIndex) => (
                                        <tr key={record.emp_id} className={rowIndex % 2 === 1 ? 'row-alt' : ''}>
                                            <td className="sticky-col">{record.emp_id}</td>
                                            <td className="sticky-col-2">{record.english_name || '-'}</td>
                                            <td className="sticky-col-3">{record.chinese_name || '-'}</td>
                                            {leaveTypes.map((lt, index) => {
                                                const stats = record.leave_stats[lt.code];
                                                const typeClass = `leave-type-${index % 7}`;
                                                if (!stats) {
                                                    return (
                                                        <React.Fragment key={lt.code}>
                                                            <td className={`leave-cell ${typeClass}`}>-</td>
                                                            <td className={`leave-cell ${typeClass}`}>-</td>
                                                            <td className={`leave-cell ${typeClass}`}>-</td>
                                                        </React.Fragment>
                                                    );
                                                }
                                                const cellClass = getCellClassName(stats.available, stats.used);
                                                return (
                                                    <React.Fragment key={lt.code}>
                                                        <td className={`leave-cell ${typeClass} ${cellClass}`}>{stats.available}</td>
                                                        <td className={`leave-cell ${typeClass} ${cellClass}`}>{stats.used}</td>
                                                        <td className={`leave-cell ${typeClass} ${cellClass}`}>{stats.remaining}</td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* PDF 預覽模態框 */}
            <PdfPreview
                isOpen={isPreviewOpen}
                pdfDataUrl={pdfDataUrl}
                onClose={closePreview}
                onDownload={() => downloadPdf(records, exportConfig)}
            />
        </div>
    );
}
