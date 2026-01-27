/**
 * 公告彈窗組件
 * NOTE: 登入後顯示未讀公告
 */
import { useEffect, useRef } from 'react';
import { useActiveAnnouncements } from '../hooks/useAnnouncements';
import { getAttachmentDownloadUrl } from '../services/announcementApi';
import './AnnouncementModal.css';

/**
 * 公告彈窗組件
 */
export function AnnouncementModal() {
    const {
        currentAnnouncement,
        hasAnnouncements,
        currentIndex,
        totalCount,
        closeCurrentAndNext,
        closeAll,
    } = useActiveAnnouncements();

    const modalRef = useRef<HTMLDivElement>(null);

    // ESC 鍵關閉
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && hasAnnouncements) {
                closeCurrentAndNext();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [hasAnnouncements, closeCurrentAndNext]);

    // 無公告時不渲染
    if (!hasAnnouncements || !currentAnnouncement) {
        return null;
    }

    const {
        title,
        content,
        category_name,
        category_icon,
        is_pinned,
        publish_date,
        attachments,
    } = currentAnnouncement;

    return (
        <div className="announcement-modal-overlay">
            <div className="announcement-modal" ref={modalRef}>
                {/* 標題區 */}
                <div className="announcement-modal-header">
                    <div className="announcement-meta">
                        {category_icon && (
                            <span className="announcement-category-icon">{category_icon}</span>
                        )}
                        {category_name && (
                            <span className="announcement-category">{category_name}</span>
                        )}
                        {is_pinned && (
                            <span className="announcement-pinned">📌 置頂</span>
                        )}
                    </div>
                    <h2 className="announcement-title">{title}</h2>
                    {publish_date && (
                        <span className="announcement-date">{publish_date}</span>
                    )}
                </div>

                {/* 內容區 */}
                <div className="announcement-modal-body">
                    {content ? (
                        <div
                            className="announcement-content"
                            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
                        />
                    ) : (
                        <p className="announcement-no-content">無內容</p>
                    )}

                    {/* 附件區 */}
                    {attachments && attachments.length > 0 && (
                        <div className="announcement-attachments">
                            <h4>📎 附件</h4>
                            <ul>
                                {attachments.map(att => (
                                    <li key={att.attachment_id}>
                                        <a
                                            href={getAttachmentDownloadUrl(att.attachment_id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {att.file_name}
                                            {att.file_size && (
                                                <span className="attachment-size">
                                                    ({formatFileSize(att.file_size)})
                                                </span>
                                            )}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* 底部操作區 */}
                <div className="announcement-modal-footer">
                    <span className="announcement-counter">
                        {currentIndex + 1} / {totalCount}
                    </span>
                    <div className="announcement-actions">
                        {totalCount > 1 && (
                            <button
                                className="btn btn-secondary"
                                onClick={closeAll}
                            >
                                全部關閉
                            </button>
                        )}
                        <button
                            className="btn btn-primary"
                            onClick={closeCurrentAndNext}
                        >
                            {currentIndex < totalCount - 1 ? '下一則' : '關閉'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * 格式化檔案大小
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
