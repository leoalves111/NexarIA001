DO $$
BEGIN
    RAISE NOTICE 'Iniciando correcao da tabela saved_contracts...';
    
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_contracts') THEN
        RAISE EXCEPTION 'Tabela saved_contracts nao encontrada!';
    END IF;
    
    -- Passo 1: Adicionar coluna user_id como UUID se nao existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_contracts' AND column_name = 'user_id' AND data_type = 'uuid') THEN
        RAISE NOTICE 'Adicionando coluna user_id como UUID...';
        
        -- Se existe user_id como text, renomear primeiro
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_contracts' AND column_name = 'user_id' AND data_type = 'text') THEN
            ALTER TABLE saved_contracts RENAME COLUMN user_id TO user_id_old;
            RAISE NOTICE 'Coluna user_id existente renomeada para user_id_old';
        END IF;
        
        -- Adicionar nova coluna user_id como UUID
        ALTER TABLE saved_contracts ADD COLUMN user_id UUID;
        RAISE NOTICE 'Coluna user_id UUID adicionada';
    END IF;
    
    -- Passo 2: Adicionar foreign key para profiles se nao existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'saved_contracts_user_id_fkey') THEN
        RAISE NOTICE 'Adicionando foreign key para profiles...';
        ALTER TABLE saved_contracts ADD CONSTRAINT saved_contracts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key adicionada';
    END IF;
    
    -- Passo 3: Habilitar RLS se nao estiver habilitado
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'saved_contracts' AND rowsecurity = true) THEN
        RAISE NOTICE 'Habilitando RLS...';
        ALTER TABLE saved_contracts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado';
    END IF;
    
    -- Passo 4: Remover politicas existentes
    DROP POLICY IF EXISTS saved_contracts_select_policy ON saved_contracts;
    DROP POLICY IF EXISTS saved_contracts_insert_policy ON saved_contracts;
    DROP POLICY IF EXISTS saved_contracts_update_policy ON saved_contracts;
    DROP POLICY IF EXISTS saved_contracts_delete_policy ON saved_contracts;
    RAISE NOTICE 'Politicas antigas removidas';
    
    -- Passo 5: Criar politicas RLS especificas
    CREATE POLICY saved_contracts_select_policy ON saved_contracts
        FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY saved_contracts_insert_policy ON saved_contracts
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY saved_contracts_update_policy ON saved_contracts
        FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY saved_contracts_delete_policy ON saved_contracts
        FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Politicas RLS criadas';
    
    -- Passo 6: Criar funcao para auto-preencher user_id
    CREATE OR REPLACE FUNCTION handle_saved_contracts_user_id()
    RETURNS TRIGGER AS $func$
    BEGIN
        -- Auto-preencher user_id se nao fornecido
        IF NEW.user_id IS NULL THEN
            NEW.user_id := auth.uid();
        END IF;
        
        -- Auto-preencher created_at se nao fornecido
        IF NEW.created_at IS NULL THEN
            NEW.created_at := NOW();
        END IF;
        
        -- Sempre atualizar updated_at
        NEW.updated_at := NOW();
        
        -- Sincronizar campos duplicados
        IF NEW.nomepersonalizado IS NOT NULL THEN
            NEW."nomePersonalizado" := NEW.nomepersonalizado;
        END IF;
        
        IF NEW.tipopersonalizado IS NOT NULL THEN
            NEW."tipoPersonalizado" := NEW.tipopersonalizado;
        END IF;
        
        IF NEW.leiselecionadas IS NOT NULL THEN
            NEW."leisSelecionadas" := NEW.leiselecionadas;
        END IF;
        
        -- Sincronizar timestamps
        NEW.datageracao := NEW.created_at;
        NEW.datamodificacao := NEW.updated_at;
        
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
    
    RAISE NOTICE 'Funcao handle_saved_contracts_user_id criada';
    
    -- Passo 7: Criar trigger
    DROP TRIGGER IF EXISTS handle_saved_contracts_user_id_trigger ON saved_contracts;
    CREATE TRIGGER handle_saved_contracts_user_id_trigger
        BEFORE INSERT OR UPDATE ON saved_contracts
        FOR EACH ROW EXECUTE FUNCTION handle_saved_contracts_user_id();
    
    RAISE NOTICE 'Trigger criado';
    
    -- Passo 8: Criar indices para performance
    CREATE INDEX IF NOT EXISTS idx_saved_contracts_user_id ON saved_contracts(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_contracts_created_at ON saved_contracts(created_at);
    CREATE INDEX IF NOT EXISTS idx_saved_contracts_tipo ON saved_contracts(tipo);
    CREATE INDEX IF NOT EXISTS idx_saved_contracts_titulo ON saved_contracts(titulo);
    
    RAISE NOTICE 'Indices criados';
    
    -- Passo 9: Garantir permissoes para authenticated
    GRANT SELECT, INSERT, UPDATE, DELETE ON saved_contracts TO authenticated;
    RAISE NOTICE 'Permissoes concedidas';
    
    -- Passo 10: Migrar dados existentes se necessario
    UPDATE saved_contracts 
    SET user_id = (SELECT id FROM profiles LIMIT 1)
    WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM profiles);
    
    RAISE NOTICE 'Migracao de dados concluida';
    
END $$;

-- Relatorio final
DO $$
DECLARE
    total_contracts INTEGER;
    contracts_with_user_id INTEGER;
    rls_enabled BOOLEAN;
    policies_count INTEGER;
    triggers_count INTEGER;
    indexes_count INTEGER;
BEGIN
    -- Contar contratos
    SELECT COUNT(*) INTO total_contracts FROM saved_contracts;
    SELECT COUNT(*) INTO contracts_with_user_id FROM saved_contracts WHERE user_id IS NOT NULL;
    
    -- Verificar RLS
    SELECT rowsecurity INTO rls_enabled FROM pg_tables WHERE tablename = 'saved_contracts';
    
    -- Contar politicas
    SELECT COUNT(*) INTO policies_count FROM pg_policies WHERE tablename = 'saved_contracts';
    
    -- Contar triggers
    SELECT COUNT(*) INTO triggers_count FROM information_schema.triggers 
    WHERE event_object_table = 'saved_contracts';
    
    -- Contar indices
    SELECT COUNT(*) INTO indexes_count FROM pg_indexes 
    WHERE tablename = 'saved_contracts';
    
    -- Relatorio
    RAISE NOTICE '=== RELATORIO FINAL ===';
    RAISE NOTICE 'Total de contratos: %', total_contracts;
    RAISE NOTICE 'Contratos com user_id: %', contracts_with_user_id;
    RAISE NOTICE 'RLS habilitado: %', rls_enabled;
    RAISE NOTICE 'Politicas RLS: %', policies_count;
    RAISE NOTICE 'Triggers: %', triggers_count;
    RAISE NOTICE 'Indices: %', indexes_count;
    
    -- Validacoes criticas
    IF NOT rls_enabled THEN
        RAISE WARNING 'RLS nao esta habilitado!';
    END IF;
    
    IF policies_count < 4 THEN
        RAISE WARNING 'Menos de 4 politicas RLS encontradas!';
    END IF;
    
    IF triggers_count = 0 THEN
        RAISE WARNING 'Nenhum trigger encontrado!';
    END IF;
    
    RAISE NOTICE 'Correcao da tabela saved_contracts CONCLUIDA com SUCESSO!';
END $$;
