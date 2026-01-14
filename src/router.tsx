import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import App from './App';
import { AttendancePage } from './pages/AttendancePage';
import { CodeTablePage } from './pages/CodeTablePage';

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
        path: '/codetable',
        element: <Layout><CodeTablePage /></Layout>,
    },
]);

