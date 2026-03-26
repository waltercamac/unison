import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Activity, CreditCard, PlusCircle, CheckCircle, FileText, AlertTriangle, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ClientProfile() {
    const { id } = useParams()
    const { profile } = useAuth()
    const [activeTab, setActiveTab] = useState('clinical')
    const [loading, setLoading] = useState(true)

    // Data states
    const [client, setClient] = useState(null)
    const [plans, setPlans] = useState([])
    const [sessions, setSessions] = useState([])
    const [payments, setPayments] = useState([])
    const [services, setServices] = useState([])

    // Módulos Forms
    const [newPlanService, setNewPlanService] = useState('')
    const [newPlanSessions, setNewPlanSessions] = useState(1)
    const [newPlanCost, setNewPlanCost] = useState('')

    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('efectivo')
    const [paymentPlanId, setPaymentPlanId] = useState('')

    // UX States
    const [processing, setProcessing] = useState(false)
    const [showSessionForm, setShowSessionForm] = useState(null)
    const [sessionNotes, setSessionNotes] = useState('')
    const [showAddPlan, setShowAddPlan] = useState(false)

    useEffect(() => {
        fetchClientData()
    }, [id])

    const fetchClientData = async () => {
        setLoading(true)
        const { data: cData } = await supabase.from('clients').select('*').eq('id', id).single()
        if (cData) setClient(cData)

        const { data: pData } = await supabase.from('treatment_plans').select('*, services(name, price)').eq('client_id', id).order('created_at', { ascending: false })
        if (pData) setPlans(pData)

        if (pData?.length > 0) {
            const planIds = pData.map(p => p.id)
            const { data: sData } = await supabase.from('client_sessions').select('*, profiles(full_name)').in('treatment_plan_id', planIds).order('session_date', { ascending: false })
            if (sData) setSessions(sData)

            const { data: payData } = await supabase.from('client_payments').select('*, profiles(full_name)').in('treatment_plan_id', planIds).order('payment_date', { ascending: false })
            if (payData) setPayments(payData)
        }

        const { data: srvData } = await supabase.from('services').select('*').order('name')
        if (srvData) setServices(srvData)

        setLoading(false)
    }

    const handleServiceChange = (serviceId) => {
        setNewPlanService(serviceId)
        const srv = services.find(s => s.id === serviceId)
        if (srv) {
            // El catálogo manda el precio del tratamiento total
            setNewPlanCost(Number(srv.price).toFixed(2))
        } else {
            setNewPlanCost('')
        }
    }

    const handleSessionsChange = (qty) => {
        setNewPlanSessions(qty)
        // El precio final viene del catálogo por paquete, NO se multiplica por sesiones automáticamente.
    }

    const handleAddPlan = async (e) => {
        e.preventDefault()
        setProcessing(true)
        try {
            const { error } = await supabase.from('treatment_plans').insert([{
                client_id: id,
                service_id: newPlanService,
                total_sessions: parseInt(newPlanSessions),
                total_cost: parseFloat(parseFloat(newPlanCost || 0).toFixed(2))
            }])
            if (error) throw new Error(error.message)

            setNewPlanService(''); setNewPlanCost(''); setNewPlanSessions(1)
            setShowAddPlan(false)
            await fetchClientData()
        } catch (err) {
            alert("Error asignando plan: " + err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleConfirmSession = async (planId) => {
        if (!sessionNotes.trim()) {
            alert("Por favor ingresa una nota de la sesión (ej. 'Tratamiento facial completado sin dolor').")
            return
        }
        setProcessing(true)
        try {
            const { error } = await supabase.from('client_sessions').insert([{
                treatment_plan_id: planId,
                notes: sessionNotes,
                worker_id: profile?.id
            }])
            if (error) throw new Error(error.message)

            setSessionNotes('')
            setShowSessionForm(null)
            await fetchClientData() // Force UI update
        } catch (err) {
            alert("Error guardando sesión clínica: " + err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleAddPayment = async (e) => {
        e.preventDefault()
        setProcessing(true)
        try {
            const { error: payErr } = await supabase.from('client_payments').insert([{
                treatment_plan_id: paymentPlanId,
                amount: parseFloat(paymentAmount),
                payment_method: paymentMethod,
                registered_by: profile?.id
            }])
            if (payErr) throw new Error("Error en recibo: " + payErr.message)

            const planName = plans.find(p => p.id === paymentPlanId)?.services?.name || 'Tratamiento'
            const { error: ledgerErr } = await supabase.from('financial_ledger').insert([{
                transaction_type: 'income',
                amount: parseFloat(paymentAmount),
                payment_method: paymentMethod,
                concept: `Abono de ${client?.first_name} - ${planName}`,
                client_id: id,
                registered_by: profile?.id
            }])
            if (ledgerErr) throw new Error("Error registrando dinero en el Libro Mayor: " + ledgerErr.message)

            setPaymentAmount(''); setPaymentMethod('efectivo'); setPaymentPlanId('')
            await fetchClientData()
        } catch (err) {
            alert("⚠️ ALERTA CAJA: " + err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleDeletePayment = async (paymentId) => {
        if (!window.confirm("⚠️ ADVERTENCIA CRÍTICA: Estás a punto de anular un registro financiero. Esto afectará el Saldo Deudor del paciente. ¿Proceder?")) return

        try {
            const { error } = await supabase.from('client_payments').delete().eq('id', paymentId)
            if (error) throw error
            alert('✅ Pago anulado del sistema exitosamente.')
            await fetchClientData() // Refresh list
        } catch (error) {
            console.error(error)
            alert("Error al anular el pago: " + error.message)
        }
    }

    if (loading || !client) return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando expediente Matrix 360...</div>

    const totalDebt = plans.reduce((acc, curr) => acc + Number(curr.total_cost), 0)
    const totalPaid = payments.reduce((acc, curr) => acc + Number(curr.amount), 0)
    const outstanding = totalDebt - totalPaid

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between border-b border-border pb-6">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard/clients" className="bg-secondary/50 p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            {client.first_name} {client.last_name}
                        </h2>
                        <div className="flex gap-3 text-sm mt-1 text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {client.phone}</span>
                            {client.email && <span className="hidden md:inline">• {client.email}</span>}
                            <span className="font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase text-[10px] tracking-wider">
                                {client.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Senior UX */}
            <div className="flex overflow-x-auto gap-2 border-b border-border/50 pb-2 scrollbar-hide">
                <button onClick={() => setActiveTab('clinical')} className={`px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${activeTab === 'clinical' ? 'bg-primary text-white shadow-md' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'}`}>
                    <Activity className="w-4 h-4" /> Evolución Clínica
                </button>
                <button onClick={() => setActiveTab('finance')} className={`px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${activeTab === 'finance' ? 'bg-primary text-white shadow-md' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'}`}>
                    <CreditCard className="w-4 h-4" /> Pagos y Deudas
                </button>
                <button onClick={() => setActiveTab('info')} className={`px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${activeTab === 'info' ? 'bg-primary text-white shadow-md' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'}`}>
                    <FileText className="w-4 h-4" /> Ficha Técnica
                </button>
            </div>

            {/* CLINICAL VIEW */}
            {activeTab === 'clinical' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

                    <div className="flex justify-between items-center mt-6 mb-4">
                        <h3 className="text-2xl font-serif flex items-center gap-2">
                            Planes Activos <span className="bg-secondary text-foreground text-sm py-1 px-3 rounded-full font-sans">{plans.length}</span>
                        </h3>
                        <Button onClick={() => setShowAddPlan(!showAddPlan)} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                            <PlusCircle className="w-4 h-4 mr-2" /> Nuevo Tratamiento
                        </Button>
                    </div>

                    {showAddPlan && (
                        <Card className="glass-card mb-6 border-primary/20 shadow-sm overflow-hidden group animate-in slide-in-from-top-4">
                            <div className="h-1 w-full bg-gradient-to-r from-primary to-accent"></div>
                            <CardHeader className="bg-primary/5 pb-4">
                                <CardTitle className="text-lg text-primary">Vender Nuevo Plan de Tratamiento</CardTitle>
                                <p className="text-xs text-muted-foreground">El sistema autocompletará el costo base, eres libre de modificar el costo total (Ej: Descuento por temporada).</p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleAddPlan} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Servicio Médico</label>
                                        <select value={newPlanService} onChange={e => handleServiceChange(e.target.value)} required className="w-full border rounded-lg h-11 px-3 bg-background focus:ring-2 focus:ring-primary/20 transition-all">
                                            <option value="">Selecciona servicio...</option>
                                            {services.map(s => <option key={s.id} value={s.id}>{s.name} (Catálogo: S/ {s.price})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cant. Sesiones (Total)</label>
                                        <input type="number" min="1" value={newPlanSessions} onChange={e => handleSessionsChange(e.target.value)} required className="w-full border rounded-lg h-11 px-3 bg-background text-lg font-medium" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">Costo Total Final (S/)</label>
                                        <input type="number" step="0.01" value={newPlanCost} onChange={e => setNewPlanCost(e.target.value)} required className="w-full border-2 border-primary/30 rounded-lg h-11 px-3 bg-primary/5 text-lg font-bold text-foreground placeholder:text-muted-foreground/50" placeholder="Pactado con cliente..." />
                                    </div>
                                    <Button type="submit" disabled={processing} className="w-full h-11 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"><PlusCircle className="w-5 h-5 mr-2" /> {processing ? 'Asignando...' : 'Asignar Plan'}</Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {plans.length === 0 && <p className="text-muted-foreground text-sm italic bg-secondary/20 p-4 rounded-xl text-center">No hay biografía clínica registrada. Asigna un plan arriba.</p>}

                    <div className="grid grid-cols-1 gap-6">
                        {plans.map(plan => {
                            const planSessions = sessions.filter(s => s.treatment_plan_id === plan.id)
                            const remaining = plan.total_sessions - planSessions.length
                            const progressPercentage = Math.min((planSessions.length / plan.total_sessions) * 100, 100)

                            return (
                                <Card key={plan.id} className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border/30 gap-4">
                                        <div className="w-full md:w-1/2">
                                            <h4 className="font-bold text-xl text-foreground mb-1">{plan.services?.name}</h4>
                                            <p className="text-xs text-muted-foreground mb-4">Adquirido el {format(new Date(plan.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })} • Deuda Original: <strong className="text-primary">S/ {plan.total_cost}</strong></p>

                                            {/* Bar de Progreso Senior */}
                                            <div className="space-y-1 w-full max-w-sm">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className={`${remaining === 0 ? 'text-accent' : 'text-primary'}`}>Consumido: {planSessions.length} ses.</span>
                                                    <span className="text-muted-foreground">Meta: {plan.total_sessions} ses.</span>
                                                </div>
                                                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-1000 ease-out ${remaining === 0 ? 'bg-accent/100' : 'bg-primary'}`} style={{ width: `${progressPercentage}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-auto flex flex-col items-end gap-2">
                                            {remaining > 0 ? (
                                                <>
                                                    <div className="text-sm font-medium bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary px-3 py-1 rounded-full flex items-center gap-1 mb-1">
                                                        <AlertTriangle className="w-3 h-3" /> Le faltan {remaining} sesiones
                                                    </div>
                                                    {showSessionForm !== plan.id ? (
                                                        <Button onClick={() => setShowSessionForm(plan.id)} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white shadow-md hover-scale">
                                                            <CheckCircle className="w-4 h-4 mr-2" /> Descontar 1 Sesión
                                                        </Button>
                                                    ) : (
                                                        <div className="bg-card border shadow-xl p-4 rounded-xl w-full max-w-sm animate-in zoom-in-95 absolute right-4 z-10 md:static">
                                                            <p className="text-xs font-bold text-primary mb-2">Descontando Sesión #{planSessions.length + 1}</p>
                                                            <textarea autoFocus placeholder="Anotaciones de hoy (Signos vitales, dieta, medidas...)" value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-background mb-3 min-h-[80px]" />
                                                            <div className="flex gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => setShowSessionForm(null)} className="w-1/2">Cancelar</Button>
                                                                <Button size="sm" onClick={() => handleConfirmSession(plan.id)} disabled={processing} className="w-1/2 bg-accent text-white">{processing ? '...' : 'Confirmar Toma'}</Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-sm font-bold text-accent bg-accent/20 border border-accent/50 dark:bg-accent/40 dark:text-accent dark:border-accent/50 px-4 py-2 rounded-xl flex items-center shadow-inner">
                                                    <CheckCircle className="w-5 h-5 mr-2" /> TRATAMIENTO COMPLETADO
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bitácora de Evolución */}
                                    <div className="p-5 bg-muted/10">
                                        <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Bitácora Médica de la Evolución</h5>
                                        {planSessions.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-4">No ha tomado ninguna sesión aún. Haz clic en "Descontar Sesión" cuando venga.</p> : null}

                                        <div className="space-y-0 text-sm relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                            {planSessions.map((s, idx) => (
                                                <div key={s.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-secondary text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow absolute left-0 md:left-1/2 transform -translate-x-1/2 z-10 font-bold text-xs">
                                                        #{planSessions.length - idx}
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-14 md:ml-0 p-4 rounded-xl border border-border/50 bg-card shadow-sm group-hover:border-primary/50 transition-colors">
                                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                                            <div className="font-bold text-primary">{format(new Date(s.session_date), 'dd MMM yyyy', { locale: es })}</div>
                                                            <time className="font-mono text-xs text-muted-foreground">{format(new Date(s.session_date), 'HH:mm')}</time>
                                                        </div>
                                                        <div className="text-slate-600 dark:text-slate-300">{s.notes}</div>
                                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-3 pt-2 border-t border-border/30">Atendido por: {s.profiles?.full_name}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* FINANCE VIEW */}
            {activeTab === 'finance' && (
                <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="glass-card shadow-sm">
                            <CardContent className="p-6">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Volumen Historico Asumido</p>
                                <p className="text-4xl font-black text-foreground">S/ {totalDebt.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-card shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard className="w-16 h-16" /></div>
                            <CardContent className="p-6">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Liquidado a la Caja</p>
                                <p className="text-4xl font-black text-accent">S/ {totalPaid.toFixed(2)}</p>
                            </CardContent>
                        </Card>

                        <Card className={`shadow-md relative overflow-hidden transition-all ${outstanding > 0 ? 'bg-gradient-to-br from-red-50 to-white border-foreground/30 dark:from-red-950/40 dark:to-card dark:border-foreground/30/50' : 'bg-gradient-to-br from-green-50 to-white border-accent/50 dark:from-green-950/40 dark:to-card dark:border-accent/50/50'}`}>
                            <CardContent className="p-6">
                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${outstanding > 0 ? 'text-foreground dark:text-foreground' : 'text-accent dark:text-accent'}`}>
                                    {outstanding > 0 ? '⛔ Saldo Deudor Pendiente' : '✅ 100% Cancelado'}
                                </p>
                                <p className={`text-5xl font-black ${outstanding > 0 ? 'text-foreground dark:text-foreground' : 'text-accent'}`}>
                                    S/ {outstanding.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="glass-card shadow-sm border-primary/20">
                        <CardHeader className="bg-primary/5 border-b border-border/50">
                            <CardTitle className="text-lg text-primary flex items-center gap-2"><CreditCard className="w-5 h-5" /> Cobrar / Abonar Deuda</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {plans.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    <Activity className="w-10 h-10 mx-auto opacity-20 mb-2" />
                                    <p className="text-sm">El cliente no tiene tratamientos para pagar. Ve a "Evolución Clínica" y asígnale uno primero.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                                    <div className="space-y-1 md:col-span-5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pago dirigido al Tratatamiento:</label>
                                        <select value={paymentPlanId} onChange={e => setPaymentPlanId(e.target.value)} required className="w-full border rounded-lg h-11 px-3 bg-background focus:ring-2 focus:ring-primary/20">
                                            <option value="">Seleccionar tratamiento de su historia...</option>
                                            {plans.map(p => <option key={p.id} value={p.id}>🎯 {p.services?.name} (Meta Final: S/ {p.total_cost})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1 md:col-span-3">
                                        <label className="text-xs font-bold uppercase tracking-wider text-accent">Monto del Abono (S/)</label>
                                        <input type="number" step="0.01" min="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required className="w-full border-2 border-accent/50 rounded-lg h-11 px-3 bg-accent/10 dark:bg-accent/20 text-lg font-bold text-accent dark:text-accent placeholder:text-accent/30" placeholder="Ej: 50.00" />
                                    </div>
                                    <div className="space-y-1 md:col-span-4">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Físico o Digital</label>
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required className="w-full border rounded-lg h-11 px-3 bg-background focus:ring-2 focus:ring-primary/20">
                                            <option value="efectivo">💵 Efectivo (Caja Física)</option>
                                            <option value="yape">📱 Yape</option>
                                            <option value="plin">📱 Plin</option>
                                            <option value="tarjeta">💳 Tarjeta (POS)</option>
                                            <option value="transferencia">🏦 Transferencia Bancaria</option>
                                        </select>
                                    </div>
                                    <Button type="submit" disabled={processing} className="md:col-span-12 h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg text-sm font-bold tracking-wide uppercase mt-4 rounded-xl border-2 border-primary/20 transition-all hover-scale">
                                        {processing ? 'Emitiendo Recibo...' : '💳 Validar Ingreso y Trasladar a Caja Contable'}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    <h3 className="text-xl font-serif mt-10 mb-4 border-b border-border pb-2">Central de Recibos Históricos</h3>
                    <div className="border border-border/50 rounded-xl bg-card shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs font-bold tracking-wider text-muted-foreground uppercase bg-secondary/80">
                                <tr>
                                    <th className="px-6 py-4">Sello de Tiempo</th>
                                    <th className="px-6 py-4">Concepto Médico</th>
                                    <th className="px-6 py-4">Canal</th>
                                    <th className="px-6 py-4 text-right">Liquidez</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {payments.length === 0 ? <tr><td colSpan="4" className="px-6 py-10 text-center text-muted-foreground italic">El cliente nunca ha desembolsado dinero en este local.</td></tr> : null}
                                {payments.map(pay => {
                                    const pName = plans.find(p => p.id === pay.treatment_plan_id)?.services?.name
                                    return (
                                        <tr key={pay.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-foreground">{format(new Date(pay.payment_date), 'dd MMMM yyyy', { locale: es })}</div>
                                                <div className="text-xs text-muted-foreground opacity-70">{format(new Date(pay.payment_date), 'HH:mm:ss')} • Atendido por: {pay.profiles?.full_name}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium">{pName}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground">
                                                    {pay.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-accent text-right text-lg flex justify-end gap-4 items-center">
                                                <span>+S/ {pay.amount.toFixed(2)}</span>
                                                {profile?.role === 'admin' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(pay.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* INFO VIEW */}
            {activeTab === 'info' && (
                <Card className="glass-card shadow-lg animate-in slide-in-from-left-8 duration-500">
                    <CardContent className="p-8">
                        <div className="flex items-start gap-4 p-6 bg-primary/10 dark:bg-primary/20 border-l-4 border-primary/40 rounded-r-xl">
                            <AlertTriangle className="w-6 h-6 text-primary dark:text-primary shrink-0 mt-1" />
                            <div>
                                <h4 className="font-bold text-primary dark:text-primary text-lg mb-2">Advertencias Médicas Base del Cliente:</h4>
                                <p className="text-base text-foreground/80 leading-relaxed font-medium">
                                    {client.medical_notes || 'Ninguna observación médica general provista al registrarse en recepción.'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4 text-sm bg-secondary/20 p-6 rounded-xl border border-border/50">
                            <div>
                                <span className="block text-xs font-bold uppercase text-muted-foreground mb-1">Nombre Legal</span>
                                <p className="font-medium">{client.first_name} {client.last_name}</p>
                            </div>
                            <div>
                                <span className="block text-xs font-bold uppercase text-muted-foreground mb-1">Contacto Principal</span>
                                <p className="font-medium">{client.phone} / {client.email || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="block text-xs font-bold uppercase text-muted-foreground mb-1">Fecha de Ingreso al Sistema</span>
                                <p className="font-medium">{format(new Date(client.registration_date), 'dd MMMM yyyy, HH:mm', { locale: es })}</p>
                            </div>
                            <div>
                                <span className="block text-xs font-bold uppercase text-muted-foreground mb-1">Estado en Directorio</span>
                                <span className="font-bold px-2 py-0.5 rounded-sm bg-primary/20 text-primary uppercase text-[10px]">
                                    {client.status}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
