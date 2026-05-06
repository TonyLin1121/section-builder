/**
 * 系統管理頁面
 * NOTE: 包含使用者管理、角色管理、功能清單和密碼規範 Tab
 */
import { useState, useEffect } from 'react';
import { useSystemUsers } from '../hooks/useSystemUsers';
import { useSystemRoles } from '../hooks/useSystemRoles';
import { Pagination } from '../components/Pagination';
import { getMenus } from '../services/systemApi';
import { httpRequest } from '../services/httpClient';
import type { CreateUserRequest, UpdateUserRequest, RoleRequest } from '../services/systemApi';
import './SystemPage.css';

type TabType = 'users' | 'roles' | 'menus' | 'password-policy';

interface SystemPageProps {
    defaultTab?: TabType;
}

export function SystemPage({ defaultTab = 'users' }: SystemPageProps) {
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

    // 當 defaultTab 改變時更新 activeTab
    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    return (
        <div className="system-page">
            <header className="page-header">
                <h1>🔐 系統管理</h1>
            </header>

            {/* Tab 切換 */}
            <div className="tab-container">
                <button
                    className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👤 使用者管理
                </button>
                <button
                    className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    🏷️ 角色管理
                </button>
                <button
                    className={`tab-button ${activeTab === 'menus' ? 'active' : ''}`}
                    onClick={() => setActiveTab('menus')}
                >
                    📑 功能清單
                </button>
                <button
                    className={`tab-button ${activeTab === 'password-policy' ? 'active' : ''}`}
                    onClick={() => setActiveTab('password-policy')}
                >
                    🔐 密碼規範
                </button>
            </div>

            {/* Tab 內容 */}
            <div className="tab-content">
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'roles' && <RolesTab />}
                {activeTab === 'menus' && <MenusTab />}
                {activeTab === 'password-policy' && <PasswordPolicyTab />}
            </div>
        </div>
    );
}


/**
 * 使用者管理 Tab
 */
function UsersTab() {
    const {
        users,
        availableMembers,
        roles,
        editingUser,
        isLoading,
        error,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalCount,
        searchTerm,
        setSearchTerm,
        addUser,
        modifyUser,
        removeUser,
        startEdit,
        cancelEdit,
        searchAvailableMembers,
    } = useSystemUsers();

    // 表單狀態
    const [formData, setFormData] = useState<CreateUserRequest>({
        user_id: '',
        password: '',
        is_active: true,
        expire_date: '',
        role_ids: [],
    });
    const [resetPassword, setResetPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Modal 開關
    const [isFormOpen, setIsFormOpen] = useState(false);

    // 編輯模式下填充表單，並自動開啟 Modal
    useEffect(() => {
        if (editingUser) {
            setFormData({
                user_id: editingUser.user_id,
                password: '',
                is_active: editingUser.is_active,
                expire_date: editingUser.expire_date || '',
                role_ids: editingUser.roles,
            });
            setResetPassword('');
            setIsFormOpen(true);
        }
    }, [editingUser]);

    // 初始載入所有可用員工
    useEffect(() => {
        searchAvailableMembers('');
    }, [searchAvailableMembers]);

    const handleOpenAdd = () => {
        cancelEdit();
        setFormData({
            user_id: '',
            password: '',
            is_active: true,
            expire_date: '',
            role_ids: [],
        });
        setResetPassword('');
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        cancelEdit();
        setFormData({
            user_id: '',
            password: '',
            is_active: true,
            expire_date: '',
            role_ids: [],
        });
        setResetPassword('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const updateData: UpdateUserRequest = {
                    is_active: formData.is_active,
                    expire_date: formData.expire_date || undefined,
                    role_ids: formData.role_ids,
                };
                if (resetPassword) {
                    updateData.reset_password = resetPassword;
                }
                await modifyUser(editingUser.user_id, updateData);
            } else {
                await addUser(formData);
            }
            handleCloseForm();
        } catch (e) {
            console.error('提交失敗:', e);
            alert(e instanceof Error ? e.message : '操作失敗');
        }
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm(`確定要刪除使用者「${userId}」嗎？`)) {
            try {
                await removeUser(userId);
            } catch (e) {
                console.error('刪除失敗:', e);
                alert(e instanceof Error ? e.message : '刪除失敗');
            }
        }
    };

    const handleRoleChange = (roleId: string, checked: boolean) => {
        if (checked) {
            setFormData({ ...formData, role_ids: [...(formData.role_ids || []), roleId] });
        } else {
            setFormData({ ...formData, role_ids: (formData.role_ids || []).filter(r => r !== roleId) });
        }
    };

    return (
        <div className="users-tab">
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* 搜尋 + 新增 */}
            <section className="filter-section" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="搜尋使用者..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
                    ＋ 新增使用者
                </button>
            </section>

            {/* 使用者表單 Modal（新增/編輯） */}
            {isFormOpen && (
                <div
                    className="sys-form-modal-overlay"
                    onClick={handleCloseForm}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="sys-form-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sys-form-modal-header">
                            <h2 className="sys-form-modal-title">
                                {editingUser ? '編輯使用者' : '新增使用者'}
                            </h2>
                            <button
                                type="button"
                                className="sys-form-modal-close"
                                onClick={handleCloseForm}
                                aria-label="關閉"
                            >
                                ×
                            </button>
                        </div>
                        <div className="sys-form-modal-body">
                            <form className="system-form" onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    {/* 欄位 1：使用者帳號 */}
                                    <div className="form-group">
                                        <label>使用者帳號 *</label>
                                        {editingUser ? (
                                            <input type="text" value={editingUser.user_id} disabled />
                                        ) : (
                                            <div className="user-id-with-picker">
                                                <input
                                                    type="text"
                                                    placeholder=""
                                                    value={formData.user_id}
                                                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                                                    required
                                                />
                                                <div className="employee-picker">
                                                    <button
                                                        type="button"
                                                        className="picker-btn"
                                                        title="選擇員工"
                                                    >
                                                        👤
                                                    </button>
                                                    <div className="picker-dropdown">
                                                        {availableMembers.length === 0 ? (
                                                            <div className="picker-empty">無可選擇的員工</div>
                                                        ) : (
                                                            availableMembers.map(m => (
                                                                <button
                                                                    key={m.emp_id}
                                                                    type="button"
                                                                    className="picker-item"
                                                                    onClick={() => setFormData({ ...formData, user_id: m.emp_id })}
                                                                >
                                                                    <span className="picker-id">{m.emp_id}</span>
                                                                    <span className="picker-name">{m.chinese_name || '(無姓名)'}</span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 欄位 2：密碼 */}
                                    <div className="form-group">
                                        <label>{editingUser ? '重設密碼' : '初始密碼 *'}</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={editingUser ? resetPassword : formData.password}
                                                onChange={(e) => editingUser
                                                    ? setResetPassword(e.target.value)
                                                    : setFormData({ ...formData, password: e.target.value })
                                                }
                                                required={!editingUser}
                                                placeholder={editingUser ? '留空則不變更' : ''}
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onMouseDown={() => setShowPassword(true)}
                                                onMouseUp={() => setShowPassword(false)}
                                                onMouseLeave={() => setShowPassword(false)}
                                                title={showPassword ? '隱藏密碼' : '顯示密碼'}
                                            >
                                                {showPassword ? '👁️' : '👁️‍🗨️'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* 欄位 3：帳號狀態 */}
                                    <div className="form-group">
                                        <label>帳號狀態</label>
                                        <select
                                            value={formData.is_active ? '1' : '0'}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}
                                        >
                                            <option value="1">啟用</option>
                                            <option value="0">停用</option>
                                        </select>
                                    </div>

                                    {/* 欄位 4：到期日 */}
                                    <div className="form-group">
                                        <label>帳號到期日</label>
                                        <input
                                            type="date"
                                            value={formData.expire_date}
                                            onChange={(e) => setFormData({ ...formData, expire_date: e.target.value })}
                                        />
                                    </div>

                                    {/* 欄位 5：指派角色 */}
                                    <div className="form-group form-group-full">
                                        <label>指派角色</label>
                                        <div className="checkbox-group">
                                            {roles.map(role => (
                                                <label key={role.role_id} className="checkbox-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.role_ids || []).includes(role.role_id)}
                                                        onChange={(e) => handleRoleChange(role.role_id, e.target.checked)}
                                                    />
                                                    <span>{role.role_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
                                        取消
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingUser ? '更新' : '新增'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* 列表 */}
            <section className="table-section">
                <h2>使用者清單 ({totalCount})</h2>
                {isLoading ? (
                    <div className="loading">載入中...</div>
                ) : users.length === 0 ? (
                    <div className="empty">尚無使用者資料</div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="system-table">
                                <thead>
                                    <tr>
                                        <th>帳號</th>
                                        <th>姓名</th>
                                        <th>角色</th>
                                        <th>狀態</th>
                                        <th className="hide-mobile">到期日</th>
                                        <th className="hide-tablet">最後登入</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.user_id}>
                                            <td data-label="帳號">{user.user_id}</td>
                                            <td data-label="姓名">{user.user_name || '-'}</td>
                                            <td data-label="角色">
                                                <div className="role-badges">
                                                    {user.roles.map(r => (
                                                        <span key={r} className="role-badge">{r}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td data-label="狀態">
                                                <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                                    {user.is_active ? '啟用' : '停用'}
                                                </span>
                                            </td>
                                            <td data-label="到期日" className="hide-mobile">
                                                {user.expire_date || '-'}
                                            </td>
                                            <td data-label="最後登入" className="hide-tablet">
                                                {user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-TW') : '-'}
                                            </td>
                                            <td data-label="操作">
                                                <div className="action-buttons">
                                                    <button className="btn-icon btn-edit" onClick={() => startEdit(user)}>
                                                        ✏️
                                                    </button>
                                                    <button className="btn-icon btn-delete" onClick={() => handleDelete(user.user_id)}>
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalCount={totalCount}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={setPageSize}
                        />
                    </>
                )}
            </section>
        </div>
    );
}

/**
 * 角色管理 Tab
 */
function RolesTab() {
    const {
        roles,
        functionGroups,
        editingRole,
        isLoading,
        error,
        addRole,
        modifyRole,
        removeRole,
        startEdit,
        cancelEdit,
    } = useSystemRoles();

    // 表單狀態
    const [formData, setFormData] = useState<RoleRequest>({
        role_id: '',
        role_name: '',
        description: '',
        is_active: true,
        function_ids: [],
    });

    // 編輯模式下填充表單
    // Modal 開關
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        if (editingRole) {
            setFormData({
                role_id: editingRole.role_id,
                role_name: editingRole.role_name,
                description: editingRole.description || '',
                is_active: editingRole.is_active,
                function_ids: editingRole.functions,
            });
            setIsFormOpen(true);
        }
    }, [editingRole]);

    const handleOpenAdd = () => {
        cancelEdit();
        setFormData({
            role_id: '',
            role_name: '',
            description: '',
            is_active: true,
            function_ids: [],
        });
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        cancelEdit();
        setFormData({
            role_id: '',
            role_name: '',
            description: '',
            is_active: true,
            function_ids: [],
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await modifyRole(editingRole.role_id, formData);
            } else {
                await addRole(formData);
            }
            handleCloseForm();
        } catch (e) {
            console.error('提交失敗:', e);
            alert(e instanceof Error ? e.message : '操作失敗');
        }
    };

    const handleDelete = async (roleId: string) => {
        if (roleId === 'ADMIN') {
            alert('無法刪除 ADMIN 角色');
            return;
        }
        if (window.confirm(`確定要刪除角色「${roleId}」嗎？`)) {
            try {
                await removeRole(roleId);
            } catch (e) {
                console.error('刪除失敗:', e);
                alert(e instanceof Error ? e.message : '刪除失敗');
            }
        }
    };

    const handleFunctionChange = (funcId: string, checked: boolean) => {
        if (checked) {
            setFormData({ ...formData, function_ids: [...(formData.function_ids || []), funcId] });
        } else {
            setFormData({ ...formData, function_ids: (formData.function_ids || []).filter(f => f !== funcId) });
        }
    };

    return (
        <div className="roles-tab">
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* 工具列：新增按鈕 */}
            <section className="filter-section" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
                    ＋ 新增角色
                </button>
            </section>

            {/* 角色表單 Modal（新增/編輯） */}
            {isFormOpen && (
                <div
                    className="sys-form-modal-overlay"
                    onClick={handleCloseForm}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="sys-form-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sys-form-modal-header">
                            <h2 className="sys-form-modal-title">
                                {editingRole ? '編輯角色' : '新增角色'}
                            </h2>
                            <button
                                type="button"
                                className="sys-form-modal-close"
                                onClick={handleCloseForm}
                                aria-label="關閉"
                            >
                                ×
                            </button>
                        </div>
                        <div className="sys-form-modal-body">
                            <form className="system-form" onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>角色代碼 *</label>
                                        <input
                                            type="text"
                                            value={formData.role_id}
                                            onChange={(e) => setFormData({ ...formData, role_id: e.target.value.toUpperCase() })}
                                            disabled={!!editingRole}
                                            maxLength={20}
                                            placeholder="例: MANAGER"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>角色名稱 *</label>
                                        <input
                                            type="text"
                                            value={formData.role_name}
                                            onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                                            maxLength={50}
                                            placeholder="例: 經理"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>狀態</label>
                                        <select
                                            value={formData.is_active ? '1' : '0'}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}
                                        >
                                            <option value="1">啟用</option>
                                            <option value="0">停用</option>
                                        </select>
                                    </div>

                                    <div className="form-group form-group-full">
                                        <label>說明</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={2}
                                            placeholder="角色說明"
                                        />
                                    </div>

                                    {functionGroups.length > 0 && (
                                        <div className="form-group form-group-full">
                                            <label>功能權限</label>
                                            <div className="permission-tree">
                                                {functionGroups.map(group => (
                                                    <div key={group.menu_id} className="permission-group">
                                                        <div className="permission-group-header">
                                                            <span className="permission-group-icon">{group.icon || '📁'}</span>
                                                            <span className="permission-group-name">{group.menu_name}</span>
                                                            <button
                                                                type="button"
                                                                className="btn-select-all"
                                                                onClick={() => {
                                                                    const allFuncIds = group.functions.map(f => f.function_id);
                                                                    const currentIds = formData.function_ids || [];
                                                                    const allSelected = allFuncIds.every(id => currentIds.includes(id));
                                                                    if (allSelected) {
                                                                        setFormData({
                                                                            ...formData,
                                                                            function_ids: currentIds.filter(id => !allFuncIds.includes(id))
                                                                        });
                                                                    } else {
                                                                        const newIds = [...new Set([...currentIds, ...allFuncIds])];
                                                                        setFormData({ ...formData, function_ids: newIds });
                                                                    }
                                                                }}
                                                            >
                                                                {group.functions.every(f =>
                                                                    (formData.function_ids || []).includes(f.function_id)
                                                                ) ? '取消全選' : '全選'}
                                                            </button>
                                                        </div>
                                                        <div className="permission-group-items">
                                                            {group.functions.map(func => (
                                                                <label key={func.function_id} className="permission-item">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(formData.function_ids || []).includes(func.function_id)}
                                                                        onChange={(e) => handleFunctionChange(func.function_id, e.target.checked)}
                                                                    />
                                                                    <span className="permission-item-name">{func.function_name}</span>
                                                                    <code className="permission-item-type">{func.function_type}</code>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
                                        取消
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingRole ? '更新' : '新增'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* 列表 */}
            <section className="table-section">
                <h2>角色清單 ({roles.length})</h2>
                {isLoading ? (
                    <div className="loading">載入中...</div>
                ) : roles.length === 0 ? (
                    <div className="empty">尚無角色資料</div>
                ) : (
                    <div className="table-container">
                        <table className="system-table">
                            <thead>
                                <tr>
                                    <th>代碼</th>
                                    <th>名稱</th>
                                    <th className="hide-mobile">說明</th>
                                    <th>功能數</th>
                                    <th>狀態</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map((role) => (
                                    <tr key={role.role_id}>
                                        <td data-label="代碼">
                                            <code className="code-badge">{role.role_id}</code>
                                        </td>
                                        <td data-label="名稱">{role.role_name}</td>
                                        <td data-label="說明" className="hide-mobile">
                                            {role.description || '-'}
                                        </td>
                                        <td data-label="功能數">{role.functions.length}</td>
                                        <td data-label="狀態">
                                            <span className={`status-badge ${role.is_active ? 'active' : 'inactive'}`}>
                                                {role.is_active ? '啟用' : '停用'}
                                            </span>
                                        </td>
                                        <td data-label="操作">
                                            <div className="action-buttons">
                                                <button className="btn-icon btn-edit" onClick={() => startEdit(role)}>
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-icon btn-delete"
                                                    onClick={() => handleDelete(role.role_id)}
                                                    disabled={role.role_id === 'ADMIN'}
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
                )}
            </section>
        </div>
    );
}

/**
 * 功能清單 Tab
 * NOTE: 管理選單目錄與頁面項目（支援階層結構）
 */
function MenusTab() {
    // 選單項目結構
    interface MenuItem {
        menu_id: string;
        menu_name: string;
        parent_menu_id: string | null;
        menu_path: string | null;  // 有路徑 = 頁面，無路徑 = 選單目錄
        icon: string;
        sort_order: number;
        is_active: boolean;
        isNew?: boolean;
        isDeleted?: boolean;
        isModified?: boolean;
    }

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // 頁面選擇器狀態
    const [showPagePicker, setShowPagePicker] = useState<string | null>(null);
    const [selectedPages, setSelectedPages] = useState<string[]>([]);

    // 圖示選擇器狀態
    const [showIconPicker, setShowIconPicker] = useState<string | null>(null);

    // 常用圖示列表
    const COMMON_ICONS = [
        // 資料夾/文件
        '📁', '📂', '📄', '📝', '📑', '📚', '📖',
        // 人員/組織
        '👤', '👥', '👨‍💼', '👩‍💼', '🧑‍💻', '🏢', '🏠',
        // 設定/工具
        '⚙️', '🔧', '🛠️', '🔒', '🔑', '🛡️', '📊',
        // 行事曆/時間
        '📅', '📆', '⏰', '🕒', '📋',
        // 通訊/消息
        '📧', '📨', '📩', '🔔', '💬', '📢',
        // 財務/金錢
        '💰', '💵', '💳', '🧾', '📈', '📉', '💸',
        // 其他常用
        '✅', '❌', '⚠️', 'ℹ️', '❤️', '⭐', '🔍', '🎯', '🚀',
    ];

    /**
     * 載入資料
     */
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 獲取所有選單（平面結構）
            const res = await httpRequest<{ items: MenuItem[] }>('/system/menus/flat');
            setMenuItems(res.items);
            setHasChanges(false);
        } catch {
            // 如果 flat API 不存在，使用原有 API
            try {
                const menusRes = await getMenus();
                const flattenMenus = (items: typeof menusRes.items, parentId: string | null = null): MenuItem[] => {
                    const result: MenuItem[] = [];
                    for (const item of items) {
                        result.push({
                            menu_id: item.menu_id,
                            menu_name: item.menu_name,
                            parent_menu_id: parentId,
                            menu_path: item.menu_path || null,
                            icon: item.icon || '📁',
                            sort_order: item.sort_order,
                            is_active: item.is_active,
                        });
                        if (item.children && item.children.length > 0) {
                            result.push(...flattenMenus(item.children, item.menu_id));
                        }
                    }
                    return result;
                };
                const flattened = flattenMenus(menusRes.items);
                setMenuItems(flattened);
                setHasChanges(false);
            } catch (e) {
                setError(e instanceof Error ? e.message : '載入失敗');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /**
     * 取得指定父層下的子項目
     * NOTE: 頂層 (parentId = null) 只顯示目錄，不顯示未掛載的頁面
     */
    const getChildren = (parentId: string | null) => {
        return menuItems
            .filter(m => {
                if (m.isDeleted) return false;
                if (m.parent_menu_id !== parentId) return false;
                // 頂層：只顯示目錄（無 menu_path）
                if (parentId === null && m.menu_path) return false;
                return true;
            })
            .sort((a, b) => a.sort_order - b.sort_order);
    };

    /**
     * 新增頂層選單
     */
    const handleAddTopMenu = () => {
        // 生成簡短的 ID（最多 20 字元）
        const shortId = Date.now().toString(36).slice(-6);
        const newId = `new-${shortId}`;
        const siblings = getChildren(null);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(m => m.sort_order)) + 1 : 1;

        setMenuItems([
            ...menuItems,
            {
                menu_id: newId,
                menu_name: '',
                parent_menu_id: null,
                menu_path: null,
                icon: '📁',
                sort_order: maxOrder,
                is_active: true,
                isNew: true,
            },
        ]);
        setHasChanges(true);
    };

    /**
     * 新增子選單
     */
    const handleAddSubMenu = (parentId: string) => {
        const shortId = Date.now().toString(36).slice(-6);
        const newId = `new-${shortId}`;
        const siblings = getChildren(parentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(m => m.sort_order)) + 1 : 1;

        setMenuItems([
            ...menuItems,
            {
                menu_id: newId,
                menu_name: '',
                parent_menu_id: parentId,
                menu_path: null,
                icon: '📁',
                sort_order: maxOrder,
                is_active: true,
                isNew: true,
            },
        ]);
        setHasChanges(true);
    };

    /**
     * 開啟頁面選擇器
     * NOTE: 使用 menu_path 作為選擇依據（因為同一頁面可能有多個 menu_id）
     */
    const handleOpenPagePicker = (parentId: string) => {
        // 獲取已在此選單下的頁面的 menu_path
        const existingPaths = getChildren(parentId)
            .filter(m => m.menu_path)
            .map(m => m.menu_path as string);
        setSelectedPages(existingPaths); // 現在存的是 menu_path
        setShowPagePicker(parentId);
    };

    /**
     * 確認頁面選擇
     * NOTE: 使用 menu_path 作為選擇依據
     */
    const handleConfirmPages = () => {
        if (!showPagePicker) return;
        const parentId = showPagePicker;

        setMenuItems(items => {
            // 目前掛載在此選單下的頁面（用 menu_path 識別）
            const currentlyMountedPaths = items
                .filter(m => m.menu_path && m.parent_menu_id === parentId && !m.isDeleted)
                .map(m => m.menu_path as string);

            // 需要從此選單移除的（取消勾選的 menu_path）
            const toRemovePaths = currentlyMountedPaths.filter(path => !selectedPages.includes(path));
            // 需要掛載到此選單的（新勾選的 menu_path）
            const toAddPaths = selectedPages.filter(path => !currentlyMountedPaths.includes(path));

            // 計算新的排序
            const siblings = items.filter(m => m.parent_menu_id === parentId && !m.isDeleted);
            let maxOrder = siblings.length > 0 ? Math.max(...siblings.map(m => m.sort_order)) + 1 : 1;

            return items.map(m => {
                if (m.menu_path && toRemovePaths.includes(m.menu_path) && m.parent_menu_id === parentId) {
                    // 從選單移除：設 parent_menu_id = null
                    return { ...m, parent_menu_id: null, isModified: true };
                }
                if (m.menu_path && toAddPaths.includes(m.menu_path) && m.parent_menu_id === null) {
                    // 掛載到選單：設 parent_menu_id = 目標選單（只處理未掛載的）
                    return { ...m, parent_menu_id: parentId, sort_order: maxOrder++, isModified: true };
                }
                return m;
            });
        });

        setShowPagePicker(null);
        setSelectedPages([]);
        setHasChanges(true);
    };

    /**
     * 更新項目名稱
     */
    const handleUpdateName = (menuId: string, name: string) => {
        setMenuItems(items => items.map(m =>
            m.menu_id === menuId ? { ...m, menu_name: name, isModified: true } : m
        ));
        setHasChanges(true);
    };

    /**
     * 更新項目圖示
     */
    const handleUpdateIcon = (menuId: string, icon: string) => {
        setMenuItems(items => items.map(m =>
            m.menu_id === menuId ? { ...m, icon, isModified: true } : m
        ));
        setShowIconPicker(null);
        setHasChanges(true);
    };

    /**
     * 切換啟用狀態
     */
    const handleToggleActive = (menuId: string) => {
        setMenuItems(items => items.map(m =>
            m.menu_id === menuId ? { ...m, is_active: !m.is_active, isModified: true } : m
        ));
        setHasChanges(true);
    };

    /**
     * 移動項目
     */
    const handleMove = (menuId: string, direction: 'up' | 'down') => {
        const item = menuItems.find(m => m.menu_id === menuId);
        if (!item) return;

        const siblings = getChildren(item.parent_menu_id);
        const index = siblings.findIndex(m => m.menu_id === menuId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= siblings.length) return;

        // 交換 sort_order
        const targetItem = siblings[newIndex];
        setMenuItems(items => items.map(m => {
            if (m.menu_id === menuId) {
                return { ...m, sort_order: targetItem.sort_order, isModified: true };
            }
            if (m.menu_id === targetItem.menu_id) {
                return { ...m, sort_order: item.sort_order, isModified: true };
            }
            return m;
        }));
        setHasChanges(true);
    };

    /**
     * 刪除/移除項目
     * NOTE: 頁面（有 menu_path）不能刪除，只能從選單移除（設 parent_menu_id = null）
     *       選單目錄（無 menu_path）可以刪除
     */
    const handleDelete = (menuId: string) => {
        const item = menuItems.find(m => m.menu_id === menuId);
        if (!item) return;

        const isPage = !!item.menu_path; // 有路徑 = 頁面

        if (isPage) {
            // 頁面：從當前選單移除（設 parent_menu_id = null），但不刪除
            if (item.isNew) {
                // 如果是新添加的頁面連結，直接移除
                setMenuItems(items => items.filter(m => m.menu_id !== menuId));
            } else {
                // 系統頁面：設為未掛載（parent_menu_id = null）
                setMenuItems(items => items.map(m =>
                    m.menu_id === menuId ? { ...m, parent_menu_id: null, isModified: true } : m
                ));
            }
        } else {
            // 選單目錄：可以刪除
            if (item.isNew) {
                setMenuItems(items => items.filter(m => m.menu_id !== menuId));
            } else {
                setMenuItems(items => items.map(m =>
                    m.menu_id === menuId ? { ...m, isDeleted: true } : m
                ));
            }
            // 子項目：頁面改為未掛載，目錄標記刪除
            const children = getChildren(menuId);
            if (children.length > 0) {
                setMenuItems(items => items.map(m => {
                    if (!children.find(c => c.menu_id === m.menu_id)) return m;

                    if (m.menu_path) {
                        // 頁面：改為未掛載
                        return { ...m, parent_menu_id: null, isModified: true };
                    } else {
                        // 目錄：標記刪除
                        return m.isNew ? null : { ...m, isDeleted: true };
                    }
                }).filter(Boolean) as MenuItem[]);
            }
        }
        setHasChanges(true);
    };

    /**
     * 套用變更
     */
    const handleApply = async () => {
        setIsSaving(true);
        setError(null);
        try {
            // 1. 刪除（只刪除目錄，頁面會由後端處理）
            for (const item of menuItems.filter(m => m.isDeleted && !m.isNew)) {
                try {
                    await httpRequest(`/system/menus/${item.menu_id}`, { method: 'DELETE' });
                } catch (e) {
                    // 如果是頁面不能刪除的錯誤，忽略
                    console.warn('Delete failed:', e);
                }
            }

            // 2. 新增選單 - 需要按層級順序（父選單先建立）
            const newItems = menuItems.filter(m => m.isNew && !m.isDeleted);
            const idMap: Record<string, string> = {}; // 舊 ID -> 新 ID

            // 遞迴新增，確保父選單先建立
            const createMenuItem = async (item: MenuItem, actualParentId: string | null) => {
                const newId = item.menu_id.replace(/^new-/, 'MENU_');
                idMap[item.menu_id] = newId;

                await httpRequest('/system/menus', {
                    method: 'POST',
                    body: JSON.stringify({
                        menu_id: newId,
                        menu_name: item.menu_name || '未命名',
                        parent_menu_id: actualParentId,
                        menu_path: item.menu_path,
                        icon: item.icon,
                        sort_order: item.sort_order,
                        is_active: item.is_active,
                    }),
                });

                // 建立子項目
                const children = newItems.filter(c => c.parent_menu_id === item.menu_id);
                for (const child of children) {
                    await createMenuItem(child, newId);
                }
            };

            // 從頂層開始建立
            for (const item of newItems.filter(m => !m.parent_menu_id || !newItems.find(p => p.menu_id === m.parent_menu_id))) {
                // 如果 parent_menu_id 指向一個已存在的選單，使用原值
                const actualParentId = item.parent_menu_id && !item.parent_menu_id.startsWith('new-')
                    ? item.parent_menu_id
                    : (item.parent_menu_id ? idMap[item.parent_menu_id] : null);
                await createMenuItem(item, actualParentId);
            }

            // 3. 更新（包含 parent_menu_id 變更）
            for (const item of menuItems.filter(m => m.isModified && !m.isNew && !m.isDeleted)) {
                await httpRequest(`/system/menus/${item.menu_id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        menu_name: item.menu_name,
                        parent_menu_id: item.parent_menu_id,
                        icon: item.icon,
                        sort_order: item.sort_order,
                        is_active: item.is_active,
                    }),
                });
            }

            await fetchData();
        } catch (e) {
            setError(e instanceof Error ? e.message : '儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * 渲染選單項目（遞迴）
     */
    const renderMenuItem = (item: MenuItem, level: number = 0): React.ReactNode => {
        const children = getChildren(item.menu_id);
        const siblings = getChildren(item.parent_menu_id);
        const index = siblings.findIndex(m => m.menu_id === item.menu_id);
        const isDirectory = !item.menu_path; // 無路徑 = 目錄

        return (
            <div key={item.menu_id} className={`menu-tree-item ${item.isNew ? 'is-new' : ''}`} style={{ marginLeft: `${level * 24}px` }}>
                <div className={`menu-tree-row ${isDirectory ? 'is-directory' : 'is-page'}`}>
                    {/* 可點擊的圖示按鈕 */}
                    <button
                        type="button"
                        className="btn-icon-picker"
                        onClick={() => setShowIconPicker(item.menu_id)}
                        title="點擊更換圖示"
                    >
                        {item.icon || (isDirectory ? '📁' : '📄')}
                    </button>
                    {isDirectory ? (
                        <input
                            type="text"
                            className="menu-name-input"
                            value={item.menu_name}
                            onChange={(e) => handleUpdateName(item.menu_id, e.target.value)}
                            placeholder="輸入選單名稱..."
                        />
                    ) : (
                        <span className="menu-tree-name">{item.menu_name}</span>
                    )}

                    <div className="menu-tree-actions">
                        {/* 目錄才有新增子選單和新增頁面 */}
                        {isDirectory && (
                            <>
                                <button
                                    type="button"
                                    className="btn-tree-icon btn-add-submenu"
                                    onClick={() => handleAddSubMenu(item.menu_id)}
                                    title="新增子選單"
                                >
                                    📁<span className="plus-badge blue">+</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-tree-icon btn-add-page"
                                    onClick={() => handleOpenPagePicker(item.menu_id)}
                                    title="新增頁面"
                                >
                                    📄<span className="plus-badge green">+</span>
                                </button>
                            </>
                        )}

                        {/* 頁面才有啟用 checkbox */}
                        {!isDirectory && (
                            <label className="checkbox-inline" title="啟用">
                                <input
                                    type="checkbox"
                                    checked={item.is_active}
                                    onChange={() => handleToggleActive(item.menu_id)}
                                />
                            </label>
                        )}

                        {/* 排序按鈕 */}
                        <button
                            type="button"
                            className="btn-icon-sm"
                            onClick={() => handleMove(item.menu_id, 'up')}
                            disabled={index === 0}
                            title="上移"
                        >
                            ▲
                        </button>
                        <button
                            type="button"
                            className="btn-icon-sm"
                            onClick={() => handleMove(item.menu_id, 'down')}
                            disabled={index === siblings.length - 1}
                            title="下移"
                        >
                            ▼
                        </button>

                        {/* 刪除 */}
                        <button
                            type="button"
                            className="btn-icon-sm btn-danger"
                            onClick={() => handleDelete(item.menu_id)}
                            title="刪除"
                        >
                            🗑️
                        </button>
                    </div>
                </div>

                {/* 子項目 */}
                {children.length > 0 && (
                    <div className="menu-tree-children">
                        {children.map(child => renderMenuItem(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const topLevelMenus = getChildren(null);

    return (
        <div className="menus-tab">
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* 工具列 */}
            <div className="menus-toolbar">
                <button
                    type="button"
                    className="btn-add-menu"
                    onClick={handleAddTopMenu}
                    disabled={isSaving}
                >
                    📁 新增選單
                </button>
                <button
                    type="button"
                    className={`btn-apply ${hasChanges ? 'active' : ''}`}
                    onClick={handleApply}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? '儲存中...' : '💾 套用'}
                </button>
            </div>

            {/* 選單樹 */}
            <section className="table-section">
                {isLoading ? (
                    <div className="loading">載入中...</div>
                ) : topLevelMenus.length === 0 ? (
                    <div className="empty">尚無選單資料，請點擊「新增選單」建立</div>
                ) : (
                    <div className="menu-tree">
                        {topLevelMenus.map(menu => renderMenuItem(menu))}
                    </div>
                )}
            </section>

            {/* 頁面選擇器 */}
            {showPagePicker && (() => {
                // 動態取得所有可選擇的頁面，依 menu_path 去重
                const seenPaths = new Set<string>();
                const selectablePages = menuItems.filter(m => {
                    if (!m.menu_path || m.isNew) return false;
                    if (seenPaths.has(m.menu_path)) return false;
                    seenPaths.add(m.menu_path);
                    return true;
                });
                return (
                    <div className="modal-overlay" onClick={() => setShowPagePicker(null)}>
                        <div className="function-picker-modal" onClick={e => e.stopPropagation()}>
                            <h3>選擇頁面</h3>
                            <div className="function-picker-list">
                                {selectablePages.length === 0 ? (
                                    <div className="empty-picker">尚無可選擇的頁面</div>
                                ) : (
                                    selectablePages.map(page => (
                                        <label key={page.menu_path} className="function-picker-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedPages.includes(page.menu_path!)}
                                                onChange={(e) => {
                                                    const path = page.menu_path!;
                                                    if (e.target.checked) {
                                                        setSelectedPages([...selectedPages, path]);
                                                    } else {
                                                        setSelectedPages(selectedPages.filter(p => p !== path));
                                                    }
                                                }}
                                            />
                                            <span>{page.menu_name}</span>
                                            <code>{page.menu_path}</code>
                                        </label>
                                    ))
                                )}
                            </div>
                            <div className="function-picker-actions">
                                <button type="button" onClick={() => setShowPagePicker(null)}>取消</button>
                                <button type="button" className="btn-primary" onClick={handleConfirmPages}>確認</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 圖示選擇器 */}
            {showIconPicker && (
                <div className="modal-overlay" onClick={() => setShowIconPicker(null)}>
                    <div className="icon-picker-modal" onClick={e => e.stopPropagation()}>
                        <h3>選擇圖示</h3>
                        <div className="icon-grid">
                            {COMMON_ICONS.map((icon, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className="icon-option"
                                    onClick={() => handleUpdateIcon(showIconPicker, icon)}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                        <div className="icon-picker-footer">
                            <button type="button" onClick={() => setShowIconPicker(null)}>取消</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}




/**
 * 密碼規範 Tab
 */
function PasswordPolicyTab() {
    const [policy, setPolicy] = useState<{
        policy_id: string;
        policy_name: string;
        min_length: number;
        require_uppercase: boolean;
        require_lowercase: boolean;
        require_number: boolean;
        require_special: boolean;
        max_login_attempts: number;
        lockout_duration_min: number;
        password_expire_days: number;
        password_history_count: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPolicy() {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/system/password-policy');
                if (!response.ok) throw new Error('載入失敗');
                const data = await response.json();
                setPolicy(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : '載入失敗');
            } finally {
                setIsLoading(false);
            }
        }
        fetchPolicy();
    }, []);

    /**
     * 儲存密碼規範
     */
    const handleSave = async () => {
        if (!policy) return;
        setIsSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const response = await fetch(`/api/system/password-policy/${policy.policy_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(policy),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || '儲存失敗');
            }
            setSuccessMsg('密碼規範已更新');
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : '儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading">載入中...</div>;
    if (error && !policy) return <div className="error-banner">⚠️ {error}</div>;
    if (!policy) return <div className="empty">尚無密碼規範資料</div>;

    return (
        <div className="password-policy-tab">
            {error && (
                <div className="error-banner">⚠️ {error}</div>
            )}
            {successMsg && (
                <div className="success-banner">✅ {successMsg}</div>
            )}

            <section className="form-section">
                <form className="system-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <h2>🔐 密碼規範設定</h2>

                    <div className="policy-form-grid">
                        {/* 密碼強度設定 */}
                        <div className="policy-form-section">
                            <h4>密碼強度要求</h4>

                            <div className="form-group">
                                <label>最小長度（字元）</label>
                                <input
                                    type="number"
                                    min={4}
                                    max={32}
                                    value={policy.min_length}
                                    onChange={(e) => setPolicy({ ...policy, min_length: Number(e.target.value) })}
                                />
                            </div>

                            <div className="form-group-inline">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={policy.require_uppercase}
                                        onChange={(e) => setPolicy({ ...policy, require_uppercase: e.target.checked })}
                                    />
                                    <span>需要大寫字母</span>
                                </label>
                            </div>

                            <div className="form-group-inline">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={policy.require_lowercase}
                                        onChange={(e) => setPolicy({ ...policy, require_lowercase: e.target.checked })}
                                    />
                                    <span>需要小寫字母</span>
                                </label>
                            </div>

                            <div className="form-group-inline">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={policy.require_number}
                                        onChange={(e) => setPolicy({ ...policy, require_number: e.target.checked })}
                                    />
                                    <span>需要數字</span>
                                </label>
                            </div>

                            <div className="form-group-inline">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={policy.require_special}
                                        onChange={(e) => setPolicy({ ...policy, require_special: e.target.checked })}
                                    />
                                    <span>需要特殊符號</span>
                                </label>
                            </div>
                        </div>

                        {/* 帳號安全設定 */}
                        <div className="policy-form-section">
                            <h4>帳號安全設定</h4>

                            <div className="form-group">
                                <label>最大登入失敗次數</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={policy.max_login_attempts}
                                    onChange={(e) => setPolicy({ ...policy, max_login_attempts: Number(e.target.value) })}
                                />
                            </div>

                            <div className="form-group">
                                <label>帳號鎖定時間（分鐘）</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    value={policy.lockout_duration_min}
                                    onChange={(e) => setPolicy({ ...policy, lockout_duration_min: Number(e.target.value) })}
                                />
                            </div>

                            <div className="form-group">
                                <label>密碼有效期限（天）</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={policy.password_expire_days}
                                    onChange={(e) => setPolicy({ ...policy, password_expire_days: Number(e.target.value) })}
                                />
                                <small>0 表示永不過期</small>
                            </div>

                            <div className="form-group">
                                <label>密碼歷史記錄（不可重複的次數）</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={policy.password_history_count}
                                    onChange={(e) => setPolicy({ ...policy, password_history_count: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? '儲存中...' : '💾 儲存變更'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
