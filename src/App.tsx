import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LoadingState from './components/LoadingState';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ContentProvider, useContent } from './contexts/ContentContext';
import { ThemeProvider } from './contexts/ThemeContext';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const ContentPanel = lazy(() => import('./pages/admin/ContentPanel'));
const FavoritesPanel = lazy(() => import('./pages/admin/FavoritesPanel'));
const MediaPanel = lazy(() => import('./pages/admin/MediaPanel'));
const OverviewPanel = lazy(() => import('./pages/admin/OverviewPanel'));
const PeoplePanel = lazy(() => import('./pages/admin/PeoplePanel'));
const ProfilePanel = lazy(() => import('./pages/admin/ProfilePanel'));
const StudioPanel = lazy(() => import('./pages/admin/StudioPanel'));

function NotFound() {
  const { text } = useContent();
  return <div className="page-shell py-32 text-center"><p className="eyebrow justify-center">{text('notfound.eyebrow', 'A path not taken')}</p><h1 className="mt-5 font-serif text-6xl">404</h1><p className="mt-4 text-[#687064]">{text('notfound.body', 'This trail seems to end here.')}</p><Link to="/" className="btn-primary mt-8">{text('notfound.button', 'Return home')}</Link></div>;
}

export default function App() {
  return <ThemeProvider><BrowserRouter><AuthProvider><ContentProvider><ToastProvider><Suspense fallback={<LoadingState label="Opening the page…" />}><Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<HomePage />} /><Route path="/gallery" element={<GalleryPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} /><Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<OverviewPanel />} /><Route path="profile" element={<ProfilePanel />} />
        <Route path="content" element={<ContentPanel />} /><Route path="favorites" element={<FavoritesPanel />} />
        <Route path="media" element={<MediaPanel />} /><Route path="people" element={<PeoplePanel />} /><Route path="studio" element={<StudioPanel />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes></Suspense></ToastProvider></ContentProvider></AuthProvider></BrowserRouter></ThemeProvider>;
}
