import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, PackageSearch, PackagePlus, ArrowUpRight, ArrowDownRight, Archive } from 'lucide-react'

export default function Inventory() {
    const [inventory, setInventory] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Form
    const [productName, setProductName] = useState('')
    const [currentStock, setCurrentStock] = useState('')
    const [minStock, setMinStock] = useState('')

    useEffect(() => {
        fetchInventory()
    }, [])

    const fetchInventory = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('inventory')
            .select('*')
            .order('product_name', { ascending: true })

        if (data) setInventory(data)
        setLoading(false)
    }

    const handleAddProduct = async (e) => {
        e.preventDefault()
        if (!productName || !currentStock) return

        const { error } = await supabase
            .from('inventory')
            .insert([
                {
                    product_name: productName,
                    current_stock: parseInt(currentStock),
                    minimum_stock: minStock ? parseInt(minStock) : 0
                }
            ])

        if (!error) {
            setProductName(''); setCurrentStock(''); setMinStock('')
            fetchInventory()
        } else {
            alert('Error guardando suministro.')
            console.error(error)
        }
    }

    const filteredInventory = inventory.filter(item => item.product_name.toLowerCase().includes(searchTerm.toLowerCase()))

    // Alertas
    const outOfStock = inventory.filter(i => i.current_stock === 0)
    const lowStock = inventory.filter(i => i.current_stock > 0 && i.current_stock <= i.minimum_stock)
    const healthyStock = inventory.filter(i => i.current_stock > i.minimum_stock)

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2"><Archive className="w-8 h-8 text-primary" /> Inteligencia de Inventario</h2>
                    <p className="text-muted-foreground mt-1">Control de suministros médicos, cremas y materiales logísticos.</p>
                </div>
            </div>

            {/* Smart Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card shadow-sm border-l-4 border-l-red-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase text-foreground dark:text-foreground">Agotados (0)</p>
                            <p className="text-3xl font-black">{outOfStock.length}</p>
                        </div>
                        <AlertCircle className="w-10 h-10 text-foreground/20" />
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-sm border-l-4 border-l-amber-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase text-primary dark:text-primary">Por Acabar (Crítico)</p>
                            <p className="text-3xl font-black">{lowStock.length}</p>
                        </div>
                        <ArrowDownRight className="w-10 h-10 text-primary/20" />
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-sm border-l-4 border-l-green-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase text-accent dark:text-accent">Stock Saludable</p>
                            <p className="text-3xl font-black">{healthyStock.length}</p>
                        </div>
                        <ArrowUpRight className="w-10 h-10 text-accent/20" />
                    </CardContent>
                </Card>
            </div>

            {/* Formulario Ingreso */}
            <Card className="border-accent/20 glass-card">
                <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
                    <CardTitle className="text-lg text-primary flex items-center gap-2"><PackagePlus className="w-5 h-5" /> Registrar Suministro al Almacén</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <form onSubmit={handleAddProduct} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-2/5 space-y-2">
                            <Label className="uppercase text-xs font-bold text-muted-foreground">Nombre del Insumo</Label>
                            <Input placeholder="Ej: Ácido Hialurónico 5ml" value={productName} onChange={e => setProductName(e.target.value)} required className="h-11 bg-background" />
                        </div>
                        <div className="w-full md:w-1/5 space-y-2">
                            <Label className="uppercase text-xs font-bold text-muted-foreground">Stock Ingresado</Label>
                            <Input type="number" min="0" value={currentStock} onChange={e => setCurrentStock(e.target.value)} required className="h-11 font-bold bg-background text-lg" />
                        </div>
                        <div className="w-full md:w-1/5 space-y-2">
                            <Label className="uppercase text-xs font-bold text-muted-foreground">Límite de Alerta</Label>
                            <Input type="number" min="0" value={minStock} onChange={e => setMinStock(e.target.value)} placeholder="Ej: 5" className="h-11 bg-background" />
                        </div>
                        <Button type="submit" className="w-full md:w-auto h-11 px-8 bg-primary font-bold shadow-md hover:shadow-lg">
                            Añadir
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Tabla Inteligente */}
            <Card className="border-accent/20 shadow-sm overflow-hidden glass-card">
                <div className="p-4 border-b border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 bg-secondary/10">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">Malla de Inventario Central</CardTitle>
                    <div className="relative w-full md:w-64">
                        <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input placeholder="Buscar insumo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 border-primary/20 bg-background" />
                    </div>
                </div>
                <div className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground animate-pulse">Analizando almacén...</div>
                    ) : filteredInventory.length === 0 ? (
                        <div className="p-8 text-center py-12">
                            <Archive className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                            <p className="text-muted-foreground text-sm font-medium">No se encontraron productos en la base de datos.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase bg-secondary/80">
                                    <tr>
                                        <th className="px-6 py-4">Insumo</th>
                                        <th className="px-6 py-4 text-center">En Bodega</th>
                                        <th className="px-6 py-4 text-center">Reserva Mínima</th>
                                        <th className="px-6 py-4">Estado del Sistema</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredInventory.map((item) => {
                                        const isOut = item.current_stock === 0;
                                        const isLow = item.current_stock > 0 && item.current_stock <= item.minimum_stock;
                                        const isHealthy = item.current_stock > item.minimum_stock;

                                        return (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-foreground">{item.product_name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-xl font-black ${isOut ? 'text-foreground' : isLow ? 'text-primary' : 'text-foreground'}`}>
                                                        {item.current_stock}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-muted-foreground">{item.minimum_stock}</td>
                                                <td className="px-6 py-4">
                                                    {isOut && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-foreground/10 text-foreground dark:bg-foreground/30 dark:text-foreground border border-foreground/30 dark:border-foreground/30 shadow-sm"><AlertCircle className="w-3 h-3 mr-1" /> Agotado Total</span>}
                                                    {isLow && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary border border-primary/40 dark:border-primary/40 shadow-sm"><ArrowDownRight className="w-3 h-3 mr-1" /> Riesgo Quiebre</span>}
                                                    {isHealthy && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-accent/20 text-accent dark:bg-accent/30 dark:text-accent border border-accent/50 dark:border-accent/50 shadow-sm"><ArrowUpRight className="w-3 h-3 mr-1" /> Abastecido</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
