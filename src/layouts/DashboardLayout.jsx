import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Home, Users, Calendar, Package, DollarSign, Sparkles } from 'lucide-react'

export default function DashboardLayout() {
    const { profile, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const isAdmin = profile?.role === 'admin'

    const isActive = (path) => {
        if (path === '/dashboard' && location.pathname === '/dashboard') return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
        return false;
    }

    const navLinkClass = (path) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive(path) ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-secondary text-muted-foreground'}`

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border flex flex-col">
                <div className="p-6">
                    <h2 className="text-2xl font-serif text-primary font-bold">Nunayta</h2>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{profile?.role}</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                        <Home className="w-4 h-4" />
                        Inicio
                    </Link>
                    <Link to="/dashboard/clients" className={navLinkClass('/dashboard/clients')}>
                        <Users className="w-4 h-4" />
                        Clientes
                    </Link>
                    <Link to="/dashboard/appointments" className={navLinkClass('/dashboard/appointments')}>
                        <Calendar className="w-4 h-4" />
                        Citas
                    </Link>
                    <Link to="/dashboard/ledger" className={navLinkClass('/dashboard/ledger')}>
                        <DollarSign className="w-4 h-4" />
                        Caja (Ingresos/Egresos)
                    </Link>
                    {isAdmin && (
                        <>
                            <Link to="/dashboard/inventory" className={navLinkClass('/dashboard/inventory')}>
                                <Package className="w-4 h-4" />
                                Inventario
                            </Link>
                            <Link to="/dashboard/services" className={navLinkClass('/dashboard/services')}>
                                <Sparkles className="w-4 h-4" />
                                Catálogo de Servicios
                            </Link>
                            <Link to="/dashboard/staff" className={navLinkClass('/dashboard/staff')}>
                                <Users className="w-4 h-4" />
                                Empleados
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="mb-4">
                        <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 border-b border-border bg-card flex items-center px-8">
                    <h1 className="text-lg font-medium text-primary">Panel de Control</h1>
                </header>
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
