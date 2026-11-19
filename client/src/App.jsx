import { Routes, Route } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout.jsx'
import ProtectedRoute from '@/components/ProtectedRoute.jsx'
import PublicOnlyRoute from '@/components/PublicOnlyRoute.jsx'
import HomePage from '@/pages/HomePage.jsx'
import ProjectsPage from '@/pages/ProjectsPage.jsx'
import LoginPage from '@/pages/LoginPage.jsx'
import RegisterPage from '@/pages/RegisterPage.jsx'
import NotFoundPage from '@/pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Guest-only routes (redirect authenticated users away) */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        {/* Protected application routes (redirect unauthenticated users to /login) */}
        <Route element={<ProtectedRoute />}>
          <Route index element={<HomePage />} />
          <Route path="projects" element={<ProjectsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
