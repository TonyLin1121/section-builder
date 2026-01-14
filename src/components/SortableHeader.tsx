import './SortableHeader.css';

export type SortOrder = 'asc' | 'desc' | null;

interface SortableHeaderProps {
    /** 欄位顯示名稱 */
    label: string;
    /** 欄位排序鍵 */
    sortKey: string;
    /** 當前排序欄位 */
    currentSortBy: string | null;
    /** 當前排序方向 */
    currentSortOrder: SortOrder;
    /** 排序變更回調 */
    onSort: (key: string, order: SortOrder) => void;
    /** 額外的 className */
    className?: string;
}

/**
 * 可排序表頭組件
 */
export function SortableHeader({
    label,
    sortKey,
    currentSortBy,
    currentSortOrder,
    onSort,
    className = '',
}: SortableHeaderProps) {
    const isActive = currentSortBy === sortKey;

    const handleClick = () => {
        if (!isActive) {
            onSort(sortKey, 'asc');
        } else if (currentSortOrder === 'asc') {
            onSort(sortKey, 'desc');
        } else {
            onSort(sortKey, null); // 取消排序
        }
    };

    return (
        <th className={`sortable-header ${className}`} onClick={handleClick}>
            <div className="sortable-header-content">
                <span>{label}</span>
                <span className={`sort-icon ${isActive ? 'active' : ''}`}>
                    {isActive && currentSortOrder === 'asc' && '▲'}
                    {isActive && currentSortOrder === 'desc' && '▼'}
                    {!isActive && '⇅'}
                </span>
            </div>
        </th>
    );
}
