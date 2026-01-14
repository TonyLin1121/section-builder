import type { Member } from '../types/employee';
import { SortableHeader } from './SortableHeader';
import type { SortOrder } from './SortableHeader';
import './EmployeeTable.css';

interface EmployeeTableProps {
    /** 員工清單 */
    employees: Member[];
    /** 編輯回調 */
    onEdit: (employee: Member) => void;
    /** 刪除回調 */
    onDelete: (empId: string) => void;
    /** 載入中狀態 */
    isLoading?: boolean;
    /** 當前排序欄位 */
    sortBy?: string | null;
    /** 當前排序方向 */
    sortOrder?: SortOrder;
    /** 排序變更回調 */
    onSort?: (key: string, order: SortOrder) => void;
}

/**
 * 員工列表表格組件
 * NOTE: 展示員工資料並提供編輯、刪除操作
 */
export function EmployeeTable({
    employees,
    onEdit,
    onDelete,
    isLoading,
    sortBy,
    sortOrder,
    onSort,
}: EmployeeTableProps) {
    if (isLoading) {
        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>載入中...</p>
            </div>
        );
    }

    if (employees.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>尚無員工資料</h3>
                <p>請使用上方表單新增員工</p>
            </div>
        );
    }

    /**
     * 確認刪除
     */
    const handleDelete = (employee: Member) => {
        const name = employee.chinese_name || employee.name || employee.emp_id;
        if (window.confirm(`確定要刪除員工「${name}」嗎？`)) {
            onDelete(employee.emp_id);
        }
    };

    /**
     * 取得員工身份標籤
     */
    const getTypeBadges = (employee: Member) => {
        const badges = [];
        if (employee.is_manager) badges.push({ label: '經理人', color: 'purple' });
        if (employee.is_member) badges.push({ label: '正職', color: 'blue' });
        if (employee.is_intern) badges.push({ label: '工讀生', color: 'green' });
        if (employee.is_consultant) badges.push({ label: '顧問', color: 'orange' });
        if (employee.is_outsourcing) badges.push({ label: '外包', color: 'gray' });
        return badges;
    };

    // 預設 sort handler
    const handleSort = onSort || (() => { });

    return (
        <div className="table-container">
            <table className="employee-table">
                <thead>
                    <tr>
                        <SortableHeader
                            label="員工編號"
                            sortKey="emp_id"
                            currentSortBy={sortBy || null}
                            currentSortOrder={sortOrder || null}
                            onSort={handleSort}
                        />
                        <SortableHeader
                            label="姓名"
                            sortKey="chinese_name"
                            currentSortBy={sortBy || null}
                            currentSortOrder={sortOrder || null}
                            onSort={handleSort}
                        />
                        <SortableHeader
                            label="部門"
                            sortKey="division_name"
                            currentSortBy={sortBy || null}
                            currentSortOrder={sortOrder || null}
                            onSort={handleSort}
                        />
                        <SortableHeader
                            label="職稱"
                            sortKey="job_title"
                            currentSortBy={sortBy || null}
                            currentSortOrder={sortOrder || null}
                            onSort={handleSort}
                            className="hide-tablet"
                        />
                        <th className="hide-mobile">身份</th>
                        <SortableHeader
                            label="電子郵件"
                            sortKey="email"
                            currentSortBy={sortBy || null}
                            currentSortOrder={sortOrder || null}
                            onSort={handleSort}
                            className="hide-tablet"
                        />
                        <th className="hide-mobile">手機</th>
                        <th>狀態</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map((employee, index) => (
                        <tr
                            key={employee.emp_id}
                            style={{ animationDelay: `${index * 0.03}s` }}
                        >
                            <td data-label="員工編號">
                                <code className="emp-id">{employee.emp_id}</code>
                            </td>
                            <td data-label="姓名">
                                <div className="employee-name">
                                    <span className="avatar">
                                        {(employee.chinese_name || employee.name || '?').charAt(0)}
                                    </span>
                                    <div className="name-info">
                                        <span className="chinese-name">{employee.chinese_name || '-'}</span>
                                        {employee.name && (
                                            <span className="english-name">{employee.name}</span>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td data-label="部門">
                                {employee.division_name ? (
                                    <span className="badge badge-department">{employee.division_name}</span>
                                ) : '-'}
                            </td>
                            <td data-label="職稱" className="hide-tablet">{employee.job_title || '-'}</td>
                            <td data-label="身份" className="hide-mobile">
                                <div className="type-badges">
                                    {getTypeBadges(employee).map((badge, i) => (
                                        <span key={i} className={`badge badge-${badge.color}`}>
                                            {badge.label}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td data-label="電子郵件" className="hide-tablet">
                                {employee.email ? (
                                    <a href={`mailto:${employee.email}`} className="email-link">
                                        {employee.email}
                                    </a>
                                ) : '-'}
                            </td>
                            <td data-label="手機" className="hide-mobile">{employee.cellphone || '-'}</td>
                            <td data-label="狀態">
                                <span className={`status-badge ${employee.is_employed ? 'active' : 'inactive'}`}>
                                    {employee.is_employed ? '在職' : '離職'}
                                </span>
                            </td>
                            <td data-label="操作">
                                <div className="action-buttons">
                                    <button
                                        className="btn-icon btn-edit"
                                        onClick={() => onEdit(employee)}
                                        title="編輯"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn-icon btn-delete"
                                        onClick={() => handleDelete(employee)}
                                        title="刪除"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
