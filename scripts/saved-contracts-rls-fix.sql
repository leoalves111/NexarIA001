-- ✅ CORREÇÃO DEFINITIVA DAS POLÍTICAS RLS PARA SAVED_CONTRACTS

-- Primeiro, vamos verificar se a tabela existe e criar se necessário
CREATE TABLE IF NOT EXISTS public.saved_contracts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    titulo TEXT NOT NULL,
    nomePersonalizado TEXT,
    tipo TEXT NOT NULL DEFAULT 'outros',
    tipoPersonalizado TEXT,
    tamanho TEXT NOT NULL DEFAULT 'normal',
    html TEXT NOT NULL,
    contratante JSONB NOT NULL DEFAULT '{}',
    contratada JSONB NOT NULL DEFAULT '{}',
    valor TEXT NOT NULL DEFAULT 'Não informado',
    prazo TEXT,
    leisSelecionadas TEXT[] DEFAULT '{}',
    userId TEXT,
    user_id TEXT, -- Para compatibilidade com auth
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela
ALTER TABLE public.saved_contracts ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Users can view own saved contracts" ON public.saved_contracts;
DROP POLICY IF EXISTS "Users can insert own saved contracts" ON public.saved_contracts;
DROP POLICY IF EXISTS "Users can update own saved contracts" ON public.saved_contracts;
DROP POLICY IF EXISTS "Users can delete own saved contracts" ON public.saved_contracts;
DROP POLICY IF EXISTS "Enable all operations for authenticated users on own contracts" ON public.saved_contracts;

-- ✅ POLÍTICA UNIFICADA PARA TODAS AS OPERAÇÕES
CREATE POLICY "Enable all operations for authenticated users on own contracts" 
ON public.saved_contracts
FOR ALL 
USING (
    auth.uid() IS NOT NULL AND (
        auth.uid()::text = user_id OR 
        auth.uid()::text = userId OR
        user_id IS NULL OR
        userId IS NULL
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL AND (
        auth.uid()::text = user_id OR 
        auth.uid()::text = userId OR
        user_id IS NULL OR
        userId IS NULL
    )
);

-- ✅ FUNÇÃO PARA AUTO-PREENCHER USER_ID
CREATE OR REPLACE FUNCTION public.set_user_id_on_saved_contracts()
RETURNS TRIGGER AS $$
BEGIN
    -- Se user_id não foi definido, usar o ID do usuário autenticado
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid()::text;
    END IF;
    
    -- Se userId não foi definido, usar o ID do usuário autenticado
    IF NEW.userId IS NULL THEN
        NEW.userId = auth.uid()::text;
    END IF;
    
    -- Atualizar timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ TRIGGER PARA AUTO-PREENCHER USER_ID
DROP TRIGGER IF EXISTS set_user_id_on_saved_contracts_trigger ON public.saved_contracts;
CREATE TRIGGER set_user_id_on_saved_contracts_trigger
    BEFORE INSERT OR UPDATE ON public.saved_contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_id_on_saved_contracts();

-- ✅ ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_saved_contracts_user_id ON public.saved_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_contracts_userId ON public.saved_contracts(userId);
CREATE INDEX IF NOT EXISTS idx_saved_contracts_created_at ON public.saved_contracts(created_at);

-- ✅ GRANT PERMISSIONS
GRANT ALL ON public.saved_contracts TO authenticated;
GRANT ALL ON public.saved_contracts TO anon;

-- ✅ VERIFICAÇÃO FINAL
DO $$
BEGIN
    -- Verificar se a tabela foi criada
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_contracts') THEN
        RAISE NOTICE '✅ Tabela saved_contracts criada/atualizada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Falha ao criar tabela saved_contracts';
    END IF;
    
    -- Verificar se RLS está habilitado
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'saved_contracts' 
        AND n.nspname = 'public' 
        AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS habilitado na tabela saved_contracts';
    ELSE
        RAISE EXCEPTION '❌ RLS não foi habilitado na tabela saved_contracts';
    END IF;
    
    -- Verificar se as políticas foram criadas
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_contracts' 
        AND policyname = 'Enable all operations for authenticated users on own contracts'
    ) THEN
        RAISE NOTICE '✅ Políticas RLS criadas com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Políticas RLS não foram criadas';
    END IF;
END $$;
