import { useState, useRef, useEffect, useMemo } from 'react';
import './EmployeeSelect.css';

/**
 * 員工資料類型
 */
interface Employee {
    emp_id: string;
    name?: string;
    chinese_name?: string;
    is_employed?: boolean;
}

interface EmployeeSelectProps {
    employees: Employee[];
    value: string;
    onChange: (empId: string) => void;
    disabled?: boolean;
    required?: boolean;
    placeholder?: string;
}

/**
 * 可搜尋的員工選擇組件
 * 
 * 功能說明：
 * - 支援英文名(name)搜尋
 * - 只顯示在職員工
 * - 按英文名排序
 * - 顯示格式：name-中文名-員編
 */
export function EmployeeSelect({
    employees,
    value,
    onChange,
    disabled = false,
    required = false,
    placeholder = '請輸入英文名搜尋或選擇員工'
}: EmployeeSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * 過濾並排序員工列表
     * - 只顯示在職員工
     * - 按 name 英文名排序
     */
    const filteredEmployees = useMemo(() => {
        // 只顯示在職員工
        const employed = employees.filter(emp => emp.is_employed !== false);

        // 按英文名排序
        const sorted = [...employed].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // 根據搜尋文字過濾
        if (!searchText.trim()) {
            return sorted;
        }

        const search = searchText.toLowerCase().trim();
        return sorted.filter(emp => {
            const name = (emp.name || '').toLowerCase();
            const chineseName = (emp.chinese_name || '').toLowerCase();
            const empId = (emp.emp_id || '').toLowerCase();

            return name.includes(search) ||
                chineseName.includes(search) ||
                empId.includes(search);
        });
    }, [employees, searchText]);

    /**
     * 取得選中員工的顯示文字
     */
    const selectedEmployee = useMemo(() => {
        return employees.find(emp => emp.emp_id === value);
    }, [employees, value]);

    const displayText = useMemo(() => {
        if (!selectedEmployee) return '';
        const name = selectedEmployee.name || '';
        const chineseName = selectedEmployee.chinese_name || '';
        const empId = selectedEmployee.emp_id || '';
        // 格式：name-中文名-員編
        const parts = [name, chineseName, empId].filter(Boolean);
        return parts.join('-');
    }, [selectedEmployee]);

    /**
     * 格式化員工顯示選項
     */
    const formatEmployee = (emp: Employee): string => {
        const name = emp.name || '';
        const chineseName = emp.chinese_name || '';
        const empId = emp.emp_id || '';
        // 格式：name-中文名-員編
        const parts = [name, chineseName, empId].filter(Boolean);
        return parts.join('-');
    };

    /**
     * 處理選擇員工
     */
    const handleSelect = (empId: string) => {
        onChange(empId);
        setSearchText('');
        setIsOpen(false);
    };

    /**
     * 處理輸入搜尋文字
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    /**
     * 處理輸入框聚焦
     */
    const handleFocus = () => {
        if (!disabled) {
            setIsOpen(true);
        }
    };

    /**
     * 處理清除選擇
     */
    const handleClear = () => {
        onChange('');
        setSearchText('');
        inputRef.current?.focus();
    };

    /**
     * 點擊外部關閉下拉選單
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchText('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * 鍵盤導航支援
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchText('');
        } else if (e.key === 'Enter' && filteredEmployees.length === 1) {
            // 只有一個結果時按 Enter 直接選擇
            e.preventDefault();
            handleSelect(filteredEmployees[0].emp_id);
        }
    };

    return (
        <div
            className={`employee-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
            ref={containerRef}
        >
            <div className="employee-select-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    className="employee-select-input"
                    placeholder={value ? '' : placeholder}
                    value={isOpen ? searchText : displayText}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    required={required && !value}
                />
                {value && !disabled && (
                    <button
                        type="button"
                        className="employee-select-clear"
                        onClick={handleClear}
                        tabIndex={-1}
                    >
                        ✕
                    </button>
                )}
                <span className="employee-select-arrow">▼</span>
            </div>

            {isOpen && !disabled && (
                <div className="employee-select-dropdown">
                    {filteredEmployees.length === 0 ? (
                        <div className="employee-select-no-result">
                            無符合的員工
                        </div>
                    ) : (
                        <ul className="employee-select-list">
                            {filteredEmployees.map(emp => (
                                <li
                                    key={emp.emp_id}
                                    className={`employee-select-item ${emp.emp_id === value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(emp.emp_id)}
                                >
                                    {formatEmployee(emp)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
