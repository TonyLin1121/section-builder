/**
 * 公告設定頁面
 * NOTE: 提供管理員管理公告的介面
 */
import { useState, useRef } from 'react';
import { useAnnouncements } from '../hooks/useAnnouncements';
import {
    uploadAttachment,
    deleteAttachment,
    getAttachmentDownloadUrl,
    type Announcement,
    type AnnouncementFormData,
    type AnnouncementTarget,
} from '../services/announcementApi';
import { Pagination } from '../components/Pagination';
import './AnnouncementPage.css';

/**
 * 公告設定頁面
 */
export function AnnouncementPage() {
    const {
        announcements,
        categories,
        isLoading,
        error,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalCount,
        categoryFilter,
        setCategoryFilter,
        activeFilter,
        setActiveFilter,
        editingAnnouncement,
        addAnnouncement,
        modifyAnnouncement,
        removeAnnouncement,
        startEdit,
        cancelEdit,
        refresh,
    } = useAnnouncements();

    // 表單狀態
    const [formData, setFormData] = useState<AnnouncementFormData>({
        title: '',
        content: '',
        target_type: 'all',
        category_id: '',
        is_pinned: false,
        is_active: true,
        push_notification: false,
        publish_date: '',
        expire_date: '',
        targets: [],
    });

    // 目標對象輸入
    const [targetInput, setTargetInput] = useState({ type: 'role' as 'role' | 'division' | 'user', value: '' });

    // 附件上傳
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    /**
     * 載入編輯資料到表單
     */
    const loadEditData = (ann: Announcement) => {
        setFormData({
            title: ann.title,
            content: ann.content || '',
            target_type: ann.target_type,
            category_id: ann.category_id || '',
            is_pinned: ann.is_pinned,
            is_active: ann.is_active,
            push_notification: ann.push_notification,
            publish_date: ann.publish_date || '',
            expire_date: ann.expire_date || '',
            targets: ann.targets || [],
        });
    };

    /**
     * 處理表單變更
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    /**
     * 新增目標對象
     */
    const addTarget = () => {
        if (!targetInput.value.trim()) return;
        const newTarget: AnnouncementTarget = {
            target_type: targetInput.type,
            target_value: targetInput.value.trim(),
        };
        setFormData(prev => ({
            ...prev,
            targets: [...(prev.targets || []), newTarget],
        }));
        setTargetInput(prev => ({ ...prev, value: '' }));
    };

    /**
     * 移除目標對象
     */
    const removeTarget = (index: number) => {
        setFormData(prev => ({
            ...prev,
            targets: prev.targets?.filter((_, i) => i !== index) || [],
        }));
    };

    /**
     * 處理表單提交
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAnnouncement) {
                await modifyAnnouncement(editingAnnouncement.announcement_id, formData);
            } else {
                await addAnnouncement(formData);
            }
            resetForm();
        } catch (err) {
            console.error('儲存失敗:', err);
        }
    };

    /**
     * 重設表單
     */
    const resetForm = () => {
        setFormData({
            title: '',
            content: '',
            target_type: 'all',
            category_id: '',
            is_pinned: false,
            is_active: true,
            push_notification: false,
            publish_date: '',
            expire_date: '',
            targets: [],
        });
        cancelEdit();
    };

    /**
     * 處理編輯
     */
    const handleEdit = (ann: Announcement) => {
        startEdit(ann);
        loadEditData(ann);
    };

    /**
     * 處理刪除
     */
    const handleDelete = async (id: number) => {
        try {
            await removeAnnouncement(id);
        } catch (err) {
            console.error('刪除失敗:', err);
        }
    };

    /**
     * 處理附件上傳
     */
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingAnnouncement || !e.target.files?.length) return;

        setUploadingAttachment(true);
        try {
            const file = e.target.files[0];
            await uploadAttachment(editingAnnouncement.announcement_id, file);
            refresh();
        } catch (err) {
            console.error('上傳失敗:', err);
        } finally {
            setUploadingAttachment(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    /**
     * 處理刪除附件
     */
    const handleDeleteAttachment = async (attachmentId: number) => {
        try {
            await deleteAttachment(attachmentId);
            refresh();
        } catch (err) {
            console.error('刪除附件失敗:', err);
        }
    };

    return (
        <div className="announcement-page">
            {/* 頁首 */}
            <header className="page-header">
                <h1>📢 公告管理</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={refresh} disabled={isLoading}>
                        🔄 重新載入
                    </button>
                </div>
            </header>

            {/* 錯誤提示 */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={refresh}>重試</button>
                </div>
            )}

            <main className="page-main">
                <div className="container">
                    {/* 公告表單 */}
                    <section className="section card">
                        <h2 className="section-title">
                            {editingAnnouncement ? '✏️ 編輯公告' : '➕ 新增公告'}
                        </h2>
                        <form onSubmit={handleSubmit} className="announcement-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="category_id">類別</label>
                                    <select
                                        id="category_id"
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleChange}
                                    >
                                        <option value="">-- 選擇類別 --</option>
                                        {categories.map(cat => (
                                            <option key={cat.category_id} value={cat.category_id}>
                                                {cat.icon} {cat.category_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="target_type">公告範圍</label>
                                    <select
                                        id="target_type"
                                        name="target_type"
                                        value={formData.target_type}
                                        onChange={handleChange}
                                    >
                                        <option value="all">全部使用者</option>
                                        <option value="role">指定角色</option>
                                        <option value="division">指定部門</option>
                                        <option value="user">指定個人</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="title">標題 *</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="請輸入公告標題"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="content">內容</label>
                                <textarea
                                    id="content"
                                    name="content"
                                    value={formData.content}
                                    onChange={handleChange}
                                    rows={5}
                                    placeholder="請輸入公告內容"
                                />
                            </div>

                            {/* 目標對象設定 */}
                            {formData.target_type !== 'all' && (
                                <div className="form-group targets-section">
                                    <label>目標對象</label>
                                    <div className="target-input-row">
                                        <select
                                            value={targetInput.type}
                                            onChange={e => setTargetInput(prev => ({ ...prev, type: e.target.value as 'role' | 'division' | 'user' }))}
                                        >
                                            <option value="role">角色</option>
                                            <option value="division">部門</option>
                                            <option value="user">使用者 ID</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={targetInput.value}
                                            onChange={e => setTargetInput(prev => ({ ...prev, value: e.target.value }))}
                                            placeholder={`輸入${targetInput.type === 'role' ? '角色代碼 (如 ADMIN)' : targetInput.type === 'division' ? '部門名稱' : '員工編號'}`}
                                        />
                                        <button type="button" className="btn btn-small" onClick={addTarget}>
                                            新增
                                        </button>
                                    </div>
                                    {formData.targets && formData.targets.length > 0 && (
                                        <ul className="targets-list">
                                            {formData.targets.map((t, idx) => (
                                                <li key={idx}>
                                                    <span className="target-type">{t.target_type}</span>
                                                    <span className="target-value">{t.target_value}</span>
                                                    <button type="button" className="btn-remove" onClick={() => removeTarget(idx)}>✕</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="publish_date">發布日期</label>
                                    <input
                                        type="date"
                                        id="publish_date"
                                        name="publish_date"
                                        value={formData.publish_date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="expire_date">到期日期</label>
                                    <input
                                        type="date"
                                        id="expire_date"
                                        name="expire_date"
                                        value={formData.expire_date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row checkboxes">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_pinned"
                                        checked={formData.is_pinned}
                                        onChange={handleChange}
                                    />
                                    <span>📌 置頂</span>
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                    />
                                    <span>✅ 啟用</span>
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="push_notification"
                                        checked={formData.push_notification}
                                        onChange={handleChange}
                                    />
                                    <span>🔔 推送通知</span>
                                </label>
                            </div>

                            {/* 附件（僅編輯時） */}
                            {editingAnnouncement && (
                                <div className="form-group attachments-section">
                                    <label>📎 附件</label>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        disabled={uploadingAttachment}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingAttachment}
                                    >
                                        {uploadingAttachment ? '上傳中...' : '上傳附件'}
                                    </button>
                                    {editingAnnouncement.attachments && editingAnnouncement.attachments.length > 0 && (
                                        <ul className="attachments-list">
                                            {editingAnnouncement.attachments.map(att => (
                                                <li key={att.attachment_id}>
                                                    <a href={getAttachmentDownloadUrl(att.attachment_id)} target="_blank" rel="noopener noreferrer">
                                                        {att.file_name}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        className="btn-remove"
                                                        onClick={() => handleDeleteAttachment(att.attachment_id)}
                                                    >
                                                        ✕
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {editingAnnouncement ? '💾 儲存變更' : '➕ 新增公告'}
                                </button>
                                {editingAnnouncement && (
                                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                        取消
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    {/* 篩選區 */}
                    <section className="section filter-section">
                        <div className="filter-row">
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                            >
                                <option value="">所有類別</option>
                                {categories.map(cat => (
                                    <option key={cat.category_id} value={cat.category_id}>
                                        {cat.icon} {cat.category_name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={activeFilter === undefined ? '' : String(activeFilter)}
                                onChange={e => setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                            >
                                <option value="">所有狀態</option>
                                <option value="true">啟用中</option>
                                <option value="false">已停用</option>
                            </select>
                        </div>
                    </section>

                    {/* 公告列表 */}
                    <section className="section card">
                        <h2 className="section-title">
                            公告列表
                            <span className="badge-count">{totalCount}</span>
                        </h2>

                        {isLoading ? (
                            <div className="loading">載入中...</div>
                        ) : announcements.length === 0 ? (
                            <div className="empty-state">尚無公告</div>
                        ) : (
                            <table className="announcement-table">
                                <thead>
                                    <tr>
                                        <th>類別</th>
                                        <th>標題</th>
                                        <th>範圍</th>
                                        <th>發布日期</th>
                                        <th>狀態</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {announcements.map(ann => (
                                        <tr key={ann.announcement_id} className={ann.is_pinned ? 'pinned' : ''}>
                                            <td>
                                                {ann.category_icon} {ann.category_name || '-'}
                                            </td>
                                            <td>
                                                {ann.is_pinned && <span className="pin-icon">📌</span>}
                                                {ann.title}
                                            </td>
                                            <td>{ann.target_type === 'all' ? '全部' : ann.target_type}</td>
                                            <td>{ann.publish_date || '-'}</td>
                                            <td>
                                                <span className={`status-badge ${ann.is_active ? 'active' : 'inactive'}`}>
                                                    {ann.is_active ? '啟用' : '停用'}
                                                </span>
                                            </td>
                                            <td className="actions">
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-icon btn-edit"
                                                        onClick={() => handleEdit(ann)}
                                                        title="編輯"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => {
                                                            if (window.confirm(`確定要刪除公告「${ann.title}」嗎？`)) {
                                                                handleDelete(ann.announcement_id);
                                                            }
                                                        }}
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
                        )}

                        {!isLoading && announcements.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalCount={totalCount}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setPageSize}
                            />
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
