import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function WorkerDashboard() {
    const { profile } = useAuth()
    const [potentialClients, setPotentialClients] = useState([])
    const [todayAppointments, setTodayAppointments] = useState([])

    const [loading, setLoading] = useState(true)

    // Caja rápida form state
    const [amount, setAmount] = useState('')
    const [concept, setConcept] = useState('')
    const [type, setType] = useState('income')

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)

        // Fetch potential clients
        const { data: clients } = await supabase
            .from('clients')
            .select('*')
            .eq('status', 'potential')
            .order('registration_date', { ascending: false })
            .limit(5)

        // Fetch today's appointments
        const today = new Date().toISOString().split('T')[0]
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*, clients(first_name, last_name), services(name)')
            .gte('appointment_date', `${today}T00:00:00Z`)
            .lt('appointment_date', `${today}T23:59:59Z`)
            .order('appointment_date', { ascending: true })

        if (clients) setPotentialClients(clients)
        if (appointments) setTodayAppointments(appointments)

        setLoading(false)
    }

    const handleCajaSubmit = async (e) => {
        e.preventDefault()
        if (!amount || !concept) return

        const { error } = await supabase
            .from('financial_ledger')
            .insert([
                {
                    transaction_type: type,
                    amount: parseFloat(amount),
                    concept: concept,
                    registered_by: profile?.id
                }
            ])

        if (!error) {
            alert(`Registro exitoso: ${type === 'income' ? 'Ingreso' : 'Egreso'} de S/ ${amount}`)
            setAmount('')
            setConcept('')
        } else {
            alert('Error registrando transacción.')
            console.error(error)
        }
    }

    if (loading) return <div>Cargando panel...</div>

    return (
        <div className="space-y-6">

            {/* Quick Action: Caja Fuerte (Registro Rápido) */}
            <section>
                <h2 className="text-xl font-medium text-foreground mb-4">Registro en Caja</h2>
                <Card className="border-accent/20">
                    <CardContent className="pt-6">
                        <form onSubmit={handleCajaSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full md:w-1/4 space-y-2">
                                <Label htmlFor="type">Tipo</Label>
                                <select
                                    id="type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="income">Ingreso (+)</option>
                                    <option value="expense">Egreso (-)</option>
                                </select>
                            </div>

                            <div className="w-full md:w-1/3 space-y-2">
                                <Label htmlFor="amount">Monto (S/)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="w-full md:w-1/2 space-y-2">
                                <Label htmlFor="concept">Concepto</Label>
                                <Input
                                    id="concept"
                                    type="text"
                                    placeholder="Ej: Pago total facial, Compra crema..."
                                    value={concept}
                                    onChange={(e) => setConcept(e.target.value)}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                                Registrar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Tablero de Llamadas */}
                <Card className="border-accent/20">
                    <CardHeader>
                        <CardTitle className="text-lg text-primary">Llamadas Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {potentialClients.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay clientes potenciales pendientes de llamada.</p>
                        ) : (
                            <ul className="space-y-3">
                                {potentialClients.map(client => (
                                    <li key={client.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
                                        <div>
                                            <p className="font-medium text-sm">{client.first_name} {client.last_name}</p>
                                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                                            Llamar
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Citas del Día */}
                <Card className="border-accent/20">
                    <CardHeader>
                        <CardTitle className="text-lg text-primary">Agenda del Día</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayAppointments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay citas programadas para hoy.</p>
                        ) : (
                            <ul className="space-y-3">
                                {todayAppointments.map(appt => (
                                    <li key={appt.id} className="flex flex-col p-3 bg-secondary/30 rounded-md">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-medium text-sm">{appt.clients?.first_name} {appt.clients?.last_name}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full ${appt.status === 'completed' ? 'bg-accent/20 text-accent' : 'bg-accent/20 text-foreground'}`}>
                                                {format(new Date(appt.appointment_date), 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{appt.services?.name}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    )
}
