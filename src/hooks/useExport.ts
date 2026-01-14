import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * 欄位定義介面
 */
export interface ExportColumn {
    /** 資料欄位名稱 */
    key: string;
    /** 顯示標題 */
    title: string;
    /** 欄位寬度（PDF 用）*/
    width?: number;
    /** 格式化函數 */
    format?: (value: unknown, row: unknown) => string;
}

/**
 * 匯出設定
 */
export interface ExportConfig {
    /** 檔案名稱（不含副檔名）*/
    filename: string;
    /** 報表標題 */
    title: string;
    /** 欄位定義 */
    columns: ExportColumn[];
}

/**
 * 通用匯出 Hook
 * NOTE: 支援 PDF、CSV、XLSX 三種格式匯出
 */
export function useExport() {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    /**
     * 格式化欄位值
     */
    const formatValue = useCallback((
        column: ExportColumn,
        row: object
    ): string => {
        const record = row as Record<string, unknown>;
        const value = record[column.key];
        if (column.format) {
            return column.format(value, row);
        }
        if (value === null || value === undefined) {
            return '';
        }
        return String(value);
    }, []);

    /**
     * 生成 PDF
     */
    const generatePdf = useCallback(async <T extends object>(
        data: T[],
        config: ExportConfig
    ): Promise<jsPDF> => {
        setIsGenerating(true);

        try {
            const pdf = new jsPDF('l', 'mm', 'a4'); // 橫向 A4
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // 標題
            pdf.setFontSize(16);
            pdf.text(config.title, pageWidth / 2, 15, { align: 'center' });

            // 生成日期
            pdf.setFontSize(9);
            pdf.text(
                `Generated: ${new Date().toLocaleDateString('zh-TW')}`,
                pageWidth / 2,
                22,
                { align: 'center' }
            );

            // 表格參數
            const startY = 30;
            const rowHeight = 8;
            const cellPadding = 2;
            const marginX = 10;
            const tableWidth = pageWidth - marginX * 2;

            // 計算欄位寬度
            const totalDefinedWidth = config.columns.reduce(
                (sum, col) => sum + (col.width || 0),
                0
            );
            const autoWidthCols = config.columns.filter(col => !col.width).length;
            const remainingWidth = Math.max(0, tableWidth - totalDefinedWidth);
            const autoWidth = autoWidthCols > 0 ? remainingWidth / autoWidthCols : 0;

            const colWidths = config.columns.map(col => col.width || autoWidth);

            // 繪製表頭
            pdf.setFontSize(8);
            pdf.setFillColor(59, 130, 246);
            pdf.rect(marginX, startY, tableWidth, rowHeight, 'F');
            pdf.setTextColor(255, 255, 255);

            let xPos = marginX + cellPadding;
            config.columns.forEach((col, i) => {
                pdf.text(col.title, xPos, startY + 5.5);
                xPos += colWidths[i];
            });

            // 繪製資料行
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(7);

            let currentY = startY + rowHeight;

            data.forEach((row, index) => {
                // 檢查是否需要換頁
                if (currentY > pageHeight - 20) {
                    pdf.addPage();
                    currentY = 20;

                    // 重新繪製表頭
                    pdf.setFontSize(8);
                    pdf.setFillColor(59, 130, 246);
                    pdf.rect(marginX, currentY, tableWidth, rowHeight, 'F');
                    pdf.setTextColor(255, 255, 255);

                    let hxPos = marginX + cellPadding;
                    config.columns.forEach((col, i) => {
                        pdf.text(col.title, hxPos, currentY + 5.5);
                        hxPos += colWidths[i];
                    });

                    pdf.setTextColor(0, 0, 0);
                    pdf.setFontSize(7);
                    currentY += rowHeight;
                }

                // 交替行背景色
                if (index % 2 === 0) {
                    pdf.setFillColor(243, 244, 246);
                    pdf.rect(marginX, currentY, tableWidth, rowHeight, 'F');
                }

                // 繪製資料
                let x = marginX + cellPadding;
                config.columns.forEach((col, i) => {
                    const cellValue = formatValue(col, row);
                    const maxWidth = colWidths[i] - cellPadding * 2;

                    // 截斷過長文字
                    let displayText = cellValue;
                    while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 0) {
                        displayText = displayText.slice(0, -1);
                    }
                    if (displayText !== cellValue && displayText.length > 2) {
                        displayText = displayText.slice(0, -2) + '..';
                    }

                    pdf.text(displayText, x, currentY + 5.5);
                    x += colWidths[i];
                });

                currentY += rowHeight;
            });

            return pdf;
        } finally {
            setIsGenerating(false);
        }
    }, [formatValue]);

    /**
     * 預覽 PDF
     */
    const previewPdf = useCallback(async <T extends object>(
        data: T[],
        config: ExportConfig
    ) => {
        setIsGenerating(true);
        try {
            const pdf = await generatePdf(data, config);
            const dataUrl = pdf.output('datauristring');
            setPdfDataUrl(dataUrl);
            setIsPreviewOpen(true);
        } finally {
            setIsGenerating(false);
        }
    }, [generatePdf]);

    /**
     * 下載 PDF
     */
    const downloadPdf = useCallback(async <T extends object>(
        data: T[],
        config: ExportConfig
    ) => {
        setIsGenerating(true);
        try {
            const pdf = await generatePdf(data, config);
            const timestamp = new Date().toISOString().split('T')[0];
            pdf.save(`${config.filename}_${timestamp}.pdf`);
        } finally {
            setIsGenerating(false);
        }
    }, [generatePdf]);

    /**
     * 下載 CSV
     */
    const downloadCsv = useCallback(<T extends object>(
        data: T[],
        config: ExportConfig
    ) => {
        // 表頭
        const headers = config.columns.map(col => col.title);

        // 資料行
        const rows = data.map(row =>
            config.columns.map(col => {
                const value = formatValue(col, row);
                // 處理包含逗號或引號的值
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            })
        );

        // 組合 CSV 內容（加入 BOM 以支援 Excel 開啟中文）
        const bom = '\uFEFF';
        const csvContent = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        // 下載
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.href = URL.createObjectURL(blob);
        link.download = `${config.filename}_${timestamp}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }, [formatValue]);

    /**
     * 下載 XLSX
     */
    const downloadXlsx = useCallback(<T extends object>(
        data: T[],
        config: ExportConfig
    ) => {
        // 準備工作表資料
        const headers = config.columns.map(col => col.title);
        const rows = data.map(row =>
            config.columns.map(col => formatValue(col, row))
        );

        const worksheetData = [headers, ...rows];

        // 建立工作簿
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // 設定欄寬
        const colWidths = config.columns.map(col => ({ wch: col.width ? col.width / 2 : 15 }));
        worksheet['!cols'] = colWidths;

        // 新增工作表
        XLSX.utils.book_append_sheet(workbook, worksheet, config.title.slice(0, 31));

        // 下載
        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `${config.filename}_${timestamp}.xlsx`);
    }, [formatValue]);

    /**
     * 關閉預覽
     */
    const closePreview = useCallback(() => {
        setIsPreviewOpen(false);
        setPdfDataUrl(null);
    }, []);

    return {
        isPreviewOpen,
        pdfDataUrl,
        isGenerating,
        previewPdf,
        downloadPdf,
        downloadCsv,
        downloadXlsx,
        closePreview,
    };
}
