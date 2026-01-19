/**
 * 員工統計圖表頁面
 * NOTE: 提供員工數量的視覺化統計分析
 * 支援：依員工類型、部門、職稱統計
 * 支援：員工類型多選、在職狀態多選篩選
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    BarChart, Bar, PieChart, Pie, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import { httpRequest } from '../services/httpClient';
import './EmployeeStatsPage.css';

// 統計維度類型
type StatsDimension = 'member_type' | 'division' | 'job_title';
// 圖表類型
type ChartType = 'bar' | 'pie' | 'line' | 'doughnut';

// 統計資料結構
interface StatsData {
    name: string;
    count: number;
    [key: string]: string | number;
}

// 圖表顏色
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// 員工類型選項
const MEMBER_TYPE_OPTIONS = [
    { value: 'member', label: '正式員工' },
    { value: 'manager', label: '主管' },
    { value: 'intern', label: '實習生' },
    { value: 'consultant', label: '顧問' },
    { value: 'outsourcing', label: '外包人員' },
];

// 在職狀態選項
const EMPLOYED_STATUS_OPTIONS = [
    { value: 'employed', label: '在職' },
    { value: 'unemployed', label: '離職' },
];

// 員工類型對照
const MEMBER_TYPE_LABELS: Record<string, string> = {
    'member': '正式員工',
    'manager': '主管',
    'intern': '實習生',
    'consultant': '顧問',
    'outsourcing': '外包人員',
};

/**
 * 員工統計頁面
 */
export function EmployeeStatsPage() {
    // 統計設定
    const [dimension, setDimension] = useState<StatsDimension>('member_type');
    const [chartType, setChartType] = useState<ChartType>('bar');

    // 多選篩選
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>(['employed']);

    // 統計資料
    const [statsData, setStatsData] = useState<StatsData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 圖表參考
    const chartRef = useRef<HTMLDivElement>(null);

    /**
     * 切換選項
     */
    const toggleSelection = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
        if (selected.includes(value)) {
            setSelected(selected.filter(v => v !== value));
        } else {
            setSelected([...selected, value]);
        }
    };

    /**
     * 取得統計資料
     */
    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('dimension', dimension);

            if (selectedTypes.length > 0) {
                params.set('member_types', selectedTypes.join(','));
            }
            if (selectedStatus.length > 0) {
                params.set('employed_status', selectedStatus.join(','));
            }

            const response = await httpRequest<{ items: StatsData[] }>(
                `/members/stats?${params.toString()}`
            );

            // 轉換員工類型標籤
            const items = response.items.map(item => ({
                ...item,
                name: dimension === 'member_type'
                    ? (MEMBER_TYPE_LABELS[item.name] || item.name)
                    : item.name
            }));

            setStatsData(items);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
        } finally {
            setIsLoading(false);
        }
    }, [dimension, selectedTypes, selectedStatus]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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
                link.download = `員工統計_${dimension}_${new Date().toISOString().slice(0, 10)}.png`;
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
     * 取得維度標籤
     */
    const getDimensionLabel = () => {
        switch (dimension) {
            case 'member_type': return '員工類型';
            case 'division': return '部門';
            case 'job_title': return '職稱';
            default: return '';
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
                            <YAxis />
                            <Tooltip formatter={(value) => [`${Number(value) || 0} 人`, '人數']} />
                            <Legend />
                            <Bar dataKey="count" name="人數" fill="#3b82f6" />
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
                            <Tooltip formatter={(value) => [`${Number(value) || 0} 人`, '人數']} />
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
                            <YAxis />
                            <Tooltip formatter={(value) => [`${Number(value) || 0} 人`, '人數']} />
                            <Legend />
                            <Line type="monotone" dataKey="count" name="人數" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            default:
                return null;
        }
    };

    // 統計摘要
    const totalCount = statsData.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="employee-stats-page">
            <header className="page-header">
                <h1>👥 員工統計圖表</h1>
            </header>

            {/* 篩選工具列 */}
            <div className="stats-toolbar">
                {/* 員工類型多選 */}
                <div className="filter-section">
                    <h4>👤 員工類型</h4>
                    <div className="multi-select-chips">
                        {MEMBER_TYPE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                className={`chip ${selectedTypes.includes(opt.value) ? 'selected' : ''}`}
                                onClick={() => toggleSelection(opt.value, selectedTypes, setSelectedTypes)}
                            >
                                {opt.label}
                            </button>
                        ))}
                        {selectedTypes.length > 0 && (
                            <button className="chip clear" onClick={() => setSelectedTypes([])}>
                                ✕ 全部
                            </button>
                        )}
                    </div>
                    <small className="filter-hint">不選表示全部類型</small>
                </div>

                {/* 在職狀態多選 */}
                <div className="filter-section">
                    <h4>📋 在職狀態</h4>
                    <div className="multi-select-chips">
                        {EMPLOYED_STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                className={`chip ${selectedStatus.includes(opt.value) ? 'selected' : ''}`}
                                onClick={() => toggleSelection(opt.value, selectedStatus, setSelectedStatus)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <small className="filter-hint">可同時選擇在職和離職</small>
                </div>

                {/* 統計設定 */}
                <div className="filter-section">
                    <h4>⚙️ 統計維度</h4>
                    <div className="filter-row">
                        <div className="filter-group">
                            <select value={dimension} onChange={(e) => setDimension(e.target.value as StatsDimension)}>
                                <option value="member_type">員工類型</option>
                                <option value="division">部門</option>
                                <option value="job_title">職稱</option>
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
                    </div>
                </div>
            </div>

            {/* 圖表區域 */}
            <div className="chart-container">
                <div className="chart-header">
                    <h2>{getDimensionLabel()}統計</h2>
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
                    <span className="summary-label">總人數</span>
                    <span className="summary-value">{totalCount.toLocaleString('zh-TW')}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">分組數</span>
                    <span className="summary-value">{statsData.length}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">平均每組</span>
                    <span className="summary-value">
                        {statsData.length > 0 ? Math.round(totalCount / statsData.length) : 0}
                    </span>
                </div>
            </div>
        </div>
    );
}
