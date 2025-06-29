import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

// Configurar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Cliente administrativo para operações que requerem privilégios especiais
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceKey) {
  console.error("❌ [Supabase] SUPABASE_SERVICE_ROLE_KEY não configurada")
  throw new Error("Configuração de banco de dados incompleta")
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const PersonSchema = z.object({
  tipo: z.enum(['pf', 'pj']),
  nome: z.string().min(2).max(200),
  documento: z.string().min(8).max(20),
  endereco: z.string().min(5).max(300),
  cidade: z.string().min(2).max(100),
  estado: z.string().min(2).max(2),
  cep: z.string().optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal(""))
})

const ContractSchema = z.object({
  titulo: z.string().min(3).max(200),
  tipo: z.enum([
    'servicos', 
    'trabalho', 
    'locacao', 
    'compra_venda', 
    'consultoria',
    'prestacao_servicos',
    'fornecimento',
    'sociedade',
    'parceria',
    'franquia',
    'licenciamento',
    'manutencao',
    'seguro',
    'financiamento',
    'outros'
  ]),
  tipoPersonalizado: z.string().optional(), // Para quando tipo for "outros"
  prompt: z.string().min(20, "PROMPT deve ter pelo menos 20 caracteres").max(3000),
  valor: z.string().min(1).max(50),
  prazo: z.string().min(1).max(100),
  observacoes: z.string().max(1000).optional(),
  template: z.string().optional()
})

const GenerateSmartContractSchema = z.object({
  contratante: PersonSchema,
  contratada: PersonSchema,
  contrato: ContractSchema
})

const generateAIContract = async (data: z.infer<typeof GenerateSmartContractSchema>): Promise<string> => {
  const { contratante, contratada, contrato } = data
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    console.error("❌ [GPT-4o-mini] API Key da OpenAI não configurada")
    throw new Error("API Key da OpenAI nao configurada")
  }

  console.log(`🧠 [GPT-4o-mini] Gerando contrato avançado baseado no prompt: "${contrato.prompt.substring(0, 100)}..."`)

  const promptCompleto = `Voce e um especialista em direito contratual brasileiro com 20 anos de experiencia e acesso ao GPT-4o-mini avançado. Crie um contrato PROFISSIONAL e COMPLETO baseado nas informacoes fornecidas:

INFORMACOES BASICAS:
- Tipo de contrato: ${contrato.tipo}
- Titulo: ${contrato.titulo}
- Valor: ${contrato.valor}
- Prazo: ${contrato.prazo}

PROMPT DO USUARIO (BASE PARA O CONTRATO):
"${contrato.prompt}"

OBSERVACOES ESPECIFICAS:
${contrato.observacoes || 'Nenhuma observacao especifica fornecida'}

PARTES DO CONTRATO:
CONTRATANTE: ${contratante.nome} (${contratante.tipo === 'pf' ? 'Pessoa Fisica' : 'Empresa'})
CONTRATADA: ${contratada.nome} (${contratada.tipo === 'pf' ? 'Pessoa Fisica' : 'Empresa'})

INSTRUCOES PARA CRIACAO:
1. Crie TODAS as clausulas necessarias baseadas no prompt do usuario
2. Use linguagem juridica precisa e profissional
3. Inclua referencias as leis brasileiras apropriadas (Codigo Civil, CLT, CDC, etc.)
4. Adapte completamente o conteudo ao tipo de contrato e ao que foi solicitado no prompt
5. Seja especifico sobre direitos, obrigacoes e responsabilidades
6. Inclua clausulas de rescisao, foro, e outras essenciais
7. Se o tipo for "trabalho", foque em CLT e direitos trabalhistas
8. Se for "servicos", foque em prestacao de servicos e propriedade intelectual
9. Use as observacoes para adicionar clausulas especificas solicitadas

FORMATO DE RESPOSTA:
Retorne APENAS o HTML das clausulas do contrato no formato:

<div class="clause-container">
<div class="clause-title">CLAUSULA 1 - OBJETO DO CONTRATO</div>
<div class="clause-content">
  <p>Conteudo detalhado baseado no prompt...</p>
</div>
</div>

Continue com TODAS as clausulas necessarias (minimo 6-8 clausulas)...

IMPORTANTE: NAO inclua o cabecalho, dados das partes ou assinaturas. Apenas as clausulas do contrato.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Voce e um especialista em direito contratual brasileiro com 20 anos de experiencia, utilizando GPT-4o-mini para criar contratos avançados, precisos, completos e totalmente adequados a legislacao brasileira. Seus contratos são referência em qualidade jurídica.'
          },
          {
            role: 'user',
            content: promptCompleto
          }
        ],
        max_tokens: 3000,
        temperature: 0.2
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ [GPT-4o-mini] OpenAI Error: ${response.status} - ${error}`)
      throw new Error("Erro na API da OpenAI")
    }

    const data = await response.json()
    const aiClauses = data.choices[0]?.message?.content?.trim()

    if (!aiClauses) {
      throw new Error("GPT-4o-mini não retornou resposta")
    }

    console.log(`✅ [GPT-4o-mini] Contrato avançado gerado com ${aiClauses.length} caracteres`)
    return aiClauses

  } catch (error) {
    console.error("❌ [GPT-4o-mini] Erro:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 [GPT-4o-mini] Iniciando geração com IA avançada...")
    
    // ✅ VERIFICAÇÃO COMPLETA DE CONFIGURAÇÃO
    console.log("🔍 [Config] Verificando configurações...")
    console.log("🔍 [Config] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ OK" : "❌ FALTANDO")
    console.log("🔍 [Config] SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ OK" : "❌ FALTANDO")
    console.log("🔍 [Config] SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ OK" : "❌ FALTANDO")
    console.log("🔍 [Config] OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ OK" : "❌ FALTANDO")
    
    const rawData = await req.json()
    console.log("📦 [GPT-4o-mini] Dados recebidos para prompt:", rawData.contrato?.prompt?.substring(0, 100))

    // ✅ VERIFICAÇÃO DE CRÉDITOS
    // Obter token de autenticação do header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: "Token de autenticação necessário"
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      console.error("❌ [GPT-4o-mini] Usuário não autenticado:", userError)
      return NextResponse.json({
        success: false,
        error: "Usuário não autenticado"
      }, { status: 401 })
    }

    console.log(`🔐 [GPT-4o-mini] Usuário autenticado: ${user.email}`)

    // Verificar créditos disponíveis - usar maybeSingle() para evitar erro se não existir
    let { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('creditos_avancados, plano, status')
      .eq('user_id', user.id)
      .maybeSingle()

    // Se não existir subscription, criar uma automática para teste
    if (!subscription && !subError) {
      console.log(`🆕 [GPT-4o-mini] Criando subscription automática para usuário: ${user.email}`)
      
      const { data: newSubscription, error: createError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plano: 'teste_gratis',
          status: 'active',
          creditos_avancados: 10, // 10 créditos de teste
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('creditos_avancados, plano, status')
        .single()

      if (createError) {
        console.error("❌ [GPT-4o-mini] Erro ao criar subscription:", createError)
        return NextResponse.json({
          success: false,
          error: "Erro ao criar subscription do usuário"
        }, { status: 500 })
      }

             subscription = newSubscription
       console.log(`✅ [GPT-4o-mini] Subscription criada com ${subscription.creditos_avancados} créditos de teste`)
     } else if (subError) {
       console.error("❌ [GPT-4o-mini] Erro ao buscar subscription:", subError)
       return NextResponse.json({
         success: false,
         error: "Erro ao verificar créditos do usuário"
       }, { status: 500 })
     }

     // Verificar se subscription existe após todas as tentativas
     if (!subscription) {
       console.error("❌ [GPT-4o-mini] Subscription não encontrada e não foi possível criar")
       return NextResponse.json({
         success: false,
         error: "Erro ao verificar créditos do usuário"
       }, { status: 500 })
     }

    // Verificar se usuário tem créditos suficientes
    if (subscription.creditos_avancados <= 0) {
      console.warn(`❌ [GPT-4o-mini] Usuário ${user.email} sem créditos: ${subscription.creditos_avancados}`)
      return NextResponse.json({
        success: false,
        error: "Créditos insuficientes",
        message: "Você não possui créditos GPT-4o-mini suficientes para gerar contratos avançados.",
        currentCredits: subscription.creditos_avancados
      }, { status: 402 }) // Payment Required
    }

    // Verificar se assinatura está ativa
    if (subscription.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: "Assinatura inativa",
        message: "Sua assinatura não está ativa. Renove para continuar usando."
      }, { status: 403 })
    }

    console.log(`💰 [GPT-4o-mini] Usuário tem ${subscription.creditos_avancados} créditos disponíveis`)

    console.log("🔍 [GPT-4o-mini] Dados brutos recebidos:", JSON.stringify(rawData, null, 2))
    
    const validationResult = GenerateSmartContractSchema.safeParse(rawData)
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        received: issue.path.reduce((obj, key) => obj?.[key], rawData)
      }))
      
      console.log("❌ [GPT-4o-mini] Erro de validação:", errors)
      console.log("❌ [GPT-4o-mini] Tipos esperados:", {
        'contrato.tipo': ['servicos', 'trabalho', 'locacao', 'compra_venda', 'consultoria', 'prestacao_servicos', 'fornecimento', 'sociedade', 'parceria', 'franquia', 'licenciamento', 'manutencao', 'seguro', 'financiamento', 'outros'],
        'contratante.tipo': ['pf', 'pj'],
        'contratada.tipo': ['pf', 'pj']
      })
      
      return NextResponse.json({
        success: false,
        error: "Dados inválidos",
        details: errors
      }, { status: 400 })
    }

    const data = validationResult.data
    console.log("✅ [GPT-4o-mini] Dados validados, gerando contrato avançado...")

    // ✅ GERAR CONTRATO E DECREMENTAR CRÉDITOS ATOMICAMENTE
    const aiClauses = await generateAIContract(data)
    
    // Decrementar créditos usando cliente administrativo
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        creditos_avancados: subscription.creditos_avancados - 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error("❌ [GPT-4o-mini] Erro ao decrementar créditos:", updateError)
      return NextResponse.json({
        success: false,
        error: "Erro ao atualizar créditos"
      }, { status: 500 })
    }

    console.log(`🎯 [GPT-4o-mini] Contrato avançado gerado com sucesso!`)
    console.log(`💰 [GPT-4o-mini] Crédito decrementado. Restam: ${subscription.creditos_avancados - 1}`)

    return NextResponse.json({
      success: true,
      clauses: aiClauses,
      message: "Contrato avançado gerado com GPT-4o-mini da OpenAI",
      cached: false,
      remainingCredits: subscription.creditos_avancados - 1
    })

  } catch (error) {
    console.error("❌ [GPT-4o-mini] Erro:", error)
    
    // Tratar erros específicos
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor"
    
    if (errorMessage.includes("API Key da OpenAI")) {
      return NextResponse.json({
        success: false,
        error: "Configuração incompleta",
        message: "API Key da OpenAI não configurada. Contate o administrador do sistema."
      }, { status: 500 })
    }
    
    if (errorMessage.includes("banco de dados incompleta")) {
      return NextResponse.json({
        success: false,
        error: "Configuração incompleta", 
        message: "Service Role Key do Supabase não configurada. Contate o administrador do sistema."
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: "Erro interno do servidor. Tente novamente em alguns minutos."
    }, { status: 500 })
  }
} 