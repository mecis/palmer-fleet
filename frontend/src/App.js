import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail.js';
import Users from './pages/Users';
import SystemLog from './pages/SystemLog';
import Tracking from './pages/Tracking';
import Drivers from './pages/Drivers';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Načítavam...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vozidla" element={<Vehicles />} />
        <Route path="vozidla/:id" element={<VehicleDetail />} />
        <Route path="pouzivatelia" element={<Users />} />
        <Route path="sledovanie" element={<Tracking />} />
        <Route path="vodici" element={<Drivers />} />
        <Route path="system-log" element={<SystemLog />} />
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