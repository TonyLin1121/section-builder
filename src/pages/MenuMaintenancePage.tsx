/**
 * 選單維護頁面
 * NOTE: 提供 sys_menu 資料表的低階維護功能
 * 可直接編輯所有欄位，適合開發人員新增頁面
 */
import { useState, useEffect, useCallback } from 'react';
import { httpRequest } from '../services/httpClient';
import './MenuMaintenancePage.css';

// 選單資料結構
interface MenuRecord {
    menu_id: string;
    menu_name: string;
    parent_menu_id: string | null;
    menu_path: string | null;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

// 空白記錄
const emptyRecord: MenuRecord = {
    menu_id: '',
    menu_name: '',
    parent_menu_id: null,
    menu_path: null,
    icon: '📄',
    sort_order: 1,
    is_active: true,
};

/**
 * 選單維護頁面
 */
export function MenuMaintenancePage() {
    // 資料狀態
    const [records, setRecords] = useState<MenuRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // 編輯狀態
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<MenuRecord>(emptyRecord);
    const [isCreating, setIsCreating] = useState(false);

    // 搜尋
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * 載入所有選單
     */
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await httpRequest<{ items: MenuRecord[] }>('/system/menus/all');
            setRecords(response.items);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    /**
     * 過濾記錄
     */
    const filteredRecords = records.filter(r =>
        r.menu_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.menu_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.menu_path && r.menu_path.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    /**
     * 開始編輯
     */
    const handleEdit = (record: MenuRecord) => {
        setEditingId(record.menu_id);
        setEditForm({ ...record });
        setIsCreating(false);
    };

    /**
     * 開始新增
     */
    const handleCreate = () => {
        setEditingId(null);
        setEditForm({
            ...emptyRecord,
            menu_id: `MENU_${Date.now().toString(36).toUpperCase()}`,
            sort_order: records.length + 1,
        });
        setIsCreating(true);
    };

    /**
     * 取消編輯
     */
    const handleCancel = () => {
        setEditingId(null);
        setEditForm(emptyRecord);
        setIsCreating(false);
    };

    /**
     * 儲存記錄
     */
    const handleSave = async () => {
        setError(null);
        setSuccessMessage(null);
        try {
            if (isCreating) {
                await httpRequest('/system/menus/create', {
                    method: 'POST',
                    body: JSON.stringify(editForm),
                });
                setSuccessMessage(`成功新增選單：${editForm.menu_id}`);
            } else {
                await httpRequest(`/system/menus/${editForm.menu_id}`, {
                    method: 'PUT',
                    body: JSON.stringify(editForm),
                });
                setSuccessMessage(`成功更新選單：${editForm.menu_id}`);
            }
            handleCancel();
            fetchRecords();
        } catch (e) {
            setError(e instanceof Error ? e.message : '儲存失敗');
        }
    };

    /**
     * 刪除記錄
     */
    const handleDelete = async (menuId: string) => {
        if (!confirm(`確定要刪除選單 ${menuId} 嗎？`)) return;
        setError(null);
        setSuccessMessage(null);
        try {
            await httpRequest(`/system/menus/${menuId}`, { method: 'DELETE' });
            setSuccessMessage(`成功刪除選單：${menuId}`);
            fetchRecords();
        } catch (e) {
            setError(e instanceof Error ? e.message : '刪除失敗');
        }
    };

    /**
     * 複製記錄
     */
    const handleDuplicate = (record: MenuRecord) => {
        setEditingId(null);
        setEditForm({
            ...record,
            menu_id: `${record.menu_id}_COPY`,
            menu_name: `${record.menu_name} (複製)`,
        });
        setIsCreating(true);
    };

    /**
     * 渲染表單
     */
    const renderForm = () => (
        <div className="form-container">
            <h3>{isCreating ? '新增選單' : '編輯選單'}</h3>
            <div className="form-grid">
                <div className="form-group">
                    <label>選單 ID *</label>
                    <input
                        type="text"
                        value={editForm.menu_id}
                        onChange={(e) => setEditForm({ ...editForm, menu_id: e.target.value })}
                        disabled={!isCreating}
                        placeholder="例：MENU_PROJECT"
                    />
                    <small>唯一識別碼，新增後不可修改</small>
                </div>
                <div className="form-group">
                    <label>選單名稱 *</label>
                    <input
                        type="text"
                        value={editForm.menu_name}
                        onChange={(e) => setEditForm({ ...editForm, menu_name: e.target.value })}
                        placeholder="例：專案管理"
                    />
                </div>
                <div className="form-group">
                    <label>父選單 ID</label>
                    <select
                        value={editForm.parent_menu_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, parent_menu_id: e.target.value || null })}
                    >
                        <option value="">無（頂層選單）</option>
                        {records.filter(r => !r.menu_path && r.menu_id !== editForm.menu_id).map(r => (
                            <option key={r.menu_id} value={r.menu_id}>{r.menu_name}</option>
                        ))}
                    </select>
                    <small>選擇父選單可建立階層結構</small>
                </div>
                <div className="form-group">
                    <label>路由路徑</label>
                    <input
                        type="text"
                        value={editForm.menu_path || ''}
                        onChange={(e) => setEditForm({ ...editForm, menu_path: e.target.value || null })}
                        placeholder="例：/projects/stats"
                    />
                    <small>前端路由路徑，空白表示這是目錄</small>
                </div>
                <div className="form-group">
                    <label>圖示</label>
                    <input
                        type="text"
                        value={editForm.icon || ''}
                        onChange={(e) => setEditForm({ ...editForm, icon: e.target.value || null })}
                        placeholder="例：📊"
                    />
                </div>
                <div className="form-group">
                    <label>排序順序</label>
                    <input
                        type="number"
                        value={editForm.sort_order}
                        onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })}
                        min={1}
                    />
                </div>
                <div className="form-group checkbox">
                    <label>
                        <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        />
                        啟用
                    </label>
                </div>
            </div>
            <div className="form-actions">
                <button className="btn-secondary" onClick={handleCancel}>取消</button>
                <button className="btn-primary" onClick={handleSave}>
                    {isCreating ? '新增' : '儲存'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="menu-maintenance-page">
            <header className="page-header">
                <h1>🔧 選單維護</h1>
            </header>

            {/* 工具列 */}
            <div className="toolbar">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="搜尋 ID、名稱、路徑..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={handleCreate}>
                    ➕ 新增選單
                </button>
                <button className="btn-secondary" onClick={fetchRecords}>
                    🔄 重新載入
                </button>
            </div>

            {/* 訊息 */}
            {error && <div className="message error">⚠️ {error}</div>}
            {successMessage && <div className="message success">✅ {successMessage}</div>}

            {/* 編輯表單 */}
            {(isCreating || editingId) && renderForm()}

            {/* 資料表格 */}
            <div className="table-container">
                {isLoading ? (
                    <div className="loading">載入中...</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>menu_id</th>
                                <th>menu_name</th>
                                <th>parent_menu_id</th>
                                <th>menu_path</th>
                                <th>icon</th>
                                <th>sort_order</th>
                                <th>is_active</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="empty">無資料</td>
                                </tr>
                            ) : (
                                filteredRecords.map(record => (
                                    <tr key={record.menu_id} className={editingId === record.menu_id ? 'editing' : ''}>
                                        <td className="id-cell">{record.menu_id}</td>
                                        <td>{record.menu_name}</td>
                                        <td className="nullable">{record.parent_menu_id || <span className="null">NULL</span>}</td>
                                        <td className="path-cell nullable">
                                            {record.menu_path || <span className="null">NULL</span>}
                                        </td>
                                        <td className="icon-cell">{record.icon}</td>
                                        <td className="number-cell">{record.sort_order}</td>
                                        <td className={`status-cell ${record.is_active ? 'active' : 'inactive'}`}>
                                            {record.is_active ? '✓' : '✗'}
                                        </td>
                                        <td className="actions-cell">
                                            <button title="編輯" onClick={() => handleEdit(record)}>✏️</button>
                                            <button title="複製" onClick={() => handleDuplicate(record)}>📋</button>
                                            <button title="刪除" onClick={() => handleDelete(record.menu_id)}>🗑️</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 統計 */}
            <div className="stats-bar">
                <span>共 {records.length} 筆記錄</span>
                <span>啟用：{records.filter(r => r.is_active).length}</span>
                <span>停用：{records.filter(r => !r.is_active).length}</span>
                <span>目錄：{records.filter(r => !r.menu_path).length}</span>
                <span>頁面：{records.filter(r => r.menu_path).length}</span>
            </div>
        </div>
    );
}
