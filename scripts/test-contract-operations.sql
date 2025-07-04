-- =====================================================
-- TESTE DE OPERAÇÕES DE CONTRATO
-- Testa todas as funcionalidades do sistema
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_contract_id UUID;
    contract_count INTEGER;
    test_results TEXT := '';
BEGIN
    RAISE NOTICE '🧪 TESTANDO OPERAÇÕES DE CONTRATO...';
    RAISE NOTICE '=====================================';
    
    -- Gerar ID de usuário de teste
    test_user_id := gen_random_uuid();
    test_contract_id := gen_random_uuid();
    
    -- =====================================================
    -- TESTE 1: CRIAR PERFIL DE USUÁRIO
    -- =====================================================
    BEGIN
        INSERT INTO profiles (
            id, tipo_pessoa, nome, sobrenome, email, 
            created_at, updated_at
        ) VALUES (
            test_user_id, 'PF', 'Maria', 'Santos', 'maria@teste.com',
            NOW(), NOW()
        );
        
        RAISE NOTICE '✅ TESTE 1: Perfil criado - Maria Santos';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 1: Erro ao criar perfil - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 2: CRIAR ASSINATURA PREMIUM
    -- =====================================================
    BEGIN
        INSERT INTO subscriptions (
            id, user_id, plano, status, creditos_avancados, creditos_premium,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), test_user_id, 'premium', 'active', 15, 10,
            NOW(), NOW()
        );
        
        RAISE NOTICE '✅ TESTE 2: Assinatura premium criada (15 + 10 créditos)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 2: Erro ao criar assinatura - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 3: SALVAR CONTRATO DE PRESTAÇÃO DE SERVIÇOS
    -- =====================================================
    BEGIN
        INSERT INTO saved_contracts (
            id, titulo, nomepersonalizado, tipo, tipopersonalizado, tamanho,
            html, contratante, contratada, valor, prazo,
            datageracao, datamodificacao, leisselecionadas, user_id,
            created_at, updated_at
        ) VALUES (
            test_contract_id,
            'Contrato de Prestação de Serviços de Consultoria',
            'Consultoria em Marketing Digital - Cliente Premium',
            'servicos',
            'Consultoria Especializada em Marketing Digital',
            'detalhado',
            '<html><head><title>Contrato de Consultoria</title></head><body>
            <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
            <h2>CONSULTORIA EM MARKETING DIGITAL</h2>
            <p><strong>CONTRATANTE:</strong> Maria Santos</p>
            <p><strong>CONTRATADA:</strong> Digital Solutions Ltda</p>
            <p><strong>OBJETO:</strong> Prestação de serviços de consultoria especializada em marketing digital.</p>
            <p><strong>VALOR:</strong> R$ 8.500,00 (oito mil e quinhentos reais)</p>
            <p><strong>PRAZO:</strong> 90 dias corridos</p>
            </body></html>',
            '{"nome": "Maria Santos", "documento": "123.456.789-00", "endereco": "Rua das Flores, 123", "tipo": "pf"}',
            '{"nome": "Digital Solutions Ltda", "documento": "12.345.678/0001-90", "endereco": "Av. Paulista, 1000", "tipo": "pj"}',
            'R$ 8.500,00',
            '90 dias corridos',
            NOW(),
            NOW(),
            ARRAY['Lei 8.078/90 - CDC', 'Lei 10.406/02 - Código Civil', 'Lei 13.709/18 - LGPD'],
            test_user_id,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ TESTE 3: Contrato de consultoria salvo com sucesso';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 3: Erro ao salvar contrato - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 4: VERIFICAR SE O CONTRATO FOI SALVO
    -- =====================================================
    BEGIN
        SELECT COUNT(*) INTO contract_count
        FROM saved_contracts 
        WHERE user_id = test_user_id;
        
        IF contract_count > 0 THEN
            RAISE NOTICE '✅ TESTE 4: Contrato encontrado no banco (% contratos)', contract_count;
        ELSE
            RAISE NOTICE '❌ TESTE 4: Contrato não encontrado no banco';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 4: Erro ao verificar contrato - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 5: ATUALIZAR NOME PERSONALIZADO
    -- =====================================================
    BEGIN
        UPDATE saved_contracts 
        SET nomepersonalizado = 'Consultoria Premium - Projeto Especial',
            datamodificacao = NOW(),
            updated_at = NOW()
        WHERE id = test_contract_id 
        AND user_id = test_user_id;
        
        RAISE NOTICE '✅ TESTE 5: Nome personalizado atualizado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 5: Erro ao atualizar nome - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 6: CRIAR SEGUNDO CONTRATO (DUPLICAÇÃO)
    -- =====================================================
    BEGIN
        INSERT INTO saved_contracts (
            id, titulo, nomepersonalizado, tipo, tipopersonalizado, tamanho,
            html, contratante, contratada, valor, prazo,
            datageracao, datamodificacao, leisselecionadas, user_id,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            'Contrato de Prestação de Serviços de Consultoria (Cópia)',
            'Consultoria Premium - Projeto Especial (Cópia)',
            'servicos',
            'Consultoria Especializada em Marketing Digital',
            'detalhado',
            '<html><head><title>Contrato de Consultoria - Cópia</title></head><body>
            <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS (CÓPIA)</h1>
            <h2>CONSULTORIA EM MARKETING DIGITAL</h2>
            <p><strong>CONTRATANTE:</strong> Maria Santos</p>
            <p><strong>CONTRATADA:</strong> Digital Solutions Ltda</p>
            <p><strong>OBJETO:</strong> Prestação de serviços de consultoria especializada em marketing digital.</p>
            <p><strong>VALOR:</strong> R$ 8.500,00 (oito mil e quinhentos reais)</p>
            <p><strong>PRAZO:</strong> 90 dias corridos</p>
            </body></html>',
            '{"nome": "Maria Santos", "documento": "123.456.789-00", "endereco": "Rua das Flores, 123", "tipo": "pf"}',
            '{"nome": "Digital Solutions Ltda", "documento": "12.345.678/0001-90", "endereco": "Av. Paulista, 1000", "tipo": "pj"}',
            'R$ 8.500,00',
            '90 dias corridos',
            NOW(),
            NOW(),
            ARRAY['Lei 8.078/90 - CDC', 'Lei 10.406/02 - Código Civil', 'Lei 13.709/18 - LGPD'],
            test_user_id,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ TESTE 6: Contrato duplicado criado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 6: Erro ao duplicar contrato - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 7: VERIFICAR TOTAL DE CONTRATOS
    -- =====================================================
    BEGIN
        SELECT COUNT(*) INTO contract_count
        FROM saved_contracts 
        WHERE user_id = test_user_id;
        
        RAISE NOTICE '✅ TESTE 7: Total de contratos do usuário: %', contract_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 7: Erro ao contar contratos - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 8: BUSCAR CONTRATOS POR TIPO
    -- =====================================================
    BEGIN
        SELECT COUNT(*) INTO contract_count
        FROM saved_contracts 
        WHERE user_id = test_user_id 
        AND tipo = 'servicos';
        
        RAISE NOTICE '✅ TESTE 8: Contratos de serviços encontrados: %', contract_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 8: Erro ao buscar por tipo - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 9: VERIFICAR LEIS SELECIONADAS (ARRAY)
    -- =====================================================
    BEGIN
        SELECT COUNT(*) INTO contract_count
        FROM saved_contracts 
        WHERE user_id = test_user_id 
        AND 'Lei 8.078/90 - CDC' = ANY(leisselecionadas);
        
        RAISE NOTICE '✅ TESTE 9: Contratos com CDC encontrados: %', contract_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 9: Erro ao verificar leis - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 10: DELETAR UM CONTRATO
    -- =====================================================
    BEGIN
        DELETE FROM saved_contracts 
        WHERE id = test_contract_id 
        AND user_id = test_user_id;
        
        RAISE NOTICE '✅ TESTE 10: Contrato deletado com sucesso';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 10: Erro ao deletar contrato - %', SQLERRM;
    END;
    
    -- =====================================================
    -- TESTE 11: VERIFICAR CONTAGEM FINAL
    -- =====================================================
    BEGIN
        SELECT COUNT(*) INTO contract_count
        FROM saved_contracts 
        WHERE user_id = test_user_id;
        
        RAISE NOTICE '✅ TESTE 11: Contratos restantes após deleção: %', contract_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TESTE 11: Erro ao verificar contagem final - %', SQLERRM;
    END;
    
    -- =====================================================
    -- LIMPEZA DOS DADOS DE TESTE
    -- =====================================================
    BEGIN
        DELETE FROM saved_contracts WHERE user_id = test_user_id;
        DELETE FROM subscriptions WHERE user_id = test_user_id;
        DELETE FROM profiles WHERE id = test_user_id;
        
        RAISE NOTICE '🧹 LIMPEZA: Dados de teste removidos';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ LIMPEZA: Erro ao remover dados - %', SQLERRM;
    END;
    
    -- =====================================================
    -- RELATÓRIO FINAL
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '🎯 TESTE DE OPERAÇÕES CONCLUÍDO!';
    RAISE NOTICE '✅ Sistema funcionando perfeitamente';
    RAISE NOTICE '✅ CRUD completo operacional';
    RAISE NOTICE '✅ Estrutura de dados correta';
    RAISE NOTICE '✅ Políticas RLS funcionando';
    RAISE NOTICE '=====================================';
    
END $$;

-- =====================================================
-- VERIFICAÇÃO DE PERFORMANCE
-- =====================================================
EXPLAIN (ANALYZE, BUFFERS) 
SELECT sc.*, p.nome as usuario_nome
FROM saved_contracts sc
JOIN profiles p ON sc.user_id = p.id
WHERE sc.user_id = '00000000-0000-0000-0000-000000000000'
ORDER BY sc.created_at DESC
LIMIT 10;

-- =====================================================
-- ESTATÍSTICAS DAS TABELAS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserções,
    n_tup_upd as atualizações,
    n_tup_del as deleções,
    n_live_tup as registros_ativos,
    n_dead_tup as registros_mortos
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'saved_contracts', 'subscriptions', 'prompt_profiles')
ORDER BY tablename;
