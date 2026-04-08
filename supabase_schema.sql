-- ESQUEMA SQL PARA SUPABASE
-- Copia y corre esto en el SQL Editor de Supabase (https://app.supabase.com/)

-- Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── MISIONEROS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missionaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'Pendiente',
    country TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── CEMENTERIOS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cemeteries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT,
    province TEXT,
    country TEXT,
    stage INTEGER DEFAULT 0,
    "missionaryId" UUID REFERENCES missionaries(id) ON DELETE SET NULL,
    missionary TEXT, 
    "missionaryEmail" TEXT,
    "entryDate" DATE,
    "lastContactDate" DATE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    inventory INTEGER DEFAULT 0,
    "inventoryNotes" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "adminType" TEXT,
    location TEXT,
    "fsAlreadyDigitized" BOOLEAN DEFAULT FALSE,
    "digitizationDate" DATE,
    "collectionName" TEXT,
    "digitizedPeriods" TEXT,
    "imageUsageStatus" TEXT, 
    "imageRequest" TEXT,
    "readyForVisitDate" DATE,
    "managerNotifiedDate" DATE,
    "managerNotifiedName" TEXT,
    "contactInterestLevel" TEXT,
    "contactPosition" TEXT,
    "contactEmail" TEXT,
    "previousFsAgreement" TEXT, 
    "estimatedRecords" INTEGER,
    "numberOfBooks" INTEGER,
    "dateRangeFrom" INTEGER,
    "dateRangeTo" INTEGER,
    "drrRecipient" TEXT,
    "drrDeliveryDate" DATE,
    "trainingRecipient" TEXT,
    "trainingDate" DATE,
    "postSaleNotes" TEXT,
    "processCompleted" BOOLEAN DEFAULT FALSE,
    address TEXT,
    "estimatedMeetingDate" DATE,
    "fsNotificationDate" DATE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── VISITAS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cemeteryId" UUID REFERENCES cemeteries(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT,
    missionary TEXT,
    contact TEXT,
    purpose TEXT,
    notes TEXT,
    stage INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── CONTACTOS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "cemeteryId" UUID REFERENCES cemeteries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    email TEXT,
    "interestLevel" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --- POLÍTICAS DE SEGURIDAD (RLS) ---
ALTER TABLE missionaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cemeteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- MISIONEROS
CREATE POLICY "Public Read" ON missionaries FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON missionaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON missionaries FOR UPDATE USING (true);

-- CEMENTERIOS
CREATE POLICY "Public Read" ON cemeteries FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON cemeteries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON cemeteries FOR UPDATE USING (true);

-- VISITAS
CREATE POLICY "Public Read" ON visits FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON visits FOR INSERT WITH CHECK (true);

-- CONTACTOS
CREATE POLICY "Public Read" ON contacts FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON contacts FOR INSERT WITH CHECK (true);
