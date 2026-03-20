import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Services() {
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)

    const [name, setName] = useState('')
    const [price, setPrice] = useState('')

    useEffect(() => {
        fetchServices()
    }, [])

    const fetchServices = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('services')
            .select('*')
            .order('name', { ascending: true })

        if (data) setServices(data)
        setLoading(false)
    }

    const handleAddService = async (e) => {
        e.preventDefault()
        if (!name || !price) return

        const { error } = await supabase
            .from('services')
            .insert([{ name, price: parseFloat(price) }])

        if (!error) {
            alert('Servicio agregado exitosamente.')
            setName('')
            setPrice('')
            fetchServices()
        } else {
            alert('Error guardando servicio.')
            console.error(error)
        }
    }

    const handleDeleteService = async (id) => {
        if (!window.confirm('¿Seguro de eliminar este servicio del catálogo?')) return
        const { error } = await supabase.from('services').delete().eq('id', id)
        if (!error) fetchServices()
    }

    return (
        <div className="space-y-6">
            <Card className="border-accent/20">
                <CardHeader>
                    <CardTitle className="text-xl text-primary">Añadir Nuevo Servicio</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddService} className="flex flex-col md:flex-row gap-4 items-end mb-4">
                        <div className="w-full md:w-1/2 space-y-2">
                            <Label htmlFor="name">Nombre del Tratamiento/Servicio</Label>
                            <Input id="name" placeholder="Ej. Limpieza Facial Profunda" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="w-full md:w-1/4 space-y-2">
                            <Label htmlFor="price">Precio Base (S/)</Label>
                            <Input id="price" type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                            Guardar Servicio
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-accent/20">
                <CardHeader>
                    <CardTitle className="text-xl text-primary">Catálogo de Servicios</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando...</p>
                    ) : services.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay servicios registrados en el sistema.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {services.map((item) => (
                                <div key={item.id} className="p-4 border border-border rounded-lg bg-secondary/10 flex justify-between items-center shadow-sm">
                                    <div>
                                        <h4 className="font-medium text-foreground">{item.name}</h4>
                                        <p className="text-lg font-bold text-primary mt-1">S/ {item.price}</p>
                                    </div>
                                    <button onClick={() => handleDeleteService(item.id)} className="text-xs text-foreground hover:text-foreground hover:underline">
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
