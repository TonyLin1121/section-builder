import { useLeaveStats } from '../hooks/useLeaveStats';
import { useExport, type ExportConfig } from '../hooks/useExport';
import { ExportDropdown, type ExportFormat } from '../components/ExportDropdown';
import { PdfPreview } from '../components/PdfPreview';
import React, { useCallback, useMemo } from 'react';
import './LeaveStatsPage.css';

// 身份別選項
const MEMBER_TYPE_OPTIONS = [
    { value: 'member', label: '正職' },
    { value: 'manager', label: '經理人' },
    { value: 'intern', label: '工讀生' },
    { value: 'consultant', label: '顧問' },
    { value: 'outsourcing', label: '外包' },
];

// 在職狀態選項
const EMPLOYED_STATUS_OPTIONS = [
    { value: 'employed', label: '在職' },
    { value: 'unemployed', label: '離職' },
];

// 完整顯示「可休 / 已休 / 未休」三欄的假別名稱；其餘假別只顯示「已休」
// NOTE: code_subname 是定長欄位，可能帶前後空白（參考 AnnualLeavePage 的 .trim()），
//       比對前務必 trim，否則 '特休 ' !== '特休' 會讓三欄假別誤判成「其它」。
const FULL_STAT_TYPE_NAMES = ['特休', '補休', '凌群假'];
const isFullStatType = (name: string) => FULL_STAT_TYPE_NAMES.includes((name ?? '').trim());

/**
 * 休假統計頁面
 * NOTE: 顯示每位員工各假別的可休、已休、未休天數統計
 *       特休 / 補休 / 凌群假 顯示三欄；其餘假別僅顯示已休
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
        selectedTypes,
        toggleType,
        selectedStatus,
        toggleStatus,
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
        // NOTE: 特休 / 補休 / 凌群假 匯出三欄；其餘假別僅匯出「已休」
        const usedColumn = (lt: { code: string; name: string }) => ({
            key: `leave_stats.${lt.code}.used`,
            title: `${lt.name}-已休`,
            width: 12,
            format: (_value: unknown, row: Record<string, unknown>) => {
                const stats = row.leave_stats as Record<string, { used: number }> | undefined;
                return stats?.[lt.code]?.used?.toString() || '-';
            }
        });

        const leaveColumns = leaveTypes.flatMap(lt => {
            if (!isFullStatType(lt.name)) {
                return [usedColumn(lt)];
            }
            return [
                {
                    key: `leave_stats.${lt.code}.available`,
                    title: `${lt.name}-可休`,
                    width: 12,
                    format: (_value: unknown, row: Record<string, unknown>) => {
                        const stats = row.leave_stats as Record<string, { available: number }> | undefined;
                        return stats?.[lt.code]?.available?.toString() || '-';
                    }
                },
                usedColumn(lt),
                {
                    key: `leave_stats.${lt.code}.remaining`,
                    title: `${lt.name}-未休`,
                    width: 12,
                    format: (_value: unknown, row: Record<string, unknown>) => {
                        const stats = row.leave_stats as Record<string, { remaining: number }> | undefined;
                        return stats?.[lt.code]?.remaining?.toString() || '-';
                    }
                },
            ];
        });

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

                        {/* 在職狀態過濾 */}
                        <div className="filter-group filter-checks">
                            <label>在職</label>
                            <div className="check-chips">
                                {EMPLOYED_STATUS_OPTIONS.map(opt => (
                                    <label key={opt.value} className="check-chip">
                                        <input
                                            type="checkbox"
                                            checked={selectedStatus.includes(opt.value)}
                                            onChange={() => toggleStatus(opt.value)}
                                        />
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 身份別過濾 */}
                        <div className="filter-group filter-checks">
                            <label>身份別</label>
                            <div className="check-chips">
                                {MEMBER_TYPE_OPTIONS.map(opt => (
                                    <label key={opt.value} className="check-chip">
                                        <input
                                            type="checkbox"
                                            checked={selectedTypes.includes(opt.value)}
                                            onChange={() => toggleType(opt.value)}
                                        />
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
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
                                            <th
                                                key={lt.code}
                                                colSpan={isFullStatType(lt.name) ? 3 : 1}
                                                className={`leave-type-header leave-type-${index % 7}`}
                                            >
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
                                                {isFullStatType(lt.name) && (
                                                    <th className={`leave-sub-header leave-type-${index % 7}`}>可休</th>
                                                )}
                                                <th className={`leave-sub-header leave-type-${index % 7}`}>已休</th>
                                                {isFullStatType(lt.name) && (
                                                    <th className={`leave-sub-header leave-type-${index % 7}`}>未休</th>
                                                )}
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
                                                const isFull = isFullStatType(lt.name);
                                                if (!stats) {
                                                    return (
                                                        <React.Fragment key={lt.code}>
                                                            {isFull && <td className={`leave-cell ${typeClass}`}>-</td>}
                                                            <td className={`leave-cell ${typeClass}`}>-</td>
                                                            {isFull && <td className={`leave-cell ${typeClass}`}>-</td>}
                                                        </React.Fragment>
                                                    );
                                                }
                                                const cellClass = getCellClassName(stats.available, stats.used);
                                                return (
                                                    <React.Fragment key={lt.code}>
                                                        {isFull && <td className={`leave-cell ${typeClass} ${cellClass}`}>{stats.available}</td>}
                                                        <td className={`leave-cell ${typeClass} ${cellClass}`}>{stats.used}</td>
                                                        {isFull && <td className={`leave-cell ${typeClass} ${cellClass}`}>{stats.remaining}</td>}
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
