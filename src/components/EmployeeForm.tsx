import React, { useState, useEffect } from 'react';
import type { Member, MemberFormData } from '../types/employee';
import { MEMBER_TYPES } from '../types/employee';
import './EmployeeForm.css';

interface EmployeeFormProps {
    /** 編輯模式下的員工資料 */
    editingEmployee?: Member | null;
    /** 部門選項清單 */
    divisions?: string[];
    /** 表單提交回調 */
    onSubmit: (data: MemberFormData & { emp_id: string }) => void;
    /** 取消編輯回調 */
    onCancel?: () => void;
}

const INITIAL_FORM_DATA: MemberFormData & { emp_id: string } = {
    emp_id: '',
    chinese_name: '',
    name: '',
    division_no: '',
    division_name: '',
    job_title: '',
    email: '',
    cellphone: '',
    office_phone: '',
    birthday: '',
    is_member: true,
    is_manager: false,
    is_intern: false,
    is_consultant: false,
    is_outsourcing: false,
    is_employed: true,
    line_id: '',
    telegram_id: '',
    remark: '',
};

/**
 * 員工資料表單組件
 * NOTE: 支援新增與編輯兩種模式，對應 member 資料表結構
 */
export function EmployeeForm({ editingEmployee, divisions = [], onSubmit, onCancel }: EmployeeFormProps) {
    const [formData, setFormData] = useState<MemberFormData & { emp_id: string }>(INITIAL_FORM_DATA);
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

    const isEditing = !!editingEmployee;

    // 編輯模式下填充表單資料
    useEffect(() => {
        if (editingEmployee) {
            setFormData({
                ...INITIAL_FORM_DATA,
                ...editingEmployee,
            });
        } else {
            setFormData(INITIAL_FORM_DATA);
        }
        setErrors({});
    }, [editingEmployee]);

    /**
     * 驗證表單
     */
    const validate = (): boolean => {
        const newErrors: Partial<Record<string, string>> = {};

        if (!formData.emp_id?.trim()) {
            newErrors.emp_id = '請輸入員工編號';
        }
        if (!formData.chinese_name?.trim()) {
            newErrors.chinese_name = '請輸入中文姓名';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = '電子郵件格式不正確';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * 處理輸入變更
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        // 清除對應欄位的錯誤
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    /**
     * 處理表單提交
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
            if (!isEditing) {
                setFormData(INITIAL_FORM_DATA);
            }
        }
    };

    /**
     * 處理取消
     */
    const handleCancel = () => {
        setFormData(INITIAL_FORM_DATA);
        setErrors({});
        onCancel?.();
    };

    return (
        <form className="employee-form" onSubmit={handleSubmit}>
            <h2 className="form-title">
                {isEditing ? '編輯員工資料' : '新增員工'}
            </h2>

            <div className="form-grid">
                {/* 基本資訊 */}
                <div className="form-group">
                    <label htmlFor="emp_id">員工編號 *</label>
                    <input
                        type="text"
                        id="emp_id"
                        name="emp_id"
                        value={formData.emp_id}
                        onChange={handleChange}
                        placeholder="請輸入員工編號"
                        className={errors.emp_id ? 'error' : ''}
                        disabled={isEditing}
                    />
                    {errors.emp_id && <span className="error-message">{errors.emp_id}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="chinese_name">中文姓名 *</label>
                    <input
                        type="text"
                        id="chinese_name"
                        name="chinese_name"
                        value={formData.chinese_name || ''}
                        onChange={handleChange}
                        placeholder="請輸入中文姓名"
                        className={errors.chinese_name ? 'error' : ''}
                    />
                    {errors.chinese_name && <span className="error-message">{errors.chinese_name}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="name">英文姓名</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        placeholder="English Name"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="division_name">部門</label>
                    <select
                        id="division_name"
                        name="division_name"
                        value={formData.division_name || ''}
                        onChange={handleChange}
                    >
                        <option value="">請選擇部門</option>
                        {divisions.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="job_title">職稱</label>
                    <input
                        type="text"
                        id="job_title"
                        name="job_title"
                        value={formData.job_title || ''}
                        onChange={handleChange}
                        placeholder="請輸入職稱"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="email">電子郵件</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        placeholder="example@company.com"
                        className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="cellphone">手機</label>
                    <input
                        type="tel"
                        id="cellphone"
                        name="cellphone"
                        value={formData.cellphone || ''}
                        onChange={handleChange}
                        placeholder="0912-345-678"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="office_phone">公司分機</label>
                    <input
                        type="text"
                        id="office_phone"
                        name="office_phone"
                        value={formData.office_phone || ''}
                        onChange={handleChange}
                        placeholder="分機號碼"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="birthday">生日</label>
                    <input
                        type="date"
                        id="birthday"
                        name="birthday"
                        value={formData.birthday || ''}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="line_id">LINE ID</label>
                    <input
                        type="text"
                        id="line_id"
                        name="line_id"
                        value={formData.line_id || ''}
                        onChange={handleChange}
                        placeholder="LINE ID"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="telegram_id">Telegram ID</label>
                    <input
                        type="text"
                        id="telegram_id"
                        name="telegram_id"
                        value={formData.telegram_id || ''}
                        onChange={handleChange}
                        placeholder="Telegram ID"
                    />
                </div>

                {/* 員工身份類型 */}
                <div className="form-group form-group-full">
                    <label>員工類型</label>
                    <div className="checkbox-group">
                        {MEMBER_TYPES.map(({ key, label }) => (
                            <label key={key} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name={key}
                                    checked={!!formData[key as keyof typeof formData]}
                                    onChange={handleChange}
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="is_employed"
                                checked={!!formData.is_employed}
                                onChange={handleChange}
                            />
                            <span>在職</span>
                        </label>
                    </div>
                </div>

                {/* 備註 */}
                <div className="form-group form-group-full">
                    <label htmlFor="remark">備註</label>
                    <textarea
                        id="remark"
                        name="remark"
                        value={formData.remark || ''}
                        onChange={handleChange}
                        placeholder="備註說明..."
                        rows={3}
                    />
                </div>
            </div>

            <div className="form-actions">
                {isEditing && (
                    <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                        取消
                    </button>
                )}
                <button type="submit" className="btn btn-primary">
                    {isEditing ? '更新' : '新增'}
                </button>
            </div>
        </form>
    );
}
