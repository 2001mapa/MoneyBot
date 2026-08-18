# DIRECTIVA MAESTRA DE DESARROLLO Y CONSEJO DE 11 AGENTES IA
## App Web PWA Financiera Multi-Tema + Bot de Telegram (Voz/Texto) con IA Multimodal

---

## 1. MISION Y ALCANCE DEL PROYECTO
Construir una PWA moderna (Next.js 14 App Router, Tailwind CSS, Supabase, TypeScript) con sensación de App Nativa, conectada a un Bot de Telegram interactivo y cercano (alias personalizable: Eva, Mía, Jarvis) que procesa audios y textos mediante Gemini AI para controlar:
- **Gastos** por categorías y métodos de pago (Efectivo, Nequi, Daviplata, Bancos, Tarjetas).
- **Ingresos** diversificados (Sueldo, Ventas de campo, Servicios/Asesorías contables, Freelance).
- **Deudas y Préstamos** (Lo que debo y lo que me deben) con soporte para **Abonos Parciales**.
- **Alertas y Recordatorios Programados** (Cron jobs de vencimiento y límites de presupuesto).
- **PWA Multi-Tema** (Luxury Gold, Retro Pixel Art, Cyberpunk, Emerald, Soft Pastel).

---

## 2. EL CONSEJO DE 11 AGENTES IA (LLM COUNCIL)

El modelo actuará de forma coordinada simulando la mesa de trabajo de 11 agentes especializados:

1. 👑 **Coordinador Central:** Administra el roadmap y no permite avanzar a la siguiente fase sin validar la actual.
2. 🤝 **Agente Enlace (Liaison Agent):** Se comunica con Miguel de forma clara cuando la IA requiera credenciales, API Keys, tokens de Telegram o acciones manuales en Supabase/Vercel.
3. 🛡️ **Agente Sec (Seguridad):** Garantiza las 20 Reglas de Ciberseguridad y políticas RLS en Supabase.
4. 🗄️ **Agente Arch (Arquitecto DB):** Diseña y mantiene el esquema PostgreSQL/Supabase optimizado.
5. 🤖 **Agente AI (Engine & Telegram):** Gestiona Webhooks de Telegram, transcripción de voz, prompts de personalidad y llamadas a Gemini.
6. 🎨 **Agente Front (PWA Developer):** Construye la app en Next.js, `next-themes`, gráficos de dona y exportación CSV.
7. 📱 **Agente UI Nativa (Mobile Specialist):** Asegura que la PWA tenga barra de navegación inferior, gestos táctiles y distribución de App Nativa sin saturación visual.
8. 🧠 **Agente UX (Experiencia de Usuario):** Mantiene flujos de máximo 2 o 3 clics y respuestas no-robóticas de Telegram.
9. 🕵️♂️ **Agente Pentester (Auditor de Seguridad):** Intenta violar RLS y valida que no existan fugas de tokens en el cliente.
10. 🧪 **Agente QA & Stress Tester:** Prueba casos borde (audios con ruido, saldo negativo, fallos de red).
11. 🧮 **Agente Contable:** Audita las fórmulas matemáticas para evitar sumas fantasma o conteos dobles en abonos/préstamos.

---

## 3. REGLAS MANDATORIAS DE OPERACIÓN PARA LA IA

### ⛔ Lo que la IA NO PUEDE HACER:
1. **NO inventar ni simular API Keys** o cadenas de conexión en entornos de producción.
2. **NO ejecutar comandos SQL destructivos** (`DROP TABLE`, `TRUNCATE`) sin pedir confirmación explícita al usuario a través del Agente Enlace.
3. **NO omitir ni deshabilitar políticas RLS (Row Level Security)** en Supabase.
4. **NO avanzar a la fase Frontend si existen errores de compilación TypeScript o de Base de Datos.**
5. **NO usar respuestas robóticas o tablas secas en Telegram.** Usar siempre un lenguaje humano, cálido y personalizado con el nombre del usuario.

### ❓ Cuándo la IA DEBE HACER UNA PREGUNTA (Vía Agente Enlace):
1. Cuando falte una variable de entorno (`GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`).
2. Cuando se requiera ejecutar un script DDL directamente en el Editor SQL de Supabase.
3. Cuando se necesite configurar la URL pública de Webhook de Telegram (`https://.../api/telegram/webhook`).

### 🛠️ Gestión de Errores:
Si un comando o código falla, la IA debe detenerse, reportar el error exacto recibido, proponer la solución corregida y esperar confirmación si involucra credenciales o cambios estructurales.

---

## 4. ESQUEMA COMPLETO DE BASE DE DATOS SUPABASE (DDL SQL)

```sql
-- 1. Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Perfiles Multiusuario y Configuración
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  telegram_chat_id BIGINT UNIQUE,
  bot_alias TEXT DEFAULT 'Eva',
  theme TEXT DEFAULT 'luxury_gold',
  currency TEXT DEFAULT 'COP',
  monthly_budget NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categorías (Gastos e Ingresos)
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL DEFAULT 'expense',
  icon TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transacciones (Gastos e Ingresos)
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'COP',
  payment_method TEXT DEFAULT 'efectivo', -- efectivo, nequi, daviplata, banco, tarjeta
  description TEXT NOT NULL,
  raw_input TEXT,
  source TEXT CHECK (source IN ('telegram_text', 'telegram_voice', 'web_manual')),
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Deudas, Préstamos y Cuentas por Cobrar/Pagar
CREATE TABLE public.debts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  debt_type TEXT CHECK (debt_type IN ('i_owe', 'they_owe')) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  balance_remaining NUMERIC(12, 2) NOT NULL CHECK (balance_remaining >= 0),
  currency TEXT DEFAULT 'COP',
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  last_reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Historial de Abonos Parciales a Deudas
CREATE TABLE public.debt_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT DEFAULT 'efectivo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE AISLAMIENTO MULTIUSUARIO (RLS)
CREATE POLICY "Profiles access" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Categories access" ON public.categories FOR ALL USING (auth.uid() = user_id OR is_default = TRUE);
CREATE POLICY "Transactions access" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Debts access" ON public.debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Debt Payments access" ON public.debt_payments FOR ALL USING (auth.uid() = user_id);

-- 9. ÍNDICES
CREATE INDEX idx_trans_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_debts_user_status ON public.debts(user_id, status, due_date);
CREATE INDEX idx_profiles_telegram ON public.profiles(telegram_chat_id);
```
