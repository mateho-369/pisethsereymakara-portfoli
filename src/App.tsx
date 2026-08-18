import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ContentProvider, useContent } from './contexts/ContentContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import GalleryPage from './pages/GalleryPage';
import HomePage from './pages/HomePage';
import AdminLayout from './pages/admin/AdminLayout';
import ContentPanel from './pages/admin/ContentPanel';
import FavoritesPanel from './pages/admin/FavoritesPanel';
import MediaPanel from './pages/admin/MediaPanel';
import OverviewPanel from './pages/admin/OverviewPanel';
import PeoplePanel from './pages/admin/PeoplePanel';
import ProfilePanel from './pages/admin/ProfilePanel';
import StudioPanel from './pages/admin/StudioPanel';

function NotFound() {
  const { text } = useContent();
  return (
    <div className="page-shell py-32 text-center">
      <p className="eyebrow justify-center">{text('notfound.eyebrow', 'A path not taken')}</p>
      <h1 className="mt-5 font-serif text-6xl">404</h1>
      <p className="mt-4 text-[#687064]">{text('notfound.body', 'This trail seems to end here.')}</p>
      <Link to="/" className="btn-primary mt-8">{text('notfound.button', 'Return home')}</Link>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ContentProvider>
            <ToastProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route path="/signup" element={<AuthPage mode="signup" />} />
                  <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route index element={<OverviewPanel />} />
                    <Route path="profile" element={<ProfilePanel />} />
                    <Route path="content" element={<ContentPanel />} />
                    <Route path="favorites" element={<FavoritesPanel />} />
                    <Route path="media" element={<MediaPanel />} />
                    <Route path="people" element={<PeoplePanel />} />
                    <Route path="studio" element={<StudioPanel />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </ToastProvider>
          </ContentProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
