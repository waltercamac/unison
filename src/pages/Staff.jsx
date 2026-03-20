import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'

export default function Staff() {
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)

    // Nuevo Empleado State
    const [newEmail, setNewEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newFullName, setNewFullName] = useState('')
    const [newRole, setNewRole] = useState('worker')
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        fetchStaff()
    }, [])

    const fetchStaff = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true })

        if (data) setStaff(data)
        setLoading(false)
    }

    const handleRoleChange = async (userId, newRole) => {
        if (!window.confirm(`¿Seguro de cambiar el rol a ${newRole}?`)) return
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
        if (!error) {
            alert('Rol actualizado exitosamente.')
            fetchStaff()
        } else {
            alert('Error cambiando el rol.')
            console.error(error)
        }
    }

    const handleCreateEmployee = async (e) => {
        e.preventDefault()
        setIsCreating(true)

        // Necesitamos que el usuario haya configurado el SERVICE_ROLE_KEY
        if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
            alert('⚠️ ADVERTENCIA DE ENTORNO LOCAL:\n\nFalta configurar VITE_SUPABASE_SERVICE_ROLE_KEY en el archivo .env\n\nSin esta clave especial, el Administrador no puede forzar la creación de cuentas sin cerrar sesión. \n\nAlternativa temporal: Dile al empleado que se "Registre" usando la pestaña pública de creación de cuenta, y luego tú desde aquí le cambias el Rol a Administrador si es necesario.');
            setIsCreating(false)
            return
        }

        // Auth.admin crea al usuario usando Service Role y no desloguea al Admin actual
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: newEmail,
            password: newPassword,
            email_confirm: true,
            user_metadata: {
                full_name: newFullName,
                role: newRole
            }
        })

        if (createError) {
            alert('Error creando cuenta: ' + createError.message)
            setIsCreating(false)
            return
        }

        alert(`Cuenta creada exitosamente para ${newFullName}`)
        setNewEmail(''); setNewPassword(''); setNewFullName(''); setNewRole('worker')
        fetchStaff()
        setIsCreating(false)
    }

    return (
        <div className="space-y-6">
            <Card className="border-accent/20">
                <CardHeader>
                    <CardTitle className="text-xl text-primary font-serif flex items-center gap-2">Registrar Nuevo Empleado (Solo Admin)</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Nombre Completo</label>
                            <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} required className="w-full border rounded-md h-10 px-2 bg-background" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Correo Corporativo</label>
                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="w-full border rounded-md h-10 px-2 bg-background" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Contraseña Temporal</label>
                            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength="6" className="w-full border rounded-md h-10 px-2 bg-background" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Nivel de Acceso</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full border rounded-md h-10 px-2 bg-background">
                                <option value="worker">Especialista / Trabajador</option>
                                <option value="admin">Administrador Total</option>
                            </select>
                        </div>
                        <button type="submit" disabled={isCreating} className="md:col-span-4 bg-primary text-white font-bold tracking-wide uppercase shadow-md py-3 rounded-lg hover:bg-primary/90 hover:shadow-lg transition-all hover-scale disabled:opacity-50 mt-2">
                            {isCreating ? 'Registrando en servidor...' : '➕ Crear Cuenta de Empleado'}
                        </button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-accent/20">
                <CardHeader>
                    <CardTitle className="text-xl text-primary font-serif">Gestión de Empleados Existentes</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando personal...</p>
                    ) : staff.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                    <tr>
                                        <th className="px-4 py-3">Nombre Completo</th>
                                        <th className="px-4 py-3">Correo</th>
                                        <th className="px-4 py-3">Rol / Nivel de Acceso</th>
                                        <th className="px-4 py-3">Fecha de Ingreso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.map((employee) => (
                                        <tr key={employee.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-3 font-medium text-foreground">{employee.full_name || 'Sin nombre'}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{employee.email || 'Email privado'}</td>
                                            <td className="px-4 py-3">
                                                <select
                                                    className={`px-2 py-1 rounded-md text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-primary ${employee.role === 'admin'
                                                        ? 'bg-primary/20 text-primary border-primary/30'
                                                        : 'bg-secondary text-secondary-foreground border-border'
                                                        }`}
                                                    value={employee.role}
                                                    onChange={(e) => handleRoleChange(employee.id, e.target.value)}
                                                >
                                                    <option value="worker">Trabajador</option>
                                                    <option value="admin">Administrador</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {employee.created_at ? format(new Date(employee.created_at), 'dd/MM/yyyy') : '---'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <div className="text-sm text-muted-foreground">
                <p><strong>Nota Administrador:</strong> Cuando creas usuarios manuales vía el sistema, nacen como Trabajador ("worker"). Utiliza esta tabla para promover a un colega al puesto de Administrador.</p>
            </div>
        </div>
    )
}
