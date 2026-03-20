import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Users, Award, CalendarDays, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'

export default function AdminDashboard() {
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 })
    const [dailyStats, setDailyStats] = useState({ income: 0, expense: 0, balance: 0 })
    const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0, balance: 0 })

    // Client growth
    const [clientsCount, setClientsCount] = useState(0)
    const [newClientsThisMonth, setNewClientsThisMonth] = useState(0)
    const [loading, setLoading] = useState(true)

    // New stats states
    const [stockAlerts, setStockAlerts] = useState(0)
    const [prevMonthStats, setPrevMonthStats] = useState({ income: 0, expense: 0 })
    const [momComparison, setMomComparison] = useState([])
    const [chartData, setChartData] = useState([])

    useEffect(() => {
        fetchAdminData()
    }, [])

    const fetchAdminData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Inventory Alerts
            const { data: invData } = await supabase.from('inventory').select('current_stock, minimum_stock')
            if (invData) {
                const alerts = invData.filter(i => Number(i.current_stock) <= Number(i.minimum_stock))
                setStockAlerts(alerts.length)
            }

            // 2. Fetch Financials
            const { data: ledger } = await supabase.from('financial_ledger').select('amount, transaction_type, transaction_date')

            let income = 0; let expense = 0;
            let dailyIncome = 0; let dailyExpense = 0;
            let monthlyIncome = 0; let monthlyExpense = 0;
            let prevMonthIncome = 0; let prevMonthExpense = 0;

            const now = new Date()
            const dynamicToday = now.toISOString().split('T')[0]
            const thisMonthStr = dynamicToday.substring(0, 7)

            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const prevMonthStr = prevMonthDate.toISOString().substring(0, 7)
            const prevMonthLabel = prevMonthDate.toLocaleString('es-ES', { month: 'short' }).toUpperCase()
            const thisMonthLabel = now.toLocaleString('es-ES', { month: 'short' }).toUpperCase()

            const groupedIncome = {}

            if (ledger) {
                ledger.forEach(tx => {
                    const amt = Number(tx.amount) || 0
                    const txDate = tx.transaction_date || ''
                    const isToday = txDate.startsWith(dynamicToday)
                    const isThisMonth = txDate.startsWith(thisMonthStr)
                    const isPrevMonth = txDate.startsWith(prevMonthStr)
                    const dateOnly = txDate.includes('T') ? txDate.split('T')[0] : (txDate || '1970-01-01')

                    if (tx.transaction_type === 'income') {
                        income += amt
                        if (isToday) dailyIncome += amt
                        if (isThisMonth) monthlyIncome += amt
                        if (isPrevMonth) prevMonthIncome += amt
                        groupedIncome[dateOnly] = (groupedIncome[dateOnly] || 0) + amt
                    }
                    if (tx.transaction_type === 'expense') {
                        expense += amt
                        if (isToday) dailyExpense += amt
                        if (isThisMonth) monthlyExpense += amt // Corrected from monthlyIncome
                        if (isPrevMonth) prevMonthExpense += amt
                    }
                })
            }

            setStats({ income, expense, balance: income - expense })
            setDailyStats({ income: dailyIncome, expense: dailyExpense, balance: dailyIncome - dailyExpense })
            setMonthlyStats({ income: monthlyIncome, expense: monthlyExpense, balance: monthlyIncome - monthlyExpense })
            setPrevMonthStats({ income: prevMonthIncome, expense: prevMonthExpense })
            setMomComparison([
                { name: prevMonthLabel, Ingresos: prevMonthIncome, Egresos: prevMonthExpense },
                { name: thisMonthLabel, Ingresos: monthlyIncome, Egresos: monthlyExpense },
            ])

            const sortedDates = Object.keys(groupedIncome).sort().slice(-14)
            setChartData(sortedDates.map(date => ({
                name: date.split('-')[2] + '/' + date.split('-')[1],
                Ingresos: groupedIncome[date]
            })))

            // 3. Fetch clients
            const { data: clData } = await supabase.from('clients').select('registration_date')
            if (clData) {
                setClientsCount(clData.length)
                const newThisMonth = clData.filter(c => c.registration_date?.startsWith(thisMonthStr)).length
                setNewClientsThisMonth(newThisMonth)
            }
        } catch (err) {
            console.error("Dashboard error:", err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center h-full">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-primary font-medium tracking-wide">Analizando finanzas...</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-bold gradient-text">Resumen Ejecutivo</h2>
                    <p className="text-muted-foreground mt-1">Control métrico y financiero de tu centro estético.</p>
                </div>
                <div className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Mes actual: {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            {/* HIGH-END DAILY CLOSURE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="glass-card shadow-lg border-primary/20 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-accent/20 transition-colors duration-1000"></div>
                        <CardHeader className="relative z-10 pb-4">
                            <CardTitle className="text-2xl font-serif text-primary flex items-center gap-2">
                                <Award className="w-6 h-6 text-accent" />
                                Arqueo de Caja — HOY
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-5 bg-background/50 rounded-xl border border-white/40 shadow-sm hover-scale transition-all">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Ingresos de Hoy</p>
                                    <p className="text-3xl font-bold text-green-600">S/ {dailyStats.income.toFixed(2)}</p>
                                </div>
                                <div className="p-5 bg-background/50 rounded-xl border border-white/40 shadow-sm hover-scale transition-all">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Egresos de Hoy</p>
                                    <p className="text-3xl font-bold text-red-500">S/ {dailyStats.expense.toFixed(2)}</p>
                                </div>
                                <div className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl shadow-md hover-scale transition-all transform hover:-translate-y-1">
                                    <p className="text-xs text-primary-foreground/80 uppercase tracking-wider mb-2 font-medium">Caja Final Neta</p>
                                    <p className="text-4xl font-bold tracking-tight">S/ {dailyStats.balance.toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MONTHLY SUMMARY CARD */}
                <div className="lg:col-span-1">
                    <Card className="glass-card h-full border-border/50 hover-scale flex flex-col justify-between shadow-md overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex justify-between items-center">
                                Desempeño del Mes
                                {prevMonthStats.income > 0 && (
                                    <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${monthlyStats.income >= prevMonthStats.income ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}`}>
                                        {monthlyStats.income >= prevMonthStats.income ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {Math.abs(((monthlyStats.income - prevMonthStats.income) / prevMonthStats.income) * 100).toFixed(1)}% vs mes ant.
                                    </div>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-foreground/70 mb-1 font-medium">Rentabilidad MTD (Month-to-Date)</p>
                                <p className={`text-5xl font-black tracking-tighter ${monthlyStats.balance >= 0 ? 'text-accent' : 'text-foreground'}`}>
                                    S/ {monthlyStats.balance.toFixed(2)}
                                </p>
                            </div>

                            <div className="h-[120px] w-full bg-secondary/5 rounded-xl border border-border/30 p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={momComparison}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}}
                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="Ingresos" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-3 border-t border-border/50 pt-4 bg-secondary/10 p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3 text-accent" /> Ingresos</span>
                                    <span className="font-semibold text-accent dark:text-accent">S/ {monthlyStats.income.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3 text-foreground" /> Egresos</span>
                                    <span className="font-semibold text-foreground dark:text-foreground">S/ {monthlyStats.expense.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <h3 className="text-xl font-serif text-foreground mt-8 mb-4">Métricas Globales (Históricas)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                <Card className="glass-card hover-scale">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales (Histórico)</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500 opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">S/ {stats.income.toFixed(2)}</div>
                    </CardContent>
                </Card>

                <Card className="glass-card hover-scale">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Egresos Totales (Histórico)</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500 opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">S/ {stats.expense.toFixed(2)}</div>
                    </CardContent>
                </Card>

                <Card className="glass-card hover-scale bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Balance Histórico</CardTitle>
                        <Award className="h-4 w-4 text-primary opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                            S/ {stats.balance.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card hover-scale">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Base de Clientes</CardTitle>
                        <Users className="h-4 w-4 text-accent" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <div className="text-2xl font-bold text-foreground">{clientsCount}</div>
                            <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full mb-1">
                                +{newClientsThisMonth} este mes
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Leads y clientes registrados</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
