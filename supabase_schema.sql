-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla Perfiles (Staff)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Configurar RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles AS admin_check WHERE admin_check.id = auth.uid() AND admin_check.role = 'admin')
);

-- 2. Tabla Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL CHECK (status IN ('potential', 'active')),
  medical_notes TEXT,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers and Admins can view clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Workers and Admins can insert clients" ON clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Workers and Admins can update clients" ON clients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only Admins can delete clients" ON clients FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Tabla Servicios
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view services" ON services FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only Admins can insert/update/delete services" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Tabla Citas (Appointments)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  assigned_worker_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage appointments" ON appointments FOR ALL USING (auth.role() = 'authenticated');

-- 5. Tabla Financiera (Ledger)
CREATE TABLE financial_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'yape', 'plin', 'tarjeta', 'transferencia')),
  concept TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  registered_by UUID REFERENCES profiles(id),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can view ledger" ON financial_ledger FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Workers can insert into ledger" ON financial_ledger FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Solo admins pueden actualizar/borrar pagos
CREATE POLICY "Only admins can update/delete ledger" ON financial_ledger FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can delete ledger" ON financial_ledger FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Tabla Inventario (Suministros)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 5,
  last_updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory" ON inventory FOR ALL USING (auth.role() = 'authenticated');

-- =========================================
-- V2 TABLES: CLINICAL CRM & PAYMENTS
-- =========================================

-- 7. Planes de Tratamiento (Paquetes y Deudas)
CREATE TABLE treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  total_sessions INTEGER NOT NULL DEFAULT 1,
  total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
  diet_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage treatment plans" ON treatment_plans FOR ALL USING (auth.role() = 'authenticated');

-- 8. Asistencias a Sesiones
CREATE TABLE client_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  notes TEXT,
  worker_id UUID REFERENCES profiles(id)
);

ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sessions" ON client_sessions FOR ALL USING (auth.role() = 'authenticated');

-- 9. Abonos y Pagos de Tratamientos
CREATE TABLE client_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'yape', 'plin', 'tarjeta', 'transferencia')),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  registered_by UUID REFERENCES profiles(id)
);

ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payments" ON client_payments FOR ALL USING (auth.role() = 'authenticated');

-- =========================================
-- Funciones Automáticas
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'), 
    COALESCE(new.raw_user_meta_data->>'role', 'worker')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing just after user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
