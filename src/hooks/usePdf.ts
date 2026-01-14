import { useState, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Member } from '../types/employee';

/**
 * PDF 生成與預覽 Hook
 * NOTE: 使用 jsPDF 和 html2canvas 生成 PDF
 */
export function usePdf() {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    /**
     * 生成 PDF
     */
    const generatePdf = useCallback(async (members: Member[]) => {
        setIsGenerating(true);

        try {
            const pdf = new jsPDF('l', 'mm', 'a4'); // 橫向 A4
            const pageWidth = pdf.internal.pageSize.getWidth();

            // 標題
            pdf.setFontSize(16);
            pdf.text('Member List', pageWidth / 2, 15, { align: 'center' });

            // 生成日期
            pdf.setFontSize(9);
            pdf.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, pageWidth / 2, 22, { align: 'center' });

            // 表格參數
            const startY = 30;
            const cellPadding = 2;
            const rowHeight = 8;
            const colWidths = [25, 30, 30, 30, 35, 50, 35, 20, 20];
            const headers = ['Emp ID', 'Chinese Name', 'English Name', 'Division', 'Job Title', 'Email', 'Phone', 'Status', 'Type'];

            // 繪製表頭
            pdf.setFontSize(8);
            pdf.setFillColor(59, 130, 246);
            pdf.rect(10, startY, pageWidth - 20, rowHeight, 'F');
            pdf.setTextColor(255, 255, 255);

            let xPos = 10 + cellPadding;
            headers.forEach((header, i) => {
                pdf.text(header, xPos, startY + 5.5);
                xPos += colWidths[i];
            });

            // 繪製資料行
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(7);

            members.forEach((member, index) => {
                const y = startY + (index + 1) * rowHeight;

                // 檢查是否需要換頁
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                    pdf.addPage();
                    return;
                }

                // 交替行背景色
                if (index % 2 === 0) {
                    pdf.setFillColor(243, 244, 246);
                    pdf.rect(10, y, pageWidth - 20, rowHeight, 'F');
                }

                // 取得員工類型
                const types: string[] = [];
                if (member.is_manager) types.push('Mgr');
                if (member.is_member) types.push('FT');
                if (member.is_intern) types.push('Int');
                if (member.is_consultant) types.push('Con');
                if (member.is_outsourcing) types.push('Out');

                const rowData = [
                    member.emp_id || '',
                    member.chinese_name || '',
                    member.name || '',
                    member.division_name || '',
                    member.job_title || '',
                    member.email || '',
                    member.cellphone || '',
                    member.is_employed ? 'Active' : 'Left',
                    types.join('/'),
                ];

                let x = 10 + cellPadding;
                rowData.forEach((cell, i) => {
                    // 截斷過長的文字
                    const maxWidth = colWidths[i] - cellPadding * 2;
                    let displayText = cell;
                    while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 0) {
                        displayText = displayText.slice(0, -1);
                    }
                    if (displayText !== cell && displayText.length > 0) {
                        displayText = displayText.slice(0, -2) + '..';
                    }
                    pdf.text(displayText, x, y + 5.5);
                    x += colWidths[i];
                });
            });

            // 生成 Data URL 用於預覽
            const dataUrl = pdf.output('datauristring');
            setPdfDataUrl(dataUrl);
            setIsPreviewOpen(true);

            return pdf;
        } catch (error) {
            console.error('PDF 生成失敗:', error);
            throw error;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    /**
     * 從 DOM 元素生成 PDF（備用方案）
     */
    const generatePdfFromElement = useCallback(async (element: HTMLElement) => {
        setIsGenerating(true);

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));

            const dataUrl = pdf.output('datauristring');
            setPdfDataUrl(dataUrl);
            setIsPreviewOpen(true);

            return pdf;
        } catch (error) {
            console.error('PDF 生成失敗:', error);
            throw error;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    /**
     * 下載 PDF
     */
    const downloadPdf = useCallback(async (members: Member[]) => {
        const pdf = await generatePdf(members);
        pdf.save(`member_list_${new Date().toISOString().split('T')[0]}.pdf`);
    }, [generatePdf]);

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
        tableRef,
        generatePdf,
        generatePdfFromElement,
        downloadPdf,
        closePreview,
    };
}
