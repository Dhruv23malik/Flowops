import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Route guards
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

// Layout
import { AppLayout } from './components/AppLayout';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage').then(m => ({ default: m.WorkflowsPage })));
const WorkflowNewPage = lazy(() => import('./pages/WorkflowNewPage').then(m => ({ default: m.WorkflowNewPage })));
const WorkflowBuilder = lazy(() => import('./features/workflows/builder/WorkflowBuilder').then(m => ({ default: m.WorkflowBuilder })));
const WorkflowEditPage = lazy(() => import('./pages/WorkflowEditPage').then(m => ({ default: m.WorkflowEditPage })));
const SettingsPage = lazy(() => import('./pages/PlaceholderPages').then(m => ({ default: m.SettingsPage })));
const ExecutionsPage = lazy(() => import('./pages/ExecutionsPage').then(m => ({ default: m.ExecutionsPage })));
const ExecutionDetailPage = lazy(() => import('./pages/ExecutionDetailPage').then(m => ({ default: m.ExecutionDetailPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function App() {
  return (
    <Suspense fallback={<div className="page-loader">Loading...</div>}>
      <Routes>
        {/* Public-only routes (redirect to app if logged in) */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes (redirect to login if not logged in) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/app/overview" element={<DashboardPage />} />
            <Route path="/app/workflows" element={<WorkflowsPage />} />
            <Route path="/app/workflows/new" element={<WorkflowNewPage />} />
            <Route path="/app/workflows/:id" element={<WorkflowBuilder />} />
            <Route path="/app/workflows/:id/edit" element={<WorkflowEditPage />} />
            <Route path="/app/executions" element={<ExecutionsPage />} />
            <Route path="/app/executions/:id" element={<ExecutionDetailPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
            {/* Default /app → workflows */}
            <Route path="/app" element={<Navigate to="/app/workflows" replace />} />
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/app/workflows" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
