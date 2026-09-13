import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Route guards
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

// Layout
import { AppLayout } from './components/AppLayout';

// Auth pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// App pages
import { DashboardPage } from './pages/DashboardPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { WorkflowNewPage } from './pages/WorkflowNewPage';
import { WorkflowBuilder } from './features/workflows/builder/WorkflowBuilder';
import { WorkflowEditPage } from './pages/WorkflowEditPage';
import { SettingsPage } from './pages/PlaceholderPages';
import { ExecutionsPage } from './pages/ExecutionsPage';
import { ExecutionDetailPage } from './pages/ExecutionDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
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
  );
}

export default App;
