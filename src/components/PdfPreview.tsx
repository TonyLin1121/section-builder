import './PdfPreview.css';

interface PdfPreviewProps {
    /** 是否顯示預覽 */
    isOpen: boolean;
    /** PDF Data URL */
    pdfDataUrl: string | null;
    /** 關閉回調 */
    onClose: () => void;
    /** 下載回調 */
    onDownload: () => void;
}

/**
 * PDF 預覽模態框組件
 */
export function PdfPreview({ isOpen, pdfDataUrl, onClose, onDownload }: PdfPreviewProps) {
    if (!isOpen || !pdfDataUrl) return null;

    /**
     * 點擊背景關閉
     */
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="pdf-modal-backdrop" onClick={handleBackdropClick}>
            <div className="pdf-modal">
                <div className="pdf-modal-header">
                    <h3>PDF 預覽</h3>
                    <div className="pdf-modal-actions">
                        <button className="btn btn-primary" onClick={onDownload}>
                            📥 下載 PDF
                        </button>
                        <button className="btn-close" onClick={onClose} title="關閉">
                            ✕
                        </button>
                    </div>
                </div>
                <div className="pdf-modal-content">
                    <iframe
                        src={pdfDataUrl}
                        title="PDF 預覽"
                        className="pdf-iframe"
                    />
                </div>
            </div>
        </div>
    );
}
