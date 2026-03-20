import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Appointments() {
    const { profile } = useAuth()
    const [appointments, setAppointments] = useState([])
    const [clients, setClients] = useState([])
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)

    // Form state
    const [clientId, setClientId] = useState('')
    const [serviceId, setServiceId] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')

    // Eval State
    const [isEval, setIsEval] = useState(false)
    const [evalName, setEvalName] = useState('')
    const [evalPhone, setEvalPhone] = useState('')
    const [processing, setProcessing] = useState(false)

    // Rebook State
    const [rebookId, setRebookId] = useState(null)
    const [rebookDate, setRebookDate] = useState('')
    const [rebookTime, setRebookTime] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)

        const [apptRes, clientsRes, servicesRes] = await Promise.all([
            supabase.from('appointments').select('*, clients(first_name, last_name, phone), services(name)').order('appointment_date', { ascending: true }),
            supabase.from('clients').select('id, first_name, last_name').order('first_name'),
            supabase.from('services').select('id, name').order('name')
        ])

        if (apptRes.data) setAppointments(apptRes.data)
        if (clientsRes.data) setClients(clientsRes.data)
        if (servicesRes.data) setServices(servicesRes.data)

        setLoading(false)
    }

    const handleAddAppointment = async (e) => {
        e.preventDefault()
        if (!serviceId || !date || !time) return
        if (!isEval && !clientId) {
            alert("Selecciona un cliente o marca la opción de Evaluación para registrar un paciente nuevo.")
            return
        }

        setProcessing(true)

        try {
            const dateTimeObj = new Date(`${date}T${time}:00`)
            if (isNaN(dateTimeObj.getTime())) {
                throw new Error("La fecha u hora ingresada es inválida.")
            }
            const dateTime = dateTimeObj.toISOString()

            let targetClientId = clientId

            if (isEval) {
                // Register a temporary prospect client to assign the appointment
                const { data: newClient, error: clientErr } = await supabase.from('clients').insert([{
                    first_name: evalName,
                    last_name: '(Prospecto)',
                    phone: evalPhone,
                    status: 'active',
                    created_by: profile?.id || null
                }]).select()

                if (clientErr || !newClient || newClient.length === 0) {
                    throw new Error("Error creando prospecto de evaluación. Verifica los caracteres o restricciones de red: " + (clientErr?.message || "Desconocido"))
                }
                targetClientId = newClient[0].id
            }

            const { error } = await supabase.from('appointments').insert([{
                client_id: targetClientId,
                service_id: serviceId,
                appointment_date: dateTime,
                status: 'scheduled',
                assigned_worker_id: profile?.id || null
            }])

            if (!error) {
                setClientId(''); setServiceId(''); setDate(''); setTime('')
                setIsEval(false); setEvalName(''); setEvalPhone('')
                fetchData()
            } else {
                throw new Error('Error de Base de Datos programando cita: ' + error.message)
            }
        } catch (err) {
            alert(err.message)
            console.error("Appointment Error:", err)
        } finally {
            setProcessing(false)
        }
    }

    const handleUpdateStatus = async (id, newStatus) => {
        const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id)
        if (!error) fetchData()
    }

    const handleRebook = async (id) => {
        if (!rebookDate || !rebookTime) {
            alert('Por favor selecciona la nueva fecha y hora.')
            return
        }
        try {
            const dateTimeObj = new Date(`${rebookDate}T${rebookTime}:00`)
            if (isNaN(dateTimeObj.getTime())) throw new Error("La fecha u hora ingresada es inválida.")
            const newDateTime = dateTimeObj.toISOString()

            const { error } = await supabase.from('appointments').update({
                status: 'scheduled',
                appointment_date: newDateTime
            }).eq('id', id)

            if (error) throw new Error(error.message)

            fetchData()
            setRebookId(null); setRebookDate(''); setRebookTime('')
        } catch (err) {
            alert("Error al re-agendar: " + err.message)
        }
    }

    // Filtros de vistas
    const activeAppointments = appointments.filter(a => a.status === 'scheduled')
    const noShowAppointments = appointments.filter(a => a.status === 'cancelled') // Reutilizando cancelled por restricción DB

    return (
        <div className="space-y-6">

            {/* Nueva Cita */}
            <Card className="border-accent/20">
                <CardHeader>
                    <CardTitle className="text-xl text-primary font-serif">Programar Nueva Cita</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddAppointment} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-secondary/20 p-6 rounded-xl border border-border/50">

                        <div className="lg:col-span-4 flex items-center gap-2 mb-2">
                            <input type="checkbox" id="eval_toggle" checked={isEval} onChange={e => setIsEval(e.target.checked)} className="w-4 h-4 text-primary" />
                            <Label htmlFor="eval_toggle" className="font-bold text-primary cursor-pointer">Es un paciente nuevo (Evaluación Primera Vez)</Label>
                        </div>

                        {!isEval ? (
                            <div className="space-y-2 lg:col-span-2">
                                <Label htmlFor="client" className="text-xs uppercase font-bold text-muted-foreground">Paciente Existente</Label>
                                <select id="client" value={clientId} onChange={e => setClientId(e.target.value)} required className="w-full h-11 rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary shadow-sm transition-all text-foreground font-medium">
                                    <option value="">-- Buscar en Directorio --</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2 lg:col-span-1 animate-in slide-in-from-left-2">
                                    <Label className="text-xs uppercase font-bold text-accent">Nombres (Nuevo Prospecto)</Label>
                                    <Input value={evalName} onChange={e => setEvalName(e.target.value)} required className="h-11 border-accent/40 bg-accent/5 focus:ring-accent" placeholder="Ej. Maria Lopez" />
                                </div>
                                <div className="space-y-2 lg:col-span-1 animate-in slide-in-from-left-2">
                                    <Label className="text-xs uppercase font-bold text-accent">Teléfono (Importante)</Label>
                                    <Input value={evalPhone} onChange={e => setEvalPhone(e.target.value)} required className="h-11 border-accent/40 bg-accent/5 focus:ring-accent" placeholder="999 999 999" />
                                </div>
                            </>
                        )}

                        <div className="space-y-2 lg:col-span-2">
                            <Label htmlFor="service" className="text-xs uppercase font-bold text-muted-foreground">Servicio a Agendar</Label>
                            <select id="service" value={serviceId} onChange={e => setServiceId(e.target.value)} required className="w-full h-11 rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary shadow-sm font-medium">
                                <option value="">-- Catálogo --</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 lg:col-span-1">
                            <Label htmlFor="date" className="text-xs uppercase font-bold text-muted-foreground">Fecha Planificada</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-11 shadow-sm font-medium" />
                        </div>
                        <div className="space-y-2 lg:col-span-1">
                            <Label htmlFor="time" className="text-xs uppercase font-bold text-muted-foreground">Hora</Label>
                            <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} required className="h-11 shadow-sm font-medium" />
                        </div>
                        <div className="lg:col-span-4 flex justify-end mt-4 pt-4 border-t border-border/50">
                            <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-full shadow-lg hover-scale">
                                {processing ? '...' : (isEval ? 'Registrar Prospecto y Agendar Cita' : 'Confirmar Cita')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Listado de Citas */}
            <Card className="border-accent/20">
                <CardHeader>
                    <CardTitle className="text-xl text-primary flex justify-between items-center font-serif border-b border-border/50 pb-2">
                        Agenda del Día Activa 📅
                        <span className="text-sm font-sans bg-secondary px-3 py-1 rounded-full">{activeAppointments.length} Programadas</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground p-4">Cargando agenda...</p>
                    ) : activeAppointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic bg-secondary/20 p-4 rounded-lg text-center">Toda la agenda está despejada.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3">Fecha y Hora</th>
                                        <th className="px-4 py-3">Paciente / Prospecto</th>
                                        <th className="px-4 py-3">Servicio Asignado</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-center">Acción Inmediata</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeAppointments.map((appt) => (
                                        <tr key={appt.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-3 font-bold text-foreground">
                                                {format(new Date(appt.appointment_date), 'dd MMM yyyy - HH:mm', { locale: es })}
                                            </td>
                                            <td className="px-4 py-3">{appt.clients?.first_name} {appt.clients?.last_name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{appt.services?.name}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                                                    Programada
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 flex justify-center items-center gap-3">
                                                <button onClick={() => handleUpdateStatus(appt.id, 'completed')} className="text-xs font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors">✅ Asistió (Completar)</button>
                                                <button onClick={() => handleUpdateStatus(appt.id, 'cancelled')} className="text-xs font-bold text-accent hover:bg-accent/10 px-2 py-1 rounded transition-colors border border-accent/30 shadow-sm">❌ No Asistió / Cancelar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Panel de Seguimiento "No Asistió" */}
            <h3 className="text-xl font-serif text-accent font-bold mt-12 mb-4">Registro de Cancelaciones y Ausencias ⚠️</h3>
            <Card className="border-accent/30 bg-accent/5 shadow-md">
                <CardContent className="pt-6">
                    {noShowAppointments.length === 0 ? (
                        <p className="text-sm text-foreground/70 italic text-center">Excelente. No hay pacientes ausentes pendientes de re-agendamiento.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {noShowAppointments.map(appt => (
                                <div key={appt.id} className="bg-background border border-accent/20 rounded-xl p-4 shadow-sm relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-accent opacity-5 rounded-bl-full -z-0 group-hover:scale-150 transition-transform"></div>
                                    <div className="relative z-10">
                                        <h4 className="font-bold text-accent mb-1">{appt.clients?.first_name} {appt.clients?.last_name}</h4>
                                        <p className="text-xs font-bold text-primary mb-2 flex items-center gap-1">📞 {appt.clients?.phone || 'Sin número'}</p>
                                        <p className="text-xs text-muted-foreground font-mono mb-2">Faltó el: {format(new Date(appt.appointment_date), 'dd/MM/yyyy HH:mm')}</p>
                                        <p className="text-xs bg-secondary inline-block px-2 py-1 rounded text-foreground font-medium mb-3">Servicio: {appt.services?.name}</p>

                                        {rebookId === appt.id ? (
                                            <div className="mt-2 space-y-2 border-t border-accent/20 pt-3">
                                                <p className="text-[10px] uppercase font-bold text-accent">Nueva Fecha y Hora:</p>
                                                <Input type="date" value={rebookDate} onChange={e => setRebookDate(e.target.value)} className="h-8 text-xs shadow-sm" />
                                                <Input type="time" value={rebookTime} onChange={e => setRebookTime(e.target.value)} className="h-8 text-xs shadow-sm" />
                                                <div className="flex gap-2 pt-1">
                                                    <Button size="sm" onClick={() => handleRebook(appt.id)} className="w-full h-8 text-[11px] bg-primary hover:bg-primary/90 text-white font-bold">Aceptar</Button>
                                                    <Button size="sm" variant="outline" onClick={() => setRebookId(null)} className="w-full h-8 text-[11px]">Cancelar</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button variant="outline" onClick={() => setRebookId(appt.id)} className="w-full border-primary text-primary hover:bg-primary hover:text-white transition-all text-xs h-8">
                                                Re-Agendar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
