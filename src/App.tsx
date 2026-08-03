import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import GalleryPage from './pages/GalleryPage';
import HomePage from './pages/HomePage';

function NotFound() {
  return <div className="page-shell py-32 text-center"><p className="eyebrow justify-center">A path not taken</p><h1 className="mt-5 font-serif text-6xl">404</h1><p className="mt-4 text-[#687064]">This trail seems to end here.</p><a href="/" className="btn-primary mt-8">Return home</a></div>;
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
