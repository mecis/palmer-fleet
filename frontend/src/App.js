import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Users from './pages/Users';
import SystemLog from './pages/SystemLog';
import Drivers from './pages/Drivers';
import Reminders from './pages/Reminders';
import WdDebug from './pages/WdDebug';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Načítavam...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  const isVodic = user?.rola === 'vodic';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vozidla" element={<Vehicles />} />
        <Route path="vodici" element={<Drivers />} />
        {!isVodic && <Route path="pouzivatelia" element={<Users />} />}
        {!isVodic && <Route path="upomienky" element={<Reminders />} />}
        {!isVodic && <Route path="system-log" element={<SystemLog />} />}
        {user?.rola === 'admin' && <Route path="wd-debug" element={<WdDebug />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;