/**
 * 請假行事曆頁面
 * NOTE: 以行事曆方式顯示員工請假資訊，支援月/週/日三種視圖
 */
import { useMemo } from 'react';
import { useLeaveCalendar, formatDate, type CalendarView } from '../hooks/useLeaveCalendar';
import type { HolidayMap, HolidayRecord } from '../services/holidayApi';
import './LeaveCalendarPage.css';

/** 星期名稱 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/** 時段標籤 */
function getPeriodLabel(period: string | null): string {
    switch (period) {
        case '1':
            return ' am';
        case '2':
            return ' pm';
        default:
            return '';
    }
}

/**
 * 視圖切換按鈕組
 */
function ViewSwitcher({
    currentView,
    onViewChange,
}: {
    currentView: CalendarView;
    onViewChange: (view: CalendarView) => void;
}) {
    const views: { value: CalendarView; label: string }[] = [
        { value: 'month', label: '月' },
        { value: 'week', label: '週' },
        { value: 'day', label: '日' },
    ];

    return (
        <div className="view-switcher">
            {views.map(({ value, label }) => (
                <button
                    key={value}
                    className={`view-btn ${currentView === value ? 'active' : ''}`}
                    onClick={() => onViewChange(value)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/**
 * 日期導航列
 */
function DateNavigator({
    title,
    onPrevious,
    onNext,
    onToday,
}: {
    title: string;
    onPrevious: () => void;
    onNext: () => void;
    onToday: () => void;
}) {
    return (
        <div className="date-navigator">
            <button className="nav-btn" onClick={onPrevious} title="上一期">
                ◀
            </button>
            <button className="today-btn" onClick={onToday}>
                今天
            </button>
            <button className="nav-btn" onClick={onNext} title="下一期">
                ▶
            </button>
            <span className="nav-title">{title}</span>
        </div>
    );
}

/**
 * 單日格子內容
 */
function DayCell({
    date,
    leaveData,
    isToday,
    isCurrentMonth,
    view,
    holidayInfo,
}: {
    date: Date;
    leaveData:
    | {
        [leaveType: string]: {
            leaveTypeName: string;
            employees: { name: string; period: string | null }[];
        };
    }
    | undefined;
    isToday: boolean;
    isCurrentMonth: boolean;
    view: CalendarView;
    /** 假日/補班日資訊，undefined 代表普通工作日 */
    holidayInfo?: HolidayRecord;
}) {
    const dayNum = date.getDate();

    // NOTE: 判定假日或補班日的 CSS class
    const holidayClass = holidayInfo
        ? holidayInfo.is_holiday
            ? 'is-holiday'
            : 'is-makeup'
        : '';

    // 將請假資料格式化為顯示內容
    const content = useMemo(() => {
        if (!leaveData) return null;

        return Object.entries(leaveData).map(([_, data]) => {
            const employeeList = data.employees
                .map((emp) => `${emp.name}${getPeriodLabel(emp.period)}`)
                .join(', ');

            return (
                <div key={data.leaveTypeName} className="leave-row">
                    <span className="leave-type">{data.leaveTypeName}:</span>
                    <span className="leave-employees">{employeeList}</span>
                </div>
            );
        });
    }, [leaveData]);

    const hasData = leaveData && Object.keys(leaveData).length > 0;

    return (
        <div
            className={`day-cell ${view} ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''
                } ${hasData ? 'has-data' : ''} ${holidayClass}`}
        >
            <div className="day-header">
                <span className={`day-number ${isToday ? 'today-badge' : ''}`}>
                    {dayNum}
                </span>
                {holidayInfo && (
                    <span className={`holiday-tag ${holidayInfo.is_holiday ? 'holiday' : 'makeup'}`}>
                        {holidayInfo.is_holiday ? '(假日)' : '(補班日)'}
                    </span>
                )}
            </div>
            <div className="day-content">{content}</div>
        </div>
    );
}

/**
 * 月視圖行事曆
 */
function MonthView({
    dates,
    groupedData,
    currentDate,
    holidays,
}: {
    dates: Date[];
    groupedData: ReturnType<typeof useLeaveCalendar>['groupedData'];
    currentDate: Date;
    holidays: HolidayMap;
}) {
    const today = new Date();
    const todayStr = formatDate(today);
    const currentMonth = currentDate.getMonth();

    // 補齊月初到週一的空白
    const firstDay = dates[0];
    const firstDayOfWeek = firstDay.getDay();
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // 建立前導日期
    const leadingDates: Date[] = [];
    for (let i = paddingDays; i > 0; i--) {
        const d = new Date(firstDay);
        d.setDate(d.getDate() - i);
        leadingDates.push(d);
    }

    // 補齊月末到週日的空白
    const lastDay = dates[dates.length - 1];
    const lastDayOfWeek = lastDay.getDay();
    const trailingPadding = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

    const trailingDates: Date[] = [];
    for (let i = 1; i <= trailingPadding; i++) {
        const d = new Date(lastDay);
        d.setDate(d.getDate() + i);
        trailingDates.push(d);
    }

    const allDates = [...leadingDates, ...dates, ...trailingDates];

    return (
        <div className="calendar-grid month">
            {/* 星期標題 */}
            <div className="weekday-header">
                {WEEKDAYS.map((day) => (
                    <div key={day} className="weekday-cell">
                        {day}
                    </div>
                ))}
            </div>
            {/* 日期網格 */}
            <div className="days-grid">
                {allDates.map((date) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;
                    const isCurrentMonth = date.getMonth() === currentMonth;

                    return (
                        <DayCell
                            key={dateStr}
                            date={date}
                            leaveData={groupedData[dateStr]}
                            isToday={isToday}
                            isCurrentMonth={isCurrentMonth}
                            view="month"
                            holidayInfo={holidays[dateStr]}
                        />
                    );
                })}
            </div>
        </div>
    );
}

/**
 * 週視圖行事曆
 */
function WeekView({
    dates,
    groupedData,
    holidays,
}: {
    dates: Date[];
    groupedData: ReturnType<typeof useLeaveCalendar>['groupedData'];
    holidays: HolidayMap;
}) {
    const today = new Date();
    const todayStr = formatDate(today);

    return (
        <div className="calendar-grid week">
            {/* 星期標題 */}
            <div className="weekday-header">
                {dates.map((date, index) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;
                    return (
                        <div
                            key={dateStr}
                            className={`weekday-cell ${isToday ? 'today' : ''}`}
                        >
                            <span className="weekday-name">{WEEKDAYS[index]}</span>
                            <span className={`weekday-date ${isToday ? 'today-badge' : ''}`}>
                                {date.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>
            {/* 日期內容 */}
            <div className="days-grid week">
                {dates.map((date) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;

                    return (
                        <DayCell
                            key={dateStr}
                            date={date}
                            leaveData={groupedData[dateStr]}
                            isToday={isToday}
                            isCurrentMonth={true}
                            view="week"
                            holidayInfo={holidays[dateStr]}
                        />
                    );
                })}
            </div>
        </div>
    );
}

/**
 * 日視圖
 */
function DayView({
    dates,
    groupedData,
    holidays,
}: {
    dates: Date[];
    groupedData: ReturnType<typeof useLeaveCalendar>['groupedData'];
    holidays: HolidayMap;
}) {
    const date = dates[0];
    const dateStr = formatDate(date);
    const leaveData = groupedData[dateStr];
    const holidayInfo = holidays[dateStr];
    const today = new Date();
    const isToday = formatDate(today) === dateStr;

    const hasData = leaveData && Object.keys(leaveData).length > 0;

    // NOTE: 日視圖的假日 CSS class
    const holidayClass = holidayInfo
        ? holidayInfo.is_holiday
            ? 'is-holiday'
            : 'is-makeup'
        : '';

    return (
        <div className={`calendar-grid day ${holidayClass}`}>
            <div className={`day-detail ${isToday ? 'today' : ''}`}>
                <div className="day-detail-header">
                    <span className="day-detail-date">
                        {date.getMonth() + 1}月{date.getDate()}日
                    </span>
                    <span className="day-detail-weekday">
                        星期{WEEKDAYS[(date.getDay() + 6) % 7]}
                    </span>
                    {isToday && <span className="today-tag">今天</span>}
                    {holidayInfo && (
                        <span className={`holiday-tag ${holidayInfo.is_holiday ? 'holiday' : 'makeup'}`}>
                            {holidayInfo.is_holiday ? '(假日)' : '(補班日)'}
                        </span>
                    )}
                </div>
                <div className="day-detail-content">
                    {hasData ? (
                        Object.entries(leaveData).map(([_, data]) => (
                            <div key={data.leaveTypeName} className="leave-detail-row">
                                <span className="leave-detail-type">{data.leaveTypeName}</span>
                                <div className="leave-detail-employees">
                                    {data.employees.map((emp, idx) => (
                                        <span key={idx} className="employee-chip">
                                            {emp.name}
                                            {getPeriodLabel(emp.period) && (
                                                <span className="period-tag">
                                                    {getPeriodLabel(emp.period).trim()}
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-leave">今日無請假記錄</div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * 請假行事曆主頁面
 */
export function LeaveCalendarPage() {
    const {
        view,
        currentDate,
        dates,
        groupedData,
        holidays,
        isLoading,
        error,
        title,
        changeView,
        goToToday,
        goToPrevious,
        goToNext,
        refresh,
    } = useLeaveCalendar();

    return (
        <div className="leave-calendar-page">
            {/* 頁面標題列 */}
            <div className="page-header">
                <h1>📆 請假行事曆</h1>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={refresh} disabled={isLoading}>
                        🔄 重新載入
                    </button>
                </div>
            </div>

            {/* 工具列 */}
            <div className="calendar-toolbar">
                <DateNavigator
                    title={title}
                    onPrevious={goToPrevious}
                    onNext={goToNext}
                    onToday={goToToday}
                />
                <ViewSwitcher currentView={view} onViewChange={changeView} />
            </div>

            {/* 錯誤提示 */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={refresh}>重試</button>
                </div>
            )}

            {/* 行事曆主體 */}
            <div className="calendar-container">
                {isLoading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>載入中...</p>
                    </div>
                ) : (
                    <>
                        {view === 'month' && (
                            <MonthView
                                dates={dates}
                                groupedData={groupedData}
                                currentDate={currentDate}
                                holidays={holidays}
                            />
                        )}
                        {view === 'week' && (
                            <WeekView dates={dates} groupedData={groupedData} holidays={holidays} />
                        )}
                        {view === 'day' && (
                            <DayView dates={dates} groupedData={groupedData} holidays={holidays} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
