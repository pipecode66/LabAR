-- LabAR Seguro: esquema privado del backend para PostgreSQL / Supabase.
-- Idempotente; no requiere extensiones ni modificar tablas de Supabase Auth.
CREATE TABLE IF NOT EXISTS public.labar_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  profile_json jsonb NOT NULL CHECK (jsonb_typeof(profile_json) = 'object'),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.labar_attempts (
  id uuid PRIMARY KEY,
  owner text NOT NULL REFERENCES public.labar_sessions(token_hash) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('preparing', 'active', 'paused', 'completed')),
  updated_at timestamptz NOT NULL,
  data_json jsonb NOT NULL CHECK (jsonb_typeof(data_json) = 'object')
);
CREATE INDEX IF NOT EXISTS labar_attempts_owner ON public.labar_attempts(owner, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS labar_attempts_one_open_per_owner
  ON public.labar_attempts(owner) WHERE status <> 'completed';

CREATE TABLE IF NOT EXISTS public.labar_issues (
  id uuid PRIMARY KEY,
  owner text NOT NULL REFERENCES public.labar_sessions(token_hash) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  data_json jsonb NOT NULL CHECK (jsonb_typeof(data_json) = 'object')
);
CREATE INDEX IF NOT EXISTS labar_issues_owner ON public.labar_issues(owner, created_at DESC);
CREATE INDEX IF NOT EXISTS labar_sessions_expiry ON public.labar_sessions(expires_at);

-- El navegador usa la API propia y una cookie HttpOnly. No usa PostgREST ni
-- claves públicas para consultar estas tablas. Sin políticas RLS, los roles
-- anon/authenticated no pueden leerlas; el backend utiliza la conexión privada.
ALTER TABLE public.labar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labar_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labar_issues ENABLE ROW LEVEL SECURITY;

-- Supabase crea estos roles; mantener compatible un PostgreSQL independiente.
DO $labar$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.labar_sessions, public.labar_attempts, public.labar_issues FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.labar_sessions, public.labar_attempts, public.labar_issues FROM authenticated;
  END IF;
END
$labar$;
