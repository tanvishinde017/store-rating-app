import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import StoreListPage from './pages/StoreListPage';
import StoreDetailPage from './pages/StoreDetailPage';
import MyRatingsPage from './pages/MyRatingsPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app-main">
        <div className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/stores" element={<StoreListPage />} />
            <Route path="/stores/:id" element={<StoreDetailPage />} />

            <Route
              path="/my-ratings"
              element={
                <ProtectedRoute roles={['USER']}>
                  <MyRatingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/owner"
              element={
                <ProtectedRoute roles={['OWNER']}>
                  <OwnerDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <div className="page">
                  <div className="empty-state">
                    <h3>Page not found</h3>
                    <a className="btn btn-primary" href="/">
                      Go home
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <span>Store Rating Application — React + Express + MySQL</span>
        </div>
      </footer>
    </div>
  );
}