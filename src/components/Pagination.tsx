import './Pagination.css';

interface PaginationProps {
    /** 當前頁碼 (1-indexed) */
    currentPage: number;
    /** 總筆數 */
    totalCount: number;
    /** 每頁筆數 */
    pageSize: number;
    /** 頁碼變更回調 */
    onPageChange: (page: number) => void;
    /** 每頁筆數變更回調 */
    onPageSizeChange?: (size: number) => void;
}

/**
 * 分頁控制組件
 */
export function Pagination({
    currentPage,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
}: PaginationProps) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    // 計算要顯示的頁碼按鈕
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showPages = 5; // 顯示的頁碼數量

        if (totalPages <= showPages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // 總是顯示第一頁
            pages.push(1);

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            if (start > 2) {
                pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 1) {
                pages.push('...');
            }

            // 總是顯示最後一頁
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }

        return pages;
    };

    if (totalCount === 0) {
        return null;
    }

    return (
        <div className="pagination">
            <div className="pagination-info">
                顯示 {startItem} - {endItem}，共 {totalCount} 筆
            </div>

            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    ◀
                </button>

                {getPageNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                        <button
                            key={index}
                            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    ) : (
                        <span key={index} className="pagination-ellipsis">
                            {page}
                        </span>
                    )
                )}

                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    ▶
                </button>
            </div>

            {onPageSizeChange && (
                <div className="pagination-size">
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        <option value={10}>10 筆/頁</option>
                        <option value={20}>20 筆/頁</option>
                        <option value={50}>50 筆/頁</option>
                        <option value={100}>100 筆/頁</option>
                    </select>
                </div>
            )}
        </div>
    );
}
