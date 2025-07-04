-- ✅ TESTE COMPLETO DE OPERAÇÕES DE CONTRATO
-- Este script testa todas as funcionalidades do sistema reorganizado

-- 🧪 TESTE 1: Verificar estrutura das tabelas
SELECT 'Performance Test' as test_type;

-- 📊 ESTATÍSTICAS DAS TABELAS
SELECT 
    'Estatísticas das Tabelas' as categoria,
    schemaname as esquema,
    relname as tabela,
    n_tup_ins::text as inserções,
    n_tup_upd::text as atualizações,
    n_tup_del::text as deleções,
    n_live_tup::text as registros_ativos,
    n_dead_tup::text as registros_mortos
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY relname;

-- 🔍 ÍNDICES ATIVOS
SELECT 
    'Índices Ativos' as categoria,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 🔗 FOREIGN KEYS
SELECT 
    'Foreign Keys' as categoria,
    tc.table_name as tabela_origem,
    kcu.column_name as coluna_origem,
    ccu.table_name as tabela_destino,
    ccu.column_name as coluna_destino
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 🧹 LIMPEZA AUTOMÁTICA (remover dados de teste antigos se existirem)
DO $$
BEGIN
    -- Remover contratos de teste
    DELETE FROM saved_contracts 
    WHERE titulo LIKE '%TESTE%' OR titulo LIKE '%Test%';
    
    -- Remover perfis de teste
    DELETE FROM profiles 
    WHERE nome LIKE '%Teste%' OR email LIKE '%test%';
    
    RAISE NOTICE 'Limpeza automática concluída';
END $$;

-- ✅ TESTE 2: Criar usuário de teste
INSERT INTO profiles (
    id,
    nome,
    email,
    tipo_pessoa,
    cpf,
    telefone,
    endereco,
    cidade,
    estado,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'João Silva Teste',
    'joao.teste@email.com',
    'pf',
    '12345678901',
    '(11) 99999-9999',
    'Rua das Flores, 123',
    'São Paulo',
    'SP',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ✅ TESTE 3: Criar assinatura premium
INSERT INTO subscriptions (
    id,
    user_id,
    plano,
    status,
    creditos_basicos,
    creditos_avancados,
    data_inicio,
    data_expiracao,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    p.id,
    'premium',
    'active',
    15,
    10,
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
FROM profiles p 
WHERE p.email = 'joao.teste@email.com'
ON CONFLICT (user_id) DO UPDATE SET
    creditos_avancados = 10,
    updated_at = NOW();

-- ✅ TESTE 4: Salvar contrato completo
INSERT INTO saved_contracts (
    id,
    user_id,
    titulo,
    nomepersonalizado,
    tipo,
    tipopersonalizado,
    tamanho,
    html,
    contratante,
    contratada,
    valor,
    prazo,
    leisselecionadas,
    datageracao,
    datamodificacao,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    p.id,
    'CONTRATO DE CONSULTORIA EMPRESARIAL',
    'Consultoria Estratégica Premium',
    'consultoria',
    'Consultoria Empresarial Estratégica',
    'completo',
    '<html><body><h1>CONTRATO DE CONSULTORIA EMPRESARIAL</h1><p>Contrato completo gerado pelo sistema...</p></body></html>',
    jsonb_build_object(
        'nome', 'Empresa ABC Ltda',
        'documento', '12.345.678/0001-90',
        'endereco', 'Av. Paulista, 1000, São Paulo/SP',
        'tipo', 'pj'
    ),
    jsonb_build_object(
        'nome', 'João Silva Consultor',
        'documento', '123.456.789-01',
        'endereco', 'Rua das Flores, 123, São Paulo/SP',
        'tipo', 'pf'
    ),
    'R$ 15.000,00',
    '6 meses',
    ARRAY['Lei 10.406/2002 (Código Civil)', 'Lei 8.078/1990 (CDC)', 'CLT'],
    NOW(),
    NOW(),
    NOW(),
    NOW()
FROM profiles p 
WHERE p.email = 'joao.teste@email.com';

-- ✅ TESTE 5: Verificar se salvou corretamente
SELECT 
    'Verificação de Salvamento' as categoria,
    COUNT(*) as contratos_salvos,
    MAX(titulo) as ultimo_titulo
FROM saved_contracts sc
JOIN profiles p ON sc.user_id = p.id
WHERE p.email = 'joao.teste@email.com';

-- ✅ TESTE 6: Atualizar nome personalizado
UPDATE saved_contracts 
SET nomepersonalizado = 'Consultoria Premium Atualizada',
    datamodificacao = NOW(),
    updated_at = NOW()
WHERE titulo = 'CONTRATO DE CONSULTORIA EMPRESARIAL'
    AND user_id IN (SELECT id FROM profiles WHERE email = 'joao.teste@email.com');

-- ✅ TESTE 7: Duplicar contrato
INSERT INTO saved_contracts (
    id,
    user_id,
    titulo,
    nomepersonalizado,
    tipo,
    tipopersonalizado,
    tamanho,
    html,
    contratante,
    contratada,
    valor,
    prazo,
    leisselecionadas,
    datageracao,
    datamodificacao,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    user_id,
    titulo || ' (CÓPIA)',
    nomepersonalizado || ' (Duplicada)',
    tipo,
    tipopersonalizado,
    tamanho,
    html,
    contratante,
    contratada,
    valor,
    prazo,
    leisselecionadas,
    NOW(),
    NOW(),
    NOW(),
    NOW()
FROM saved_contracts 
WHERE titulo = 'CONTRATO DE CONSULTORIA EMPRESARIAL'
    AND user_id IN (SELECT id FROM profiles WHERE email = 'joao.teste@email.com');

-- ✅ TESTE 8: Contar contratos por usuário
SELECT 
    'Contagem por Usuário' as categoria,
    p.nome as usuario,
    COUNT(sc.id) as total_contratos
FROM profiles p
LEFT JOIN saved_contracts sc ON p.id = sc.user_id
WHERE p.email = 'joao.teste@email.com'
GROUP BY p.id, p.nome;

-- ✅ TESTE 9: Buscar por tipo
SELECT 
    'Busca por Tipo' as categoria,
    tipo,
    COUNT(*) as quantidade
FROM saved_contracts sc
JOIN profiles p ON sc.user_id = p.id
WHERE p.email = 'joao.teste@email.com'
GROUP BY tipo;

-- ✅ TESTE 10: Verificar arrays de leis
SELECT 
    'Verificação de Arrays' as categoria,
    titulo,
    array_length(leisselecionadas, 1) as total_leis,
    leisselecionadas[1] as primeira_lei
FROM saved_contracts sc
JOIN profiles p ON sc.user_id = p.id
WHERE p.email = 'joao.teste@email.com'
    AND leisselecionadas IS NOT NULL;

-- ✅ TESTE 11: Deletar um contrato
DELETE FROM saved_contracts 
WHERE titulo LIKE '%CÓPIA%'
    AND user_id IN (SELECT id FROM profiles WHERE email = 'joao.teste@email.com');

-- ✅ TESTE 12: Verificar integridade após deleção
SELECT 
    'Verificação Final' as categoria,
    COUNT(*) as contratos_restantes
FROM saved_contracts sc
JOIN profiles p ON sc.user_id = p.id
WHERE p.email = 'joao.teste@email.com';

-- 🧹 LIMPEZA FINAL
DELETE FROM saved_contracts 
WHERE user_id IN (SELECT id FROM profiles WHERE email = 'joao.teste@email.com');

DELETE FROM subscriptions 
WHERE user_id IN (SELECT id FROM profiles WHERE email = 'joao.teste@email.com');

DELETE FROM profiles 
WHERE email = 'joao.teste@email.com';

-- ✅ RESULTADO FINAL
SELECT 'TESTE COMPLETO FINALIZADO' as status, NOW() as timestamp;
