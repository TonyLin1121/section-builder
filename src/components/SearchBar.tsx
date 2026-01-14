import './SearchBar.css';

/**
 * 員工類型選項（不含「所有類型」，因為多選時用空陣列表示全部）
 */
const MEMBER_TYPE_OPTIONS = [
    { value: 'member', label: '正職' },
    { value: 'manager', label: '經理人' },
    { value: 'intern', label: '工讀生' },
    { value: 'consultant', label: '顧問' },
    { value: 'outsourcing', label: '外包' },
];

interface SearchBarProps {
    /** 搜尋關鍵字 */
    searchTerm: string;
    /** 部門篩選 */
    departmentFilter: string;
    /** 員工類型篩選（多選） */
    memberTypeFilter?: string[];
    /** 在職狀態篩選 */
    isEmployedFilter?: boolean | null;
    /** 部門選項清單 */
    divisions?: string[];
    /** 搜尋變更回調 */
    onSearchChange: (value: string) => void;
    /** 部門篩選變更回調 */
    onDepartmentChange: (value: string) => void;
    /** 員工類型篩選變更回調（多選） */
    onMemberTypeChange?: (value: string[]) => void;
    /** 在職狀態篩選變更回調 */
    onIsEmployedChange?: (value: boolean | null) => void;
}

/**
 * 搜尋與篩選組件
 */
export function SearchBar({
    searchTerm,
    departmentFilter,
    memberTypeFilter = [],
    isEmployedFilter = null,
    divisions = [],
    onSearchChange,
    onDepartmentChange,
    onMemberTypeChange,
    onIsEmployedChange,
}: SearchBarProps) {
    /**
     * 處理員工類型 checkbox 變更
     */
    const handleTypeChange = (type: string, checked: boolean) => {
        if (!onMemberTypeChange) return;

        if (checked) {
            // 新增類型
            onMemberTypeChange([...memberTypeFilter, type]);
        } else {
            // 移除類型
            onMemberTypeChange(memberTypeFilter.filter(t => t !== type));
        }
    };

    /**
     * 處理在職狀態變更
     */
    const handleEmployedChange = (value: string) => {
        if (!onIsEmployedChange) return;

        if (value === '') {
            onIsEmployedChange(null);
        } else {
            onIsEmployedChange(value === 'true');
        }
    };

    return (
        <div className="search-bar">
            <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="搜尋員工編號、姓名、電子郵件或職稱..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchTerm && (
                    <button
                        className="clear-btn"
                        onClick={() => onSearchChange('')}
                        title="清除搜尋"
                    >
                        ✕
                    </button>
                )}
            </div>

            <select
                className="department-filter"
                value={departmentFilter}
                onChange={(e) => onDepartmentChange(e.target.value)}
            >
                <option value="">所有部門</option>
                {divisions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                ))}
            </select>

            {onIsEmployedChange && (
                <select
                    className="employed-filter"
                    value={isEmployedFilter === null ? '' : String(isEmployedFilter)}
                    onChange={(e) => handleEmployedChange(e.target.value)}
                >
                    <option value="">全部狀態</option>
                    <option value="true">✅ 在職</option>
                    <option value="false">❌ 離職</option>
                </select>
            )}

            {onMemberTypeChange && (
                <div className="member-type-filter-group">
                    {MEMBER_TYPE_OPTIONS.map(opt => (
                        <label key={opt.value} className="type-checkbox">
                            <input
                                type="checkbox"
                                checked={memberTypeFilter.includes(opt.value)}
                                onChange={(e) => handleTypeChange(opt.value, e.target.checked)}
                            />
                            <span>{opt.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
