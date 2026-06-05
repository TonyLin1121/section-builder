import { useState, useEffect, useCallback } from 'react';
import type { LeaveStatRecord, LeaveTypeInfo, LeaveStatsQueryParams } from '../services/leaveStatsApi';
import * as api from '../services/leaveStatsApi';

type SortOrder = 'asc' | 'desc';
type SortBy = 'emp_id' | 'english_name' | 'chinese_name';
type StatsMode = 'year' | 'month';

/**
 * 休假統計管理 Hook
 */
export function useLeaveStats() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [records, setRecords] = useState<LeaveStatRecord[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveTypeInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 統計模式：年度或月份
    const [mode, setMode] = useState<StatsMode>('year');

    // 年度與月份選擇
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedMonth, setSelectedMonth] = useState(String(currentMonth).padStart(2, '0'));

    // 排序狀態
    const [sortBy, setSortBy] = useState<SortBy>('english_name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // 身份別過濾（預設：正職、經理人、工讀生）
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['member', 'manager', 'intern']);
    // 在職狀態過濾（預設：在職）
    const [selectedStatus, setSelectedStatus] = useState<string[]>(['employed']);

    /**
     * 載入統計資料
     */
    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params: LeaveStatsQueryParams = {
                mode,
                year: selectedYear,
                sort_by: sortBy,
                sort_order: sortOrder,
            };

            if (mode === 'month') {
                params.month = selectedMonth;
            }
            if (selectedTypes.length > 0) {
                params.member_types = selectedTypes.join(',');
            }
            if (selectedStatus.length > 0) {
                params.employed_status = selectedStatus.join(',');
            }

            const response = await api.getLeaveStats(params);
            setRecords(response.items);
            setLeaveTypes(response.leave_types);
        } catch (e) {
            setError(e instanceof Error ? e.message : '載入失敗');
            console.error('載入休假統計失敗:', e);
        } finally {
            setIsLoading(false);
        }
    }, [mode, selectedYear, selectedMonth, sortBy, sortOrder, selectedTypes, selectedStatus]);

    // 模式、年度、月份、排序變更時重新載入
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    /**
     * 變更排序
     */
    const handleSort = useCallback((key: SortBy) => {
        if (sortBy === key) {
            // 同一欄位切換排序方向
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // 新欄位預設升序
            setSortBy(key);
            setSortOrder('asc');
        }
    }, [sortBy]);

    /**
     * 切換身份別選項
     */
    const toggleType = useCallback((value: string) => {
        setSelectedTypes(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    }, []);

    /**
     * 切換在職狀態選項
     */
    const toggleStatus = useCallback((value: string) => {
        setSelectedStatus(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    }, []);

    /**
     * 年度選項（當年前後各一年）
     */
    const yearOptions = [
        String(currentYear - 1),
        String(currentYear),
        String(currentYear + 1),
    ];

    /**
     * 月份選項
     */
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: `${i + 1} 月`,
    }));

    return {
        records,
        leaveTypes,
        isLoading,
        error,
        // 模式
        mode,
        setMode,
        // 年度月份
        selectedYear,
        setSelectedYear,
        selectedMonth,
        setSelectedMonth,
        yearOptions,
        monthOptions,
        // 排序
        sortBy,
        sortOrder,
        handleSort,
        // 身份別 / 在職狀態過濾
        selectedTypes,
        toggleType,
        selectedStatus,
        toggleStatus,
        // 操作
        refresh: fetchStats,
    };
}
