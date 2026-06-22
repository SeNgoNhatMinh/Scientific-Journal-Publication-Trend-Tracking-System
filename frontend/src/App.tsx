import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import MainLayout from "./components/layout/MainLayout"
import AdminLayout from "./components/layout/AdminLayout"
import LandingPage from "./pages/LandingPage"
import SearchPage from "./pages/SearchPage"
import PaperPage from "./pages/PaperPage"
import TrendsPage from "./pages/TrendsPage"
import InsightsPage from "./pages/InsightsPage"
import AuthPage from "./pages/AuthPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import CorpusPage from "./pages/CorpusPage"
import LibraryPage from "./pages/LibraryPage"
import WorkspacesPage from "./pages/WorkspacesPage"
import WorkspaceDetailsPage from "./pages/WorkspaceDetailsPage"
import ProtectedRoute from "./components/layout/ProtectedRoute"
import AdminRoute from "./components/layout/AdminRoute"
import ProfilePage from "./pages/ProfilePage"

// Admin Pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage"
import AdminUsersPage from "./pages/admin/AdminUsersPage"
import AdminCorpusPage from "./pages/admin/AdminCorpusPage"
import AdminMonitoringPage from "./pages/admin/AdminMonitoringPage"
import AdminAuthorsPage from "./pages/admin/AdminAuthorsPage"
import AdminJournalsPage from "./pages/admin/AdminJournalsPage"
import AdminKeywordsPage from "./pages/admin/AdminKeywordsPage"
import AdminTopicsPage from "./pages/admin/AdminTopicsPage"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="trends" element={<TrendsPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="papers/:id" element={<PaperPage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="corpus" element={<CorpusPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="workspaces" element={<WorkspacesPage />} />
            <Route path="workspaces/:id" element={<WorkspaceDetailsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Admin Flow */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="corpus" element={<AdminCorpusPage />} />
            <Route path="monitoring" element={<AdminMonitoringPage />} />
            <Route path="authors" element={<AdminAuthorsPage />} />
            <Route path="journals" element={<AdminJournalsPage />} />
            <Route path="keywords" element={<AdminKeywordsPage />} />
            <Route path="topics" element={<AdminTopicsPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
