/**
 * 專案統計圖表頁面（簡化版）
 * NOTE: 提供專案數量、金額、客戶的視覺化統計分析
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    BarChart, Bar, PieChart, Pie, LineChart, Line, Treemap,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import { httpRequest } from '../services/httpClient';
import './ProjectStatsPage.css';

// 統計維度類型
type StatsDimension = 'status' | 'customer' | 'department';
// 統計區間
type StatsInterval = 'none' | 'monthly' | 'quarterly' | 'yearly';
// 圖表類型
type ChartType = 'bar' | 'pie' | 'line' | 'doughnut' | 'heatmap';

// 統計資料結構
interface StatsData {
    name: string;
    count: number;
    amount: number;
    [key: string]: string | number;
}

// 選項
interface FilterOption {
    value: string;
    label: string;
}

// 圖表顏色
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

/**
 * 格式化金額（加千分位）
 */
const formatAmount = (value: number): string => {
    return `$${value.toLocaleString('zh-TW')}`;
};

/**
 * 專案統計頁面
 */
export function ProjectStatsPage() {
    // 時間範圍篩選
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    // 多選過濾器
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    // 統計設定
    const [dimension, setDimension] = useState<StatsDimension>('status');
    const [interval, setInterval] = useState<StatsInterval>('none');
    const [chartType, setChartType] = useState<ChartType>('bar');
    // 熱力圖色系：'light' 淺色系 或 'dark' 深色系
    const [heatmapTheme, setHeatmapTheme] = useState<'light' | 'dark'>('light');

    // 選項資料
    const [statusOptions, setStatusOptions] = useState<FilterOption[]>([]);

    // 統計資料
    const [statsData, setStatsData] = useState<StatsData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 圖表參考
    const chartRef = useRef<HTMLDivElement>(null);

    /**
     * 載入過濾器選項
     */
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await httpRequest<{ statuses: string[] }>('/projects/filter-options');
                setStatusOptions(response.statuses.map(s => ({ value: s, label: s })));
            } catch (e) {
                console.error('載入選項失敗:', e);
            }
        };
        fetchOptions();
    }, []);

    /**
     * 取得統計資料
     */
    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('dimension', dimension);
            params.set('interval', interval);
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);
            if (selectedStatuses.length > 0) {
                params.set('statuses', selectedStatuses.join(','));
            }

            const response = await httpRequest<{ items: StatsData[] }>(
                `/projects/stats?${params.toString()}`
            );
            setStatsData(response.items);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
        } finally {
            setIsLoading(false);
        }
    }, [dimension, interval, dateFrom, dateTo, selectedStatuses]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    /**
     * 多選切換
     */
    const toggleSelection = (value: string) => {
        if (selectedStatuses.includes(value)) {
            setSelectedStatuses(selectedStatuses.filter(v => v !== value));
        } else {
            setSelectedStatuses([...selectedStatuses, value]);
        }
    };

    /**
     * 匯出圖表為 PNG
     */
    const handleExportPng = async () => {
        if (!chartRef.current) return;
        try {
            const svg = chartRef.current.querySelector('svg');
            if (!svg) return;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                canvas.width = img.width || 800;
                canvas.height = img.height || 400;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `專案統計_${dimension}_${new Date().toISOString().slice(0, 10)}.png`;
                link.href = pngUrl;
                link.click();
            };
            img.src = url;
        } catch (e) {
            console.error('Export failed:', e);
            alert('匯出失敗');
        }
    };

    /**
     * 複製到剪貼簿
     */
    const handleCopyToClipboard = async () => {
        if (!chartRef.current) return;
        try {
            const svg = chartRef.current.querySelector('svg');
            if (!svg) return;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = async () => {
                canvas.width = img.width || 800;
                canvas.height = img.height || 400;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                canvas.toBlob(async (blob) => {
                    if (blob) {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        alert('已複製到剪貼簿');
                    }
                }, 'image/png');
            };
            img.src = url;
        } catch (e) {
            console.error('Copy failed:', e);
            alert('複製失敗');
        }
    };

    /**
     * 渲染圖表
     */
    const renderChart = () => {
        if (statsData.length === 0) {
            return <div className="no-data">無統計資料</div>;
        }

        const commonProps = {
            data: statsData,
            margin: { top: 20, right: 30, left: 20, bottom: 60 }
        };

        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                            <YAxis yAxisId="right" orientation="right" stroke="#10b981" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value, name) => {
                                const v = Number(value) || 0;
                                if (String(name).includes('金額')) return [formatAmount(v), name];
                                return [`${v} 個`, name];
                            }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="count" name="專案數量" fill="#3b82f6" />
                            <Bar yAxisId="right" dataKey="amount" name="專案金額" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'pie':
            case 'doughnut':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={statsData}
                                cx="50%"
                                cy="50%"
                                innerRadius={chartType === 'doughnut' ? 60 : 0}
                                outerRadius={120}
                                dataKey="count"
                                nameKey="name"
                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(1)}%)`}
                            >
                                {statsData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${Number(value) || 0} 個`, '專案數量']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                            <YAxis yAxisId="right" orientation="right" stroke="#10b981" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value, name) => {
                                const v = Number(value) || 0;
                                if (String(name).includes('金額')) return [formatAmount(v), name];
                                return [`${v} 個`, name];
                            }} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="count" name="專案數量" stroke="#3b82f6" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="amount" name="專案金額" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'heatmap': {
                // 淺色系配色 - 輕鬆活潑
                const lightColors = [
                    '#93c5fd', // 淺藍
                    '#86efac', // 淺綠
                    '#fdba74', // 淺橘
                    '#fca5a5', // 淺紅
                    '#c4b5fd', // 淺紫
                    '#f9a8d4', // 淺粉
                    '#67e8f9', // 淺青
                    '#bef264', // 淺檖檬
                    '#fed7aa', // 淺橙
                    '#a5b4fc', // 淺靶
                ];

                // 深色系配色
                const darkColors = [
                    '#1d4ed8', // 深藍
                    '#047857', // 深綠
                    '#b45309', // 深橘
                    '#b91c1c', // 深紅
                    '#6d28d9', // 深紫
                    '#be185d', // 深粉
                    '#0e7490', // 深青
                    '#4d7c0f', // 深檖檬
                    '#c2410c', // 深橙
                    '#4338ca', // 深靶
                ];

                // 根據色系選擇配色和文字顏色
                const colors = heatmapTheme === 'light' ? lightColors : darkColors;
                // 淺色系：純黑色文字；深色系：亮黃色文字，皆無陰影效果
                const textColor = heatmapTheme === 'light' ? '#000000' : '#ffff00';
                const strokeColor = heatmapTheme === 'light' ? '#e2e8f0' : '#0f172a';

                // 準備 Treemap 資料格式
                const treemapData = statsData.map((item, idx) => ({
                    name: item.name,
                    size: item.count,
                    amount: item.amount,
                    displayCount: item.count,
                    displayAmount: formatAmount(item.amount),
                    colorIndex: idx
                }));

                // 自定義 Treemap 內容渲染
                const CustomizedContent = (props: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                    name: string;
                    displayCount: number;
                    displayAmount: string;
                    colorIndex: number;
                }) => {
                    const { x, y, width, height, name, displayCount, displayAmount, colorIndex } = props;
                    const bgColor = colors[colorIndex % colors.length];

                    // 判斷格子夠不夠大顯示文字
                    const showFullInfo = width > 80 && height > 60;
                    const showMinInfo = width > 50 && height > 40;

                    // 純色文字樣式：無陰影、無濾鏡、無漸層
                    const textStyle: React.CSSProperties = {
                        textShadow: 'none',
                        filter: 'none',
                        opacity: 1
                    };

                    return (
                        <g>
                            <rect
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill={bgColor}
                                stroke={strokeColor}
                                strokeWidth={2}
                                rx={4}
                                ry={4}
                            />
                            {showFullInfo && (
                                <>
                                    <text
                                        x={x + width / 2}
                                        y={y + height / 2 - 16}
                                        textAnchor="middle"
                                        fill={textColor}
                                        stroke="none"
                                        fontSize={Math.min(16, width / 8)}
                                        fontWeight="bold"
                                        style={textStyle}
                                    >
                                        {name}
                                    </text>
                                    <text
                                        x={x + width / 2}
                                        y={y + height / 2 + 4}
                                        textAnchor="middle"
                                        fill={textColor}
                                        stroke="none"
                                        fontSize={Math.min(14, width / 10)}
                                        fontWeight="600"
                                        style={textStyle}
                                    >
                                        {displayCount} 個專案
                                    </text>
                                    <text
                                        x={x + width / 2}
                                        y={y + height / 2 + 22}
                                        textAnchor="middle"
                                        fill={textColor}
                                        stroke="none"
                                        fontSize={Math.min(12, width / 12)}
                                        fontWeight="500"
                                        style={textStyle}
                                    >
                                        {displayAmount}
                                    </text>
                                </>
                            )}
                            {!showFullInfo && showMinInfo && (
                                <>
                                    <text
                                        x={x + width / 2}
                                        y={y + height / 2 - 6}
                                        textAnchor="middle"
                                        fill={textColor}
                                        stroke="none"
                                        fontSize={Math.min(12, width / 6)}
                                        fontWeight="bold"
                                        style={textStyle}
                                    >
                                        {name}
                                    </text>
                                    <text
                                        x={x + width / 2}
                                        y={y + height / 2 + 10}
                                        textAnchor="middle"
                                        fill={textColor}
                                        stroke="none"
                                        fontSize={Math.min(10, width / 8)}
                                        fontWeight="600"
                                        style={textStyle}
                                    >
                                        {displayCount}
                                    </text>
                                </>
                            )}
                            {!showMinInfo && width > 30 && height > 20 && (
                                <text
                                    x={x + width / 2}
                                    y={y + height / 2 + 4}
                                    textAnchor="middle"
                                    fill={textColor}
                                    stroke="none"
                                    fontSize={10}
                                    fontWeight="bold"
                                    style={textStyle}
                                >
                                    {displayCount}
                                </text>
                            )}
                        </g>
                    );
                };

                return (
                    <div className="treemap-container">
                        {/* 色系切換按鈕 */}
                        <div className="heatmap-theme-toggle" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                                className={`theme-btn ${heatmapTheme === 'light' ? 'active' : ''}`}
                                onClick={() => setHeatmapTheme('light')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: heatmapTheme === 'light' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                    background: heatmapTheme === 'light' ? 'linear-gradient(135deg, #93c5fd, #86efac, #fdba74)' : '#f1f5f9',
                                    color: '#1e293b',
                                    fontWeight: heatmapTheme === 'light' ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                ☀️ 淺色系
                            </button>
                            <button
                                className={`theme-btn ${heatmapTheme === 'dark' ? 'active' : ''}`}
                                onClick={() => setHeatmapTheme('dark')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: heatmapTheme === 'dark' ? '2px solid #fef08a' : '1px solid #cbd5e1',
                                    background: heatmapTheme === 'dark' ? 'linear-gradient(135deg, #1d4ed8, #047857, #b45309)' : '#f1f5f9',
                                    color: heatmapTheme === 'dark' ? '#fef08a' : '#64748b',
                                    fontWeight: heatmapTheme === 'dark' ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🌙 深色系
                            </button>
                        </div>
                        <ResponsiveContainer width="100%" height={400}>
                            <Treemap
                                data={treemapData}
                                dataKey="size"
                                aspectRatio={4 / 3}
                                stroke={strokeColor}
                                fill="#3b82f6"
                                content={<CustomizedContent x={0} y={0} width={0} height={0} name="" displayCount={0} displayAmount="" colorIndex={0} />}
                            />
                        </ResponsiveContainer>
                        {/* 圖例 */}
                        <div className="treemap-legend" style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
                            {statsData.map((item, idx) => (
                                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '16px', height: '16px', backgroundColor: colors[idx % colors.length], borderRadius: '4px' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                        {item.name} ({item.count}個, {formatAmount(item.amount)})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            default:
                return null;
        }
    };

    // 統計摘要
    const totalCount = statsData.reduce((sum, item) => sum + item.count, 0);
    const totalAmount = statsData.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="project-stats-page">
            <header className="page-header">
                <h1>📊 專案統計圖表</h1>
            </header>

            {/* 篩選工具列 */}
            <div className="stats-toolbar">
                {/* 時間範圍 */}
                <div className="filter-section">
                    <h4>📅 時間範圍</h4>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>起始日期</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>結束日期</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* 專案狀態多選 */}
                <div className="filter-section">
                    <h4>📋 專案狀態</h4>
                    <div className="multi-select-chips">
                        {statusOptions.length === 0 ? (
                            <span className="no-options">載入中...</span>
                        ) : (
                            statusOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`chip ${selectedStatuses.includes(opt.value) ? 'selected' : ''}`}
                                    onClick={() => toggleSelection(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))
                        )}
                        {selectedStatuses.length > 0 && (
                            <button className="chip clear" onClick={() => setSelectedStatuses([])}>
                                ✕ 清除
                            </button>
                        )}
                    </div>
                </div>

                {/* 統計設定 */}
                <div className="filter-section">
                    <h4>⚙️ 統計設定</h4>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>統計維度</label>
                            <select value={dimension} onChange={(e) => setDimension(e.target.value as StatsDimension)}>
                                <option value="status">專案狀態</option>
                                <option value="customer">客戶</option>
                                <option value="department">部門</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>統計區間</label>
                            <select value={interval} onChange={(e) => setInterval(e.target.value as StatsInterval)}>
                                <option value="none">不分區間（整體統計）</option>
                                <option value="monthly">按月份</option>
                                <option value="quarterly">按季度</option>
                                <option value="yearly">按年度</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 圖表類型 */}
                <div className="filter-section">
                    <h4>📈 圖表類型</h4>
                    <div className="chart-type-buttons">
                        <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')} title="長條圖">📊</button>
                        <button className={chartType === 'pie' ? 'active' : ''} onClick={() => setChartType('pie')} title="圓餅圖">🥧</button>
                        <button className={chartType === 'doughnut' ? 'active' : ''} onClick={() => setChartType('doughnut')} title="環形圖">🍩</button>
                        <button className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')} title="折線圖">📈</button>
                        <button className={chartType === 'heatmap' ? 'active' : ''} onClick={() => setChartType('heatmap')} title="熱力圖">🗺️</button>
                    </div>
                </div>
            </div>

            {/* 圖表區域 */}
            <div className="chart-container">
                <div className="chart-header">
                    <h2>
                        統計結果
                        {dateFrom && dateTo && <span className="date-range">（{dateFrom} ~ {dateTo}）</span>}
                    </h2>
                    <div className="chart-actions">
                        <button onClick={handleExportPng} title="匯出 PNG">💾 匯出</button>
                        <button onClick={handleCopyToClipboard} title="複製到剪貼簿">📋 複製</button>
                    </div>
                </div>

                {error && <div className="error-banner">⚠️ {error}</div>}

                <div className="chart-wrapper" ref={chartRef}>
                    {isLoading ? <div className="loading">載入中...</div> : renderChart()}
                </div>
            </div>

            {/* 統計摘要 */}
            <div className="stats-summary">
                <div className="summary-card">
                    <span className="summary-label">總專案數</span>
                    <span className="summary-value">{totalCount.toLocaleString('zh-TW')}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">總金額</span>
                    <span className="summary-value">{formatAmount(totalAmount)}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">分組數</span>
                    <span className="summary-value">{statsData.length}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">平均金額</span>
                    <span className="summary-value">{formatAmount(totalCount > 0 ? totalAmount / totalCount : 0)}</span>
                </div>
            </div>
        </div>
    );
}
