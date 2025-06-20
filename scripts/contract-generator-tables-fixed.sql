-- Criar tabelas para o gerador de contratos
-- Execute este script no Supabase SQL Editor

-- Tabela para cache de contratos
CREATE TABLE IF NOT EXISTS contract_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_hash TEXT NOT NULL UNIQUE,
    prompt_text TEXT NOT NULL,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('simple', 'advanced')),
    response_text TEXT NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para contratos gerados
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('simple', 'advanced')),
    prompt_text TEXT NOT NULL,
    generated_text TEXT NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    lexml_data JSONB,
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para exportações
CREATE TABLE IF NOT EXISTS exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'word')),
    file_name TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contract_cache_hash ON contract_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_contract_id ON exports(contract_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_contract_cache_updated_at ON contract_cache;
CREATE TRIGGER update_contract_cache_updated_at
    BEFORE UPDATE ON contract_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE contract_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contract_cache (público para leitura, apenas sistema para escrita)
DROP POLICY IF EXISTS "contract_cache_select_policy" ON contract_cache;
CREATE POLICY "contract_cache_select_policy" ON contract_cache
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "contract_cache_insert_policy" ON contract_cache;
CREATE POLICY "contract_cache_insert_policy" ON contract_cache
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para contracts
DROP POLICY IF EXISTS "contracts_select_policy" ON contracts;
CREATE POLICY "contracts_select_policy" ON contracts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "contracts_insert_policy" ON contracts;
CREATE POLICY "contracts_insert_policy" ON contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contracts_update_policy" ON contracts;
CREATE POLICY "contracts_update_policy" ON contracts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "contracts_delete_policy" ON contracts;
CREATE POLICY "contracts_delete_policy" ON contracts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para exports
DROP POLICY IF EXISTS "exports_select_policy" ON exports;
CREATE POLICY "exports_select_policy" ON exports
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "exports_insert_policy" ON exports;
CREATE POLICY "exports_insert_policy" ON exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "exports_update_policy" ON exports;
CREATE POLICY "exports_update_policy" ON exports
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "exports_delete_policy" ON exports;
CREATE POLICY "exports_delete_policy" ON exports
    FOR DELETE USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE contract_cache IS 'Cache de prompts e respostas para otimizar performance';
COMMENT ON TABLE contracts IS 'Contratos gerados pelos usuários';
COMMENT ON TABLE exports IS 'Histórico de exportações de contratos';

-- Inserir dados de exemplo para teste (opcional)
-- INSERT INTO contract_cache (prompt_hash, prompt_text, contract_type, response_text) 
-- VALUES ('test_hash', 'Contrato de teste', 'simple', 'Resposta de teste')
-- ON CONFLICT (prompt_hash) DO NOTHING;
