/**
 * useLeaveCalendar Hook
 * NOTE: 管理請假行事曆狀態，包含視圖切換、日期導航和資料載入
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { getCalendarData, type CalendarLeaveRecord } from '../services/attendanceApi';
import { getHolidays, toHolidayMap, type HolidayMap } from '../services/holidayApi';

/** 視圖類型 */
export type CalendarView = 'month' | 'week' | 'day';

/** 按日期和假別分組的請假資料 */
export interface GroupedLeaveData {
    [date: string]: {
        [leaveType: string]: {
            leaveTypeName: string;
            employees: { name: string; period: string | null }[];
        };
    };
}

/**
 * 格式化日期為 YYYYMMDD
 */
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 解析 YYYYMMDD 為 Date
 */
function parseDate(dateStr: string): Date {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
}

/**
 * 取得週的起始日（週一）
 */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

/**
 * 取得週的結束日（週日）
 */
function getWeekEnd(date: Date): Date {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
}

/**
 * 取得月的起始日
 */
function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 取得月的結束日
 */
function getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * 請假行事曆 Hook
 */
export function useLeaveCalendar() {
    const [view, setView] = useState<CalendarView>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [records, setRecords] = useState<CalendarLeaveRecord[]>([]);
    const [holidays, setHolidays] = useState<HolidayMap>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 計算當前視圖的日期範圍
     */
    const dateRange = useMemo(() => {
        let start: Date;
        let end: Date;

        switch (view) {
            case 'day':
                start = new Date(currentDate);
                end = new Date(currentDate);
                break;
            case 'week':
                start = getWeekStart(currentDate);
                end = getWeekEnd(currentDate);
                break;
            case 'month':
            default:
                start = getMonthStart(currentDate);
                end = getMonthEnd(currentDate);
                break;
        }

        return { start, end };
    }, [view, currentDate]);

    /**
     * 產生當前視圖的日期陣列
     */
    const dates = useMemo(() => {
        const result: Date[] = [];
        const current = new Date(dateRange.start);

        while (current <= dateRange.end) {
            result.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return result;
    }, [dateRange]);

    /**
     * 將原始資料按日期和假別分組
     */
    const groupedData = useMemo((): GroupedLeaveData => {
        const grouped: GroupedLeaveData = {};

        for (const record of records) {
            if (!grouped[record.leave_date]) {
                grouped[record.leave_date] = {};
            }

            if (!grouped[record.leave_date][record.leave_type]) {
                grouped[record.leave_date][record.leave_type] = {
                    leaveTypeName: record.leave_type_name,
                    employees: [],
                };
            }

            grouped[record.leave_date][record.leave_type].employees.push({
                name: record.chinese_name || record.emp_id,
                period: record.day_period,
            });
        }

        return grouped;
    }, [records]);

    /**
     * 載入資料
     */
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const startStr = formatDate(dateRange.start);
            const endStr = formatDate(dateRange.end);

            // NOTE: 同時拉取請假記錄和假日資料以減少等待時間
            const [calendarRes, holidayRes] = await Promise.all([
                getCalendarData(startStr, endStr),
                getHolidays(startStr, endStr),
            ]);

            setRecords(calendarRes.items);
            setHolidays(toHolidayMap(holidayRes.items));
        } catch (err) {
            setError(err instanceof Error ? err.message : '載入失敗');
            setRecords([]);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    /**
     * 切換視圖
     */
    const changeView = useCallback((newView: CalendarView) => {
        setView(newView);
    }, []);

    /**
     * 前往今天
     */
    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    /**
     * 前往上一期
     */
    const goToPrevious = useCallback(() => {
        const newDate = new Date(currentDate);
        switch (view) {
            case 'day':
                newDate.setDate(newDate.getDate() - 1);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() - 7);
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() - 1);
                break;
        }
        setCurrentDate(newDate);
    }, [currentDate, view]);

    /**
     * 前往下一期
     */
    const goToNext = useCallback(() => {
        const newDate = new Date(currentDate);
        switch (view) {
            case 'day':
                newDate.setDate(newDate.getDate() + 1);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + 7);
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + 1);
                break;
        }
        setCurrentDate(newDate);
    }, [currentDate, view]);

    /**
     * 取得標題文字
     */
    const title = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        switch (view) {
            case 'day':
                return `${year}年${month}月${currentDate.getDate()}日`;
            case 'week': {
                const startMonth = dateRange.start.getMonth() + 1;
                const endMonth = dateRange.end.getMonth() + 1;
                if (startMonth === endMonth) {
                    return `${year}年${startMonth}月 第${Math.ceil(dateRange.start.getDate() / 7)}週`;
                }
                return `${year}年${startMonth}月-${endMonth}月`;
            }
            case 'month':
            default:
                return `${year}年${month}月`;
        }
    }, [view, currentDate, dateRange]);

    /**
     * 資料載入
     */
    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        // 狀態
        view,
        currentDate,
        dates,
        groupedData,
        holidays,
        isLoading,
        error,
        title,
        dateRange,

        // 操作
        changeView,
        goToToday,
        goToPrevious,
        goToNext,
        refresh: loadData,
    };
}

export { formatDate, parseDate };
