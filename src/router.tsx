import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import App from './App';
import { AttendancePage } from './pages/AttendancePage';
import { CodeTablePage } from './pages/CodeTablePage';
import { AnnualLeavePage } from './pages/AnnualLeavePage';
import { ProjectPage } from './pages/ProjectPage';
import { ProjectStatsPage } from './pages/ProjectStatsPage';
import { EmployeeStatsPage } from './pages/EmployeeStatsPage';
import { MenuMaintenancePage } from './pages/MenuMaintenancePage';
import { SystemPage } from './pages/SystemPage';
import { AnnouncementPage } from './pages/AnnouncementPage';
import { LoginPage } from './pages/LoginPage';

/**
 * 路由配置
 * NOTE: 除登入頁外，所有頁面需登入後才能訪問
 * NOTE: 系統管理頁面需要 ADMIN 角色
 */
export const router = createBrowserRouter([
    // 登入頁（不需驗證）
    {
        path: '/login',
        element: <LoginPage />,
    },
    // 受保護頁面
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Layout><App /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/attendance',
        element: (
            <ProtectedRoute>
                <Layout><AttendancePage /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/employees/stats',
        element: (
            <ProtectedRoute>
                <Layout><EmployeeStatsPage /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/annual-leave',
        element: (
            <ProtectedRoute>
                <Layout><AnnualLeavePage /></Layout>
            </ProtectedRoute>
        ),
    },
    // 專案統計（放在 /projects 之前，避免路由衝突）
    {
        path: '/projects/stats',
        element: (
            <ProtectedRoute>
                <Layout><ProjectStatsPage /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/projects',
        element: (
            <ProtectedRoute>
                <Layout><ProjectPage /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/codetable',
        element: (
            <ProtectedRoute>
                <Layout><CodeTablePage /></Layout>
            </ProtectedRoute>
        ),
    },
    // 系統管理（需要 ADMIN 角色）- 支援子路由切換 Tab
    {
        path: '/system',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Layout><SystemPage /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/system/users',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Layout><SystemPage defaultTab="users" /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/system/roles',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Layout><SystemPage defaultTab="roles" /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/system/menus',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Layout><SystemPage defaultTab="menus" /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/system/password-policy',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Layout><SystemPage defaultTab="password-policy" /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/system/menu-maintenance',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Layout><MenuMaintenancePage /></Layout>
            </ProtectedRoute>
        ),
    },
    {
        path: '/system/announcements',
        element: (
            <ProtectedRoute requiredRole="ADMIN">
                <Layout><AnnouncementPage /></Layout>
            </ProtectedRoute>
        ),
    },
]);
