import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowDownRight, ArrowUpRight, Search, Filter, Download, PlusCircle, LayoutGrid } from 'lucide-react'

export default function Ledger() {
    const { profile } = useAuth()
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)

    // Form
    const [amount, setAmount] = useState('')
    const [concept, setConcept] = useState('')
    const [type, setType] = useState('income')
    const [paymentMethod, setPaymentMethod] = useState('efectivo')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [filterMethod, setFilterMethod] = useState('all')
    const [filterType, setFilterType] = useState('all')

    const fetchLedger = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('financial_ledger')
            .select('*, profiles(full_name)')
            .order('transaction_date', { ascending: false })
            // Fetching more for robust filtering in frontend, ideally should be server-side for scale
            .limit(200)

        if (data) setTransactions(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchLedger()
    }, [])

    const handleCajaSubmit = async (e) => {
        e.preventDefault()
        if (!amount || !concept) return
        setIsSubmitting(true)

        const { error } = await supabase
            .from('financial_ledger')
            .insert([
                {
                    transaction_type: type,
                    amount: parseFloat(amount),
                    concept: concept,
                    payment_method: paymentMethod,
                    registered_by: profile?.id
                }
            ])

        if (!error) {
            setAmount('')
            setConcept('')
            await fetchLedger() // refresh list
        } else {
            alert('Error registrando transacción.')
        }
        setIsSubmitting(false)
    }

    const handleExportCSV = () => {
        const csvRows = []
        csvRows.push(['Fecha', 'Concepto', 'Tipo', 'Metodo de Pago', 'Monto (S/)', 'Usuario Cajero'])

        filteredTransactions.forEach(tx => {
            csvRows.push([
                format(new Date(tx.transaction_date), 'dd/MM/yyyy HH:mm'),
                `"${tx.concept}"`,
                tx.transaction_type === 'income' ? 'Ingreso' : 'Egreso',
                tx.payment_method?.toUpperCase() || 'EFECTIVO',
                tx.amount,
                tx.profiles?.full_name || 'Sistema'
            ])
        })

        const csvString = csvRows.map(row => row.join(',')).join('\\n')
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `caja_export_${format(new Date(), 'ddMMyyyy')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Apply Active Filters
    const filteredTransactions = transactions.filter(tx => {
        const matchSearch = tx.concept.toLowerCase().includes(searchTerm.toLowerCase()) || (tx.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchMethod = filterMethod === 'all' ? true : tx.payment_method === filterMethod
        const matchType = filterType === 'all' ? true : tx.transaction_type === filterType
        return matchSearch && matchMethod && matchType
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2"><LayoutGrid className="w-8 h-8 text-primary" /> Libro Mayor (Caja)</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Control estricto de liquidez y flujos de efectivo. Operaciones inmutables.</p>
                </div>
                {profile?.role === 'admin' && (
                    <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                        <Download className="w-4 h-4 mr-2" /> Exportar Vista a Excel
                    </Button>
                )}
            </div>

            {/* Nuevo Ingreso de Caja */}
            <Card className="border-primary/20 glass-card shadow-sm">
                <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" /> Declarar Movimiento Manual
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleCajaSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                        <div className="space-y-1 md:col-span-2">
                            <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Clasificación</Label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className={`w-full h-11 rounded-lg border-2 px-3 text-sm font-bold ${type === 'income' ? 'border-accent/50 bg-accent/10 text-accent dark:bg-accent/20' : 'border-foreground/30 bg-foreground/5 text-foreground dark:bg-foreground/20'} outline-none focus:ring-2 focus:ring-primary/20 transition-colors`}
                            >
                                <option value="income">Entrada (+)</option>
                                <option value="expense">Salida (-)</option>
                            </select>
                        </div>

                        <div className="space-y-1 md:col-span-3">
                            <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Concepto del Movimiento</Label>
                            <Input placeholder="Ej: Pago de luz, Compra insumos..." value={concept} onChange={(e) => setConcept(e.target.value)} required className="h-11 bg-background" />
                        </div>

                        <div className="space-y-1 md:col-span-3">
                            <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Caja Asignada</Label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full h-11 rounded-lg border px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="efectivo">💵 Bóveda Física (Efectivo)</option>
                                <option value="yape">📱 Yape</option>
                                <option value="plin">📱 Plin</option>
                                <option value="tarjeta">💳 POS Tarjetas</option>
                                <option value="transferencia">🏦 Cuenta Bancaria</option>
                            </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <Label className="uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Monto (S/)</Label>
                            <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required className="h-11 bg-background text-lg font-bold" />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="md:col-span-2 h-11 bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg w-full">
                            {isSubmitting ? '...' : 'Procesar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Filtros e Historial */}
            <Card className="border-accent/20 glass-card shadow-sm overflow-hidden">
                <div className="p-4 bg-secondary/20 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
                    <CardTitle className="text-lg text-foreground font-serif">Auditoría de Transacciones</CardTitle>

                    {/* Filtros */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-auto flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input placeholder="Buscar concepto o cajero..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 bg-background w-full md:w-[200px] text-sm" />
                        </div>
                        <div className="flex items-center gap-2 flex-grow md:flex-grow-0">
                            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 text-xs rounded-md border px-2 bg-background flex-1">
                                <option value="all">Todas</option>
                                <option value="income">Entradas</option>
                                <option value="expense">Salidas</option>
                            </select>
                            <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="h-9 text-xs rounded-md border px-2 bg-background flex-1">
                                <option value="all">Todos Pagos</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="yape">Yape</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="transferencia">Banco</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Consultando Ledger Criptográfico...</p>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <p className="text-sm font-medium">No se encontraron movimientos financieros con estos filtros.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase bg-secondary/80">
                                    <tr>
                                        <th className="px-6 py-4">Sello de Tiempo</th>
                                        <th className="px-6 py-4">Detalle Opeación</th>
                                        <th className="px-6 py-4">Canal / Recaudo</th>
                                        <th className="px-6 py-4">Importe Neto</th>
                                        <th className="px-6 py-4 text-right">Usuario Auditor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-foreground">{format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: es })}</div>
                                                <div className="text-xs text-muted-foreground">{format(new Date(tx.transaction_date), 'HH:mm:ss')}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium">{tx.concept}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${tx.payment_method === 'efectivo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'}`}>
                                                    {tx.payment_method || 'efectivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-1 font-black ${tx.transaction_type === 'income' ? 'text-accent' : 'text-foreground'}`}>
                                                    {tx.transaction_type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                    <span>S/ {tx.amount.toFixed(2)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-muted-foreground uppercase tracking-wider">
                                                {tx.profiles?.full_name || 'Sistema Auto'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
            <p className="text-center text-xs text-muted-foreground opacity-50 uppercase tracking-widest mt-8">Libro Mayor • Auditable e Inmutable</p>
        </div>
    )
}
