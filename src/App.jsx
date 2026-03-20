import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardRouter from './pages/DashboardRouter'
import Clients from './pages/Clients'
import Ledger from './pages/Ledger'
import Appointments from './pages/Appointments'
import Inventory from './pages/Inventory'
import Services from './pages/Services'
import Staff from './pages/Staff'
import ClientProfile from './pages/ClientProfile'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardRouter />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientProfile />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="services" element={<Services />} />
              <Route path="staff" element={<Staff />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
