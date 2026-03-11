import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Categories } from './pages/Categories';
import { UserEvaluation } from './pages/UserEvaluation';
import { Lottery } from './pages/Lottery';
import { MerchantInfo } from './pages/MerchantInfo';
import { ProductManagement } from './pages/ProductManagement';
import { Balance } from './pages/Balance';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout><Outlet /></Layout>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/users-evaluations" element={<UserEvaluation />} />
          <Route path="/lottery" element={<Lottery />} />
          <Route path="/merchant" element={<MerchantInfo />} />
          <Route path="/balance" element={<Balance />} />
          <Route path="/products/categories" element={<ProductManagement />} />
          <Route path="/products/manager" element={<ProductManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;