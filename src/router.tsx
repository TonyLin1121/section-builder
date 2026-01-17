import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import App from './App';
import { AttendancePage } from './pages/AttendancePage';
import { CodeTablePage } from './pages/CodeTablePage';
import { AnnualLeavePage } from './pages/AnnualLeavePage';
import { ProjectPage } from './pages/ProjectPage';

/**
 * 路由配置
 */
export const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout><App /></Layout>,
    },
    {
        path: '/attendance',
        element: <Layout><AttendancePage /></Layout>,
    },
    {
        path: '/annual-leave',
        element: <Layout><AnnualLeavePage /></Layout>,
    },
    {
        path: '/projects',
        element: <Layout><ProjectPage /></Layout>,
    },
    {
        path: '/codetable',
        element: <Layout><CodeTablePage /></Layout>,
    },
]);
