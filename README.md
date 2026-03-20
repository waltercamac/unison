# 🌿 Nunayta - Sistema Administrativo Estético Premium

Nunayta es una plataforma integral de gestión para clínicas estéticas y centros médicos, diseñada con un enfoque en la experiencia de usuario (UX) senior y la robustez financiera.

## 🚀 Características Principales

- **Dashboard de Inteligencia**: Resumen de ingresos, egresos y comparativa mensual (MoM) con indicadores de crecimiento.
- **Gestión de Pacientes 360**: Onboarding completo desde recepción hasta la ficha clínica detallada.
- **Control de Inventario**: Sistema de alertas críticas para desabastecimiento de insumos médicos.
- **Agenda de Citas**: Calendario operativo con funciones de re-agendamiento para ausencias.
- **Libro Mayor Contable**: Registro estricto de transacciones para evitar fugas de capital.
- **Seguridad**: Autenticación y control de acceso basado en roles (Admin/Worker) vía Supabase.

## 🛠️ Tecnologías

- **Frontend**: React.js + Vite
- **Estilos**: Tailwind CSS + Shadcn UI
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **Gráficos**: Recharts

## ⚙️ Configuración Local

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Configurar variables de entorno**:
    Copia el archivo `.env.example` a `.env` y rellena las claves de Supabase correspondientes.

3.  **Base de Datos**:
    Ejecuta el script SQL suministrado en `supabase_schema.sql` dentro del editor SQL de Supabase para crear las tablas y políticas.

4.  **Iniciar Servidor de Desarrollo**:
    ```bash
    npm run dev
    ```

## 📄 Licencia

Privado - Uso exclusivo para Clínica Nunayta.
