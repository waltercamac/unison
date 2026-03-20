import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, Stethoscope, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function Clients() {
    const { profile } = useAuth()
    const [clients, setClients] = useState([])
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)

    // Wizard State
    const [step, setStep] = useState(1)
    const [processing, setProcessing] = useState(false)

    // Form Step 1: Identidad
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('active')
    const [medicalNotes, setMedicalNotes] = useState('')

    // Form Step 2: Venta Operativa
    const [newPlanService, setNewPlanService] = useState('')
    const [newPlanSessions, setNewPlanSessions] = useState(1)
    const [newPlanCost, setNewPlanCost] = useState('')

    // Form Step 3: Caja
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('efectivo')

    // Derived state for duplicate detection
    const duplicateClients = clients.filter(c =>
        (firstName.length > 2 && c.first_name.toLowerCase().includes(firstName.toLowerCase())) ||
        (lastName.length > 2 && c.last_name.toLowerCase().includes(lastName.toLowerCase()))
    );

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        const [clientsRes, servicesRes] = await Promise.all([
            supabase.from('clients').select('*').order('registration_date', { ascending: false }),
            supabase.from('services').select('*').order('name')
        ])
        if (clientsRes.data) setClients(clientsRes.data)
        if (servicesRes.data) setServices(servicesRes.data)
        setLoading(false)
    }

    // --- Pricing Calculation ---
    const handleServiceChange = (serviceId) => {
        setNewPlanService(serviceId)
        const srv = services.find(s => s.id === serviceId)
        if (srv) {
            setNewPlanCost(Number(srv.price).toFixed(2)) // El catálogo dicta el precio final del paquete
        } else {
            setNewPlanCost('')
        }
    }

    const handleSessionsChange = (qty) => {
        setNewPlanSessions(qty)
        // El precio final viene del catálogo por paquete, NO se multiplica por sesiones
    }

    const resetWizard = () => {
        setStep(1)
        setFirstName(''); setLastName(''); setPhone(''); setEmail(''); setMedicalNotes(''); setStatus('active')
        setNewPlanService(''); setNewPlanSessions(1); setNewPlanCost('')
        setPaymentAmount(''); setPaymentMethod('efectivo')
    }

    // --- Onboarding Transaction ---
    const commitOnboarding = async (buyTreatment = false, payNow = false) => {
        setProcessing(true)

        try {
            // 1. Insert Client
            const { data: clientData, error: clientErr } = await supabase.from('clients').insert([{
                first_name: firstName, last_name: lastName, phone, email, status, medical_notes: medicalNotes, created_by: profile?.id
            }]).select()

            if (clientErr || !clientData) {
                throw new Error('Error al registrar cliente: ' + (clientErr?.message || 'Desconocido'))
            }
            const newClientId = clientData[0].id

            // 2. Insert Treatment Plan (If step 2 completed)
            let newPlanId = null
            if (buyTreatment && newPlanService) {
                const { data: planData, error: planErr } = await supabase.from('treatment_plans').insert([{
                    client_id: newClientId,
                    service_id: newPlanService,
                    total_sessions: parseInt(newPlanSessions),
                    total_cost: parseFloat(parseFloat(newPlanCost || 0).toFixed(2))
                }]).select()

                if (planErr) throw new Error("Fallo creando el plan médico: " + planErr.message)
                if (planData) newPlanId = planData[0].id
            }

            // 3. Insert Payment & Ledger (If step 3 completed)
            if (payNow && newPlanId && paymentAmount && parseFloat(paymentAmount) > 0) {
                const srvName = services.find(s => s.id === newPlanService)?.name || 'Tratamiento'

                const { error: payErr } = await supabase.from('client_payments').insert([{
                    treatment_plan_id: newPlanId,
                    amount: parseFloat(paymentAmount),
                    payment_method: paymentMethod,
                    registered_by: profile?.id
                }])
                if (payErr) throw new Error("Fallo guardando el Recibo de Pago: " + payErr.message)

                const { error: ledgerErr } = await supabase.from('financial_ledger').insert([{
                    transaction_type: 'income',
                    amount: parseFloat(paymentAmount),
                    payment_method: paymentMethod,
                    concept: `Abono Inicial de ${firstName} - ${srvName}`,
                    client_id: newClientId,
                    registered_by: profile?.id
                }])
                if (ledgerErr) throw new Error("Fallo guardando en el Libro Mayor (Caja): " + ledgerErr.message)
            }

            await fetchInitialData()
            resetWizard()
            alert('🎉 ¡Onboarding Completado Exitosamente! Todo el dinero y paciente están asegurados.')
        } catch (err) {
            console.error(err)
            alert("⚠️ ALERTA CRÍTICA: " + err.message + "\nPor favor, verifica tu conexión o reporta a soporte.")
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="border-b border-border/50 pb-6">
                <h2 className="text-3xl font-serif font-bold text-foreground">Mostrador de Recepción</h2>
                <p className="text-muted-foreground mt-1 text-lg">Alta integral de nuevos pacientes, venta de tratamientos y apertura de caja.</p>
            </div>

            {/* WIZARD ONBOARDING */}
            <Card className="glass-card shadow-lg border-primary/20 overflow-hidden relative">
                <div className="h-2 w-full bg-gradient-to-r from-primary to-accent"></div>
                <CardHeader className="bg-primary/5 pb-2">
                    {/* Stepper Visual */}
                    <div className="flex items-center justify-between relative max-w-3xl mx-auto w-full px-4 mb-4">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-border -z-10 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 left-0 h-[2px] bg-primary transition-all duration-500 -z-10 -translate-y-1/2" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>

                        {/* Steps */}
                        {[
                            { num: 1, label: 'Identidad', icon: User },
                            { num: 2, label: 'Tratamiento', icon: Stethoscope },
                            { num: 3, label: 'Caja', icon: Wallet }
                        ].map((s) => (
                            <div key={s.num} className="flex flex-col items-center gap-2 bg-card p-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg transition-all duration-500 shadow-md ${step >= s.num ? 'bg-primary text-white scale-110 shadow-primary/30 border-2 border-white' : 'bg-secondary text-muted-foreground border-2 border-border'}`}>
                                    {step > s.num ? <CheckCircle2 className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-widest ${step >= s.num ? 'text-primary' : 'text-muted-foreground'}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="pt-8">
                    {/* STEP 1: IDENTIDAD */}
                    <div className={step === 1 ? 'block animate-in slide-in-from-left-4' : 'hidden'}>
                        <h3 className="text-xl font-serif font-bold text-primary mb-6 flex items-center gap-2"><User className="w-5 h-5" /> Paso 1: Datos Personales del Prospecto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Nombres</Label>
                                <Input value={firstName} onChange={e => setFirstName(e.target.value)} required className="h-12 bg-background border-primary/20 focus:ring-primary/40 text-lg" placeholder="Nombres completos" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Apellidos</Label>
                                <Input value={lastName} onChange={e => setLastName(e.target.value)} required className="h-12 bg-background border-primary/20 focus:ring-primary/40 text-lg" placeholder="Apellidos" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Teléfono de Contacto</Label>
                                <Input value={phone} onChange={e => setPhone(e.target.value)} required className="h-12 bg-background border-primary/20 focus:ring-primary/40 text-lg font-mono" placeholder="999 999 999" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Email (Opcional)</Label>
                                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 bg-background border-primary/20 focus:ring-primary/40" placeholder="correo@ejemplo.com" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Notas o Alertas Médicas Previas</Label>
                                <Input value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} className="h-12 bg-background border-primary/20 focus:ring-primary/40" placeholder="Ej: Piel hiper-sensible, alergia al látex..." />
                            </div>

                            {duplicateClients.length > 0 && (
                                <div className="md:col-span-2 mt-2 p-4 border border-accent/40 bg-accent/5 rounded-xl animate-in fade-in">
                                    <h4 className="font-bold text-accent text-sm mb-3 flex items-center gap-2">⚠️ Coincidencia de Pacientes (Evitar Duplicados)</h4>
                                    <div className="space-y-2">
                                        {duplicateClients.slice(0, 3).map(dup => (
                                            <div key={dup.id} className="flex flex-col md:flex-row md:justify-between md:items-center bg-background p-3 rounded-lg border border-border/50 shadow-sm gap-2">
                                                <div>
                                                    <div className="font-bold text-foreground hover:text-primary transition-colors cursor-default">{dup.first_name} {dup.last_name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">Contacto: {dup.phone}</div>
                                                </div>
                                                <Button size="sm" asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold border border-border shadow-sm whitespace-nowrap">
                                                    <Link to={`/dashboard/clients/${dup.id}`}>Llenar Ficha Existente &rarr;</Link>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3 italic">Si el paciente es uno de los listados, por favor entra directo a su ficha en lugar de crear un perfil nuevo.</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-10 pt-6 border-t border-border/50">
                            <Button variant="outline" onClick={() => commitOnboarding(false, false)} disabled={!firstName || !lastName || !phone || processing} className="text-muted-foreground hover:text-foreground">
                                Guardar Solo Ficha (Sin Venta)
                            </Button>
                            <Button onClick={() => setStep(2)} disabled={!firstName || !lastName || !phone} className="bg-primary hover:bg-primary/90 text-white h-12 px-8 rounded-full text-base font-bold shadow-lg shadow-primary/30">
                                Continuar a Venta <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>

                    {/* STEP 2: TRATAMIENTO */}
                    <div className={step === 2 ? 'block animate-in slide-in-from-right-4' : 'hidden'}>
                        <h3 className="text-xl font-serif font-bold text-primary mb-6 flex items-center gap-2"><Stethoscope className="w-5 h-5" /> Paso 2: Asignación de Tratamiento Inicial</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                            <div className="space-y-1 md:col-span-3 lg:col-span-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-primary">Servicio del Catálogo</Label>
                                <select value={newPlanService} onChange={e => handleServiceChange(e.target.value)} className="w-full border-2 border-primary/30 rounded-xl h-14 px-4 bg-background focus:ring-4 focus:ring-primary/20 transition-all font-medium text-lg">
                                    <option value="">Selecciona servicio...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} (Catálogo: S/ {s.price})</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-primary">Cant. Sesiones Dadas</Label>
                                <input type="number" min="1" value={newPlanSessions} onChange={e => handleSessionsChange(e.target.value)} className="w-full border-2 border-primary/30 rounded-xl h-14 px-4 bg-background text-2xl font-black text-center" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-accent drop-shadow-sm">Costo Total Final a Pagar (S/)</Label>
                                <input type="number" step="0.01" value={newPlanCost} onChange={e => setNewPlanCost(e.target.value)} className="w-full border-2 border-accent/50 rounded-xl h-14 px-4 bg-accent/5 text-2xl font-black text-accent placeholder:text-accent/30" placeholder="0.00" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-10 pt-6 border-t border-border/50">
                            <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">Antecedente</Button>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => commitOnboarding(true, false)} disabled={!newPlanService || !newPlanCost || processing} className="border-primary text-primary hover:bg-primary/10">
                                    Vender al Crédito (Sin Abono Hoy)
                                </Button>
                                <Button onClick={() => setStep(3)} disabled={!newPlanService || !newPlanCost} className="bg-primary hover:bg-primary/90 text-white h-12 px-8 rounded-full text-base font-bold shadow-lg shadow-primary/30">
                                    Proceder a Caja <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3: CAJA */}
                    <div className={step === 3 ? 'block animate-in slide-in-from-right-4' : 'hidden'}>
                        <h3 className="text-xl font-serif font-bold text-accent mb-6 flex items-center gap-2"><Wallet className="w-5 h-5" /> Paso 3: Retención de Dinero en Caja</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-accent/5 p-6 rounded-2xl border border-accent/20 items-center">
                            <div>
                                <h4 className="font-bold text-foreground text-2xl mb-2">Deuda total del cliente: <span className="text-accent underline decoration-accent/50">S/ {parseFloat(newPlanCost || 0).toFixed(2)}</span></h4>
                                <p className="text-muted-foreground">Registre cuánto dejará de abono inicial el día de hoy para abrir el tratamiento.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-accent">Monto Recibido Ahora (S/)</Label>
                                    <input type="number" step="0.01" min="0.01" max={newPlanCost} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full border-2 border-accent/50 rounded-xl h-16 px-6 bg-background text-3xl font-black text-foreground shadow-inner" placeholder="0.00" />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Canal de Pago</Label>
                                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border-2 border-border rounded-xl h-12 px-4 bg-background font-medium focus:ring-2 focus:ring-accent/30">
                                        <option value="efectivo">💵 Efectivo (Caja Física)</option>
                                        <option value="yape">📱 Yape</option>
                                        <option value="plin">📱 Plin</option>
                                        <option value="tarjeta">💳 Tarjeta (POS)</option>
                                        <option value="transferencia">🏦 Transferencia Bancaria</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-10 pt-6 border-t border-border/50">
                            <Button variant="ghost" onClick={() => setStep(2)} className="text-muted-foreground">Regresar</Button>
                            <Button onClick={() => commitOnboarding(true, true)} disabled={!paymentAmount || processing} className="bg-accent hover:bg-accent/90 text-white h-14 px-10 rounded-full text-lg font-black tracking-wide shadow-xl shadow-accent/20 hover-scale">
                                {processing ? 'Procesando Integración...' : '✅ Completar Onboarding y Archivar'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Listado de Directorio Histórico */}
            <h3 className="text-2xl font-serif text-foreground mt-12 mb-4 border-b border-border/50 pb-2">Directorio Vivo de Pacientes</h3>
            <Card className="glass-card shadow-sm border-primary/10">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando la bóveda de clientes...</div>
                    ) : clients.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">El directorio está vacío. Realiza el primer onboarding arriba.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                                    <tr>
                                        <th className="px-6 py-4 font-bold tracking-wider">Identidad Legal</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Contacto</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Perfil Médico</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-center">Intervención</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {clients.map((client) => (
                                        <tr key={client.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-base text-foreground mb-1">{client.first_name} {client.last_name}</div>
                                                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-70">
                                                    ID: {client.id.split('-')[0]} • Registrado el {format(new Date(client.registration_date), 'dd MMM yyyy', { locale: es })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-mono text-muted-foreground font-medium">
                                                {client.phone}
                                                <div className="text-xs font-sans mt-0.5 opacity-60">{client.email || 'Sin correo asociado'}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {client.medical_notes ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                                                        Contiene Alertas Previas
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground opacity-50 text-xs italic">Aparentemente Sano</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <Button size="sm" asChild className="bg-foreground text-secondary hover:bg-foreground/80 hover-scale shadow-md rounded-full px-6 font-bold">
                                                    <Link to={`/dashboard/clients/${client.id}`}>Ficha 360 &rarr;</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
