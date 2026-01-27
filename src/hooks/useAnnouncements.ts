/**
 * 公告管理 Hook
 * NOTE: 提供公告資料的狀態管理與操作
 */
import { useState, useEffect, useCallback } from 'react';
import {
    type Announcement,
    type AnnouncementCategory,
    type AnnouncementFormData,
    getAnnouncements,
    getActiveAnnouncements,
    getAnnouncementCategories,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    markAnnouncementAsRead,
} from '../services/announcementApi';

/**
 * 公告管理 Hook（管理員用）
 */
export function useAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [categories, setCategories] = useState<AnnouncementCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 分頁
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // 篩選
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

    // 編輯中的公告
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    /**
     * 載入公告清單
     */
    const loadAnnouncements = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getAnnouncements({
                category_id: categoryFilter || undefined,
                is_active: activeFilter,
                page: currentPage,
                page_size: pageSize,
            });
            setAnnouncements(result.items);
            setTotalCount(result.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : '載入公告失敗');
        } finally {
            setIsLoading(false);
        }
    }, [categoryFilter, activeFilter, currentPage, pageSize]);

    /**
     * 載入類別清單
     */
    const loadCategories = useCallback(async () => {
        try {
            const result = await getAnnouncementCategories();
            setCategories(result.items);
        } catch (err) {
            console.error('載入類別失敗:', err);
        }
    }, []);

    /**
     * 新增公告
     */
    const addAnnouncement = async (data: AnnouncementFormData) => {
        const result = await createAnnouncement(data);
        await loadAnnouncements();
        return result.announcement_id;
    };

    /**
     * 更新公告
     */
    const modifyAnnouncement = async (id: number, data: AnnouncementFormData) => {
        await updateAnnouncement(id, data);
        setEditingAnnouncement(null);
        await loadAnnouncements();
    };

    /**
     * 刪除公告
     */
    const removeAnnouncement = async (id: number) => {
        await deleteAnnouncement(id);
        await loadAnnouncements();
    };

    /**
     * 開始編輯
     */
    const startEdit = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
    };

    /**
     * 取消編輯
     */
    const cancelEdit = () => {
        setEditingAnnouncement(null);
    };

    /**
     * 重新載入
     */
    const refresh = () => {
        loadAnnouncements();
    };

    // 初始載入
    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    return {
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
    };
}

/**
 * 有效公告 Hook（使用者用）
 * NOTE: 載入未讀的有效公告，用於彈窗顯示
 */
export function useActiveAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    /**
     * 載入有效公告
     */
    const loadActiveAnnouncements = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getActiveAnnouncements();
            setAnnouncements(result.items);
            setCurrentIndex(0);
        } catch (err) {
            console.error('載入公告失敗:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 標記當前公告為已讀
     */
    const markCurrentAsRead = async () => {
        const current = announcements[currentIndex];
        if (current) {
            try {
                await markAnnouncementAsRead(current.announcement_id);
            } catch (err) {
                console.error('標記已讀失敗:', err);
            }
        }
    };

    /**
     * 關閉當前公告並顯示下一則
     */
    const closeCurrentAndNext = async () => {
        await markCurrentAsRead();
        if (currentIndex < announcements.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // 全部看完，清空
            setAnnouncements([]);
        }
    };

    /**
     * 關閉所有公告
     */
    const closeAll = async () => {
        // 標記所有為已讀
        for (const announcement of announcements) {
            try {
                await markAnnouncementAsRead(announcement.announcement_id);
            } catch (err) {
                console.error('標記已讀失敗:', err);
            }
        }
        setAnnouncements([]);
    };

    // 初始載入
    useEffect(() => {
        loadActiveAnnouncements();
    }, [loadActiveAnnouncements]);

    return {
        announcements,
        currentAnnouncement: announcements[currentIndex] || null,
        isLoading,
        hasAnnouncements: announcements.length > 0,
        currentIndex,
        totalCount: announcements.length,
        closeCurrentAndNext,
        closeAll,
        refresh: loadActiveAnnouncements,
    };
}
