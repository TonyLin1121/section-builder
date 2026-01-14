import { useState, useRef, useEffect } from 'react';
import './ExportDropdown.css';

export type ExportFormat = 'preview-pdf' | 'pdf' | 'csv' | 'xlsx';

interface ExportDropdownProps {
    /** 匯出回調 */
    onExport: (format: ExportFormat) => void;
    /** 是否正在生成 */
    isGenerating?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
}

/**
 * 匯出下拉按鈕組件
 * NOTE: 提供 PDF 預覽/下載、CSV、XLSX 匯出選項
 */
export function ExportDropdown({
    onExport,
    isGenerating = false,
    disabled = false,
}: ExportDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 點擊外部關閉下拉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = (format: ExportFormat) => {
        setIsOpen(false);
        onExport(format);
    };

    return (
        <div className="export-dropdown" ref={dropdownRef}>
            <button
                className="btn btn-primary export-trigger"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || isGenerating}
            >
                {isGenerating ? '⏳ 生成中...' : '📥 匯出'}
                <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="export-menu">
                    <button
                        className="export-menu-item"
                        onClick={() => handleExport('preview-pdf')}
                    >
                        <span className="export-icon">👁️</span>
                        <span>預覽 PDF</span>
                    </button>
                    <button
                        className="export-menu-item"
                        onClick={() => handleExport('pdf')}
                    >
                        <span className="export-icon">📄</span>
                        <span>下載 PDF</span>
                    </button>
                    <div className="export-menu-divider" />
                    <button
                        className="export-menu-item"
                        onClick={() => handleExport('csv')}
                    >
                        <span className="export-icon">📊</span>
                        <span>下載 CSV</span>
                    </button>
                    <button
                        className="export-menu-item"
                        onClick={() => handleExport('xlsx')}
                    >
                        <span className="export-icon">📗</span>
                        <span>下載 Excel</span>
                    </button>
                </div>
            )}
        </div>
    );
}
