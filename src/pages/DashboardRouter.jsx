import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import WorkerDashboard from './WorkerDashboard'
import AdminDashboard from './AdminDashboard'

export default function DashboardRouter() {
    const { profile } = useAuth()

    if (!profile) return null

    if (profile.role === 'admin') {
        return <AdminDashboard />
    }

    return <WorkerDashboard />
}
