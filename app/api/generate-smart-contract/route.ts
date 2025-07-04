import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { adjustContractRoles } from "../../../utils/contract-roles"

// Configurar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente administrativo para operações que requerem privilégios especiais
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceKey) {
  console.error("❌ [Supabase] SUPABASE_SERVICE_ROLE_KEY não configurada")
}

const PersonSchema = z.object({
  tipo: z.enum(["pf", "pj"]),
  nome: z.string().min(2).max(200),
  documento: z.string().min(8).max(20),
  endereco: z.string().min(5).max(300),
  cidade: z.string().min(2).max(100),
  estado: z.string().min(2).max(2),
  cep: z.string().optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
})

const ContractSchema = z.object({
  titulo: z.string().min(3).max(200),
  tipo: z.enum([
    "servicos",
    "trabalho",
    "locacao",
    "compra_venda",
    "consultoria",
    "prestacao_servicos",
    "fornecimento",
    "sociedade",
    "parceria",
    "franquia",
    "licenciamento",
    "manutencao",
    "seguro",
    "financiamento",
    "outros",
  ]),
  tipoPersonalizado: z.string().optional(),
  prompt: z.string().min(20, "PROMPT deve ter pelo menos 20 caracteres").max(3000),
  valor: z.string().min(1).max(50),
  prazo: z.string().min(1).max(100),
  observacoes: z.string().max(1000).optional(),
  template: z.string().optional(),
  leisSelecionadas: z
    .array(
      z.object({
        text: z.string(),
        description: z.string(),
        category: z.string().optional(),
        context: z.string().optional(),
      }),
    )
    .optional(),
})

const GenerateSmartContractSchema = z.object({
  contratante: PersonSchema,
  contratada: PersonSchema,
  contrato: ContractSchema,
})

// ✅ SISTEMA DE ECONOMIA DE TOKENS OTIMIZADO
const optimizePromptForTokens = (prompt: string, observacoes?: string): string => {
  const optimizedPrompt = prompt
    .replace(/\b(cordialmente|atenciosamente|respeitosamente)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  const optimizedObservacoes = observacoes
    ?.replace(/\b(cordialmente|atenciosamente|respeitosamente)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  return `${optimizedPrompt}${optimizedObservacoes ? ` | Observações: ${optimizedObservacoes}` : ""}`
}

const generateAIContract = async (data: z.infer<typeof GenerateSmartContractSchema>): Promise<string> => {
  const { contratante, contratada, contrato } = data

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    console.error("❌ [GPT-4o-mini] API Key da OpenAI não configurada")
    throw new Error("API Key da OpenAI nao configurada")
  }

  console.log(`🧠 [GPT-4o] Gerando contrato avançado baseado no prompt: "${contrato.prompt.substring(0, 100)}..."`)

  const optimizedUserPrompt = optimizePromptForTokens(contrato.prompt, contrato.observacoes)

  console.log(
    `💰 [Tokens] Prompt otimizado de ${contrato.prompt.length + (contrato.observacoes?.length || 0)} para ${optimizedUserPrompt.length} caracteres`,
  )

  const adjustedRoles = adjustContractRoles(contrato.tipo, contratante, contratada)

  let leisEspecificas = ""
  if (contrato.leisSelecionadas && contrato.leisSelecionadas.length > 0) {
    leisEspecificas = `

LEIS ESPECÍFICAS OBRIGATÓRIAS (DEVE USAR TODAS):
${contrato.leisSelecionadas
  .map(
    (lei, index) =>
      `${index + 1}. ${lei.text}
   Descrição: ${lei.description}
   ${lei.context ? `Contexto: ${lei.context}` : ""}
   ${lei.category ? `Área: ${lei.category}` : ""}
   ARTIGOS ESPECÍFICOS: Cite OBRIGATORIAMENTE os artigos exatos desta lei no contrato`,
  )
  .join("\n\n")}

INSTRUÇÕES CRÍTICAS SOBRE LEIS:
- CITE artigos, números de lei e dispositivos ESPECÍFICOS
- INCLUA pelo menos uma cláusula detalhada para CADA lei
- USE a nomenclatura EXATA das leis fornecidas
- DEMONSTRE conformidade legal explícita com cada dispositivo`
  }

  const roleIdentification = `

PAPÉIS CONTRATUAIS AUTO-AJUSTADOS:
${adjustedRoles.primary.role}: ${adjustedRoles.primary.nome} (${adjustedRoles.primary.tipo === "pf" ? "PF" : "PJ"})
- ${adjustedRoles.primary.description}

${adjustedRoles.secondary.role}: ${adjustedRoles.secondary.nome} (${adjustedRoles.secondary.tipo === "pf" ? "PF" : "PJ"})
- ${adjustedRoles.secondary.description}`

  const systemPrompt = `Você é um ADVOGADO ESPECIALISTA SÊNIOR com 30+ anos de experiência específica em Direito Contratual Brasileiro. Você é reconhecido pela OAB como especialista em elaboração de contratos com MÁXIMA SEGURANÇA JURÍDICA.

EXPERTISE ESPECÍFICA POR ÁREA:
- Direito Civil: Código Civil (Lei 10.406/2002), contratos em geral
- Direito do Consumidor: CDC (Lei 8.078/1990)
- Direito Trabalhista: CLT (Decreto-Lei 5.452/1943)
- Direito Empresarial: Lei 6.404/76, Lei 11.101/2005
- Direito Imobiliário: Lei 8.245/91 (Locações), Lei 6.766/79
- Direito Digital: LGPD (Lei 13.709/2018), Marco Civil (Lei 12.965/2014)
- Direito Tributário: CTN (Lei 5.172/1966)

DADOS DO CONTRATO A SER ELABORADO:
- Tipo: ${contrato.tipo}
- Título: ${contrato.titulo}
- Valor: ${contrato.valor}
- Prazo: ${contrato.prazo}${roleIdentification}${leisEspecificas}

MISSÃO ESPECÍFICA:
Elaborar um contrato SUPER COMPLETO, PROFISSIONAL e com MÁXIMA SEGURANÇA JURÍDICA. O contrato deve ser ÚNICO e ADAPTADO especificamente para este tipo: ${contrato.tipo}.

INSTRUÇÕES JURÍDICAS OBRIGATÓRIAS:

1. ADAPTAÇÃO AUTOMÁTICA INTELIGENTE:
   - ANALISE o tipo de contrato: ${contrato.tipo} e adapte TUDO automaticamente
   - Use terminologia específica para este tipo de contrato
   - Adapte papéis das partes automaticamente (ex: locador/locatário, empregador/empregado)
   - Use linguagem adequada para Pessoa Física vs Pessoa Jurídica
   - NUNCA repita dados que já estão no cabeçalho do contrato

2. ESTRUTURA SUPER COMPLETA (15-25 cláusulas):
   - COMECE direto com o OBJETO/FINALIDADE do contrato
   - NÃO repita identificação das partes (já está no cabeçalho)
   - Obrigações específicas de cada parte
   - Condições de pagamento (se aplicável)
   - Prazos e cronogramas
   - Garantias e seguros
   - Penalidades e multas
   - Rescisão e denúncia
   - Caso fortuito e força maior
   - Confidencialidade (se aplicável)
   - Propriedade intelectual (se aplicável)
   - Foro competente
   - Disposições gerais e finais

3. PRECISÃO LEGAL ABSOLUTA:
   - Use APENAS leis que se aplicam especificamente ao tipo: ${contrato.tipo}
   - Cite artigos, incisos e parágrafos EXATOS das leis aplicáveis
   - NUNCA use leis que não sejam pertinentes ao contexto específico
   - Fundamente cada cláusula em base legal sólida

4. LINGUAGEM JURÍDICA ADAPTADA:
   - "Fica estabelecido que...", "Comprometem-se as partes..."
   - "Conforme disposto no Art. X da Lei Y"
   - "Em caso de inadimplemento...", "Sob pena de..."
   - Use terminologia específica do tipo de contrato
   - Adapte automaticamente para PF/PJ conforme necessário

5. CLÁUSULAS DE SEGURANÇA OBRIGATÓRIAS:
   - Multa por descumprimento (% adequado ao tipo de contrato)
   - Juros e correção monetária
   - Honorários advocatícios
   - Foro da comarca específica
   - Validade e vigência

6. FORMATO HTML ESTRUTURADO:
   <div class="clause-container">
   <div class="clause-title">CLÁUSULA Xª - TÍTULO ESPECÍFICO</div>
   <div class="clause-content">
   <p>Conteúdo jurídico detalhado com fundamentação legal específica, conforme Art. X da Lei Y.</p>
   <p>Parágrafo 1º - Subcláusula detalhada quando necessário.</p>
   <p>Parágrafo 2º - Outra subcláusula se aplicável.</p>
   </div>
   </div>

REGRAS ESPECÍFICAS OBRIGATÓRIAS:
- NUNCA inclua dados das partes nas cláusulas (já estão no cabeçalho)
- NUNCA inclua assinaturas ou campos de assinatura (já tem template próprio)
- ADAPTE automaticamente os papéis conforme o tipo de contrato
- USE leis específicas e atuais para cada tipo de contrato
- CRIE conteúdo único baseado no prompt específico do usuário
- SEJA específico e contextual para cada situação

CRITÉRIOS DE QUALIDADE OBRIGATÓRIOS:
- Mínimo 15 cláusulas para contratos complexos
- Cada cláusula deve ter fundamentação legal específica
- Usar APENAS leis pertinentes ao tipo de contrato
- Incluir subcláusulas quando necessário
- Linguagem formal e precisa adaptada ao contexto
- Estrutura lógica e sequencial específica para o tipo

RESULTADO ESPERADO:
Um contrato único, personalizado e que qualquer advogado aprovaria, com segurança jurídica máxima, fundamentação legal sólida e proteção completa para ambas as partes.

Retorne APENAS as cláusulas do contrato em HTML limpo, sem marcações de código, sem dados das partes e sem assinaturas.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: optimizedUserPrompt,
          },
        ],
        max_tokens: 16000,
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ [GPT-4o] OpenAI Error: ${response.status} - ${error}`)
      throw new Error("Erro na API da OpenAI")
    }

    const responseData = await response.json()
    const aiClauses = responseData.choices[0]?.message?.content?.trim()

    if (!aiClauses) {
      throw new Error("GPT-4o não retornou resposta")
    }

    const tokensUsed = responseData.usage?.total_tokens || 0
    console.log(`💰 [Tokens] Utilizados: ${tokensUsed} tokens (máx: 16.000)`)
    console.log(`✅ [GPT-4o] Contrato avançado gerado com ${aiClauses.length} caracteres`)

    return aiClauses
  } catch (error) {
    console.error("❌ [GPT-4o] Erro:", error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 [GPT-4o] Iniciando geração com IA avançada...")

    console.log("🔍 [Config] Verificando configurações...")
    console.log("🔍 [Config] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ OK" : "❌ FALTANDO")
    console.log("🔍 [Config] SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ OK" : "❌ FALTANDO")
    console.log("🔍 [Config] SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ OK" : "❌ FALTANDO")
    console.log("🔍 [Config] OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ OK" : "❌ FALTANDO")

    const rawData = await req.json()
    console.log("📦 [GPT-4o] Dados recebidos para prompt:", rawData.contrato?.prompt?.substring(0, 100))

    // Obter token de autenticação do header
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Token de autenticação necessário",
        },
        { status: 401 },
      )
    }

    const token = authHeader.replace("Bearer ", "")

    // Criar cliente Supabase para verificar usuário
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    })

    // Verificar usuário autenticado usando o token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error("❌ [GPT-4o] Usuário não autenticado:", userError)
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 },
      )
    }

    console.log(`🔐 [GPT-4o] Usuário autenticado: ${user.email}`)

    // Verificar/Criar subscription com créditos
    let subscription

    try {
      if (!supabaseServiceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada")
      }

      const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceKey, {
        cookies: {
          get() {
            return undefined
          },
          set() {},
          remove() {},
        },
      })

      // Buscar subscription existente
      const { data: existingSubscription, error: fetchError } = await supabaseAdmin
        .from("subscriptions")
        .select("creditos_avancados, plano, status")
        .eq("user_id", user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("❌ [GPT-4o-mini] Erro ao buscar subscription:", fetchError)
        throw fetchError
      }

      if (existingSubscription) {
        subscription = existingSubscription
        console.log(`✅ [GPT-4o-mini] Subscription existente encontrada: ${subscription.creditos_avancados} créditos`)

        // Se tem 0 créditos, recarregar
        if (subscription.creditos_avancados <= 0) {
          console.log(`🔄 [GPT-4o-mini] Recarregando créditos para usuário: ${user.email}`)

          const { data: updatedSubscription, error: updateError } = await supabaseAdmin
            .from("subscriptions")
            .update({
              creditos_avancados: 50,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .select("creditos_avancados, plano, status")
            .single()

          if (updateError) {
            console.error("❌ [GPT-4o-mini] Erro ao recarregar créditos:", updateError)
          } else {
            subscription = updatedSubscription
            console.log(`✅ [GPT-4o-mini] Créditos recarregados: ${subscription.creditos_avancados}`)
          }
        }
      } else {
        // Criar nova subscription
        console.log(`🆕 [GPT-4o-mini] Criando subscription automática para usuário: ${user.email}`)

        const { data: newSubscription, error: createError } = await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: user.id,
              plano: "teste_gratis",
              status: "active",
              creditos_avancados: 50,
              data_expiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
              ignoreDuplicates: false,
            },
          )
          .select("creditos_avancados, plano, status")
          .single()

        if (createError) {
          console.error("❌ [GPT-4o-mini] Erro ao criar/atualizar subscription:", createError)
          return NextResponse.json(
            {
              success: false,
              error: "Erro ao criar subscription do usuário",
            },
            { status: 500 },
          )
        }

        subscription = newSubscription
        console.log(`✅ [GPT-4o-mini] Subscription criada com ${subscription.creditos_avancados} créditos de teste`)
      }
    } catch (error) {
      console.error("❌ [GPT-4o-mini] Erro ao gerenciar subscription:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao verificar créditos do usuário",
        },
        { status: 500 },
      )
    }

    if (!subscription) {
      console.error("❌ [GPT-4o-mini] Subscription não encontrada")
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao verificar créditos do usuário",
        },
        { status: 500 },
      )
    }

    // Verificar créditos
    if (subscription.creditos_avancados <= 0) {
      console.warn(`⚠️ [GPT-4o-mini] Usuário ${user.email} sem créditos: ${subscription.creditos_avancados}`)

      return NextResponse.json(
        {
          success: false,
          error: "Créditos insuficientes",
          message: "Você não possui créditos GPT-4o-mini suficientes para gerar contratos avançados.",
          currentCredits: subscription.creditos_avancados,
        },
        { status: 402 },
      )
    }

    // Verificar se assinatura está ativa
    if (subscription.status !== "active" && subscription.status !== "ativa") {
      return NextResponse.json(
        {
          success: false,
          error: "Assinatura inativa",
          message: "Sua assinatura não está ativa. Renove para continuar usando.",
        },
        { status: 403 },
      )
    }

    console.log(`💰 [GPT-4o-mini] Usuário tem ${subscription.creditos_avancados} créditos disponíveis`)

    const validationResult = GenerateSmartContractSchema.safeParse(rawData)

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        received: issue.path.reduce((obj, key) => obj?.[key], rawData),
      }))

      console.log("❌ [GPT-4o-mini] Erro de validação:", errors)

      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: errors,
        },
        { status: 400 },
      )
    }

    const data = validationResult.data
    console.log("✅ [GPT-4o-mini] Dados validados, gerando contrato avançado...")

    // Gerar contrato
    const aiClauses = await generateAIContract(data)

    // Decrementar créditos
    if (supabaseServiceKey) {
      const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceKey, {
        cookies: {
          get() {
            return undefined
          },
          set() {},
          remove() {},
        },
      })

      const { error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          creditos_avancados: subscription.creditos_avancados - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      if (updateError) {
        console.error("❌ [GPT-4o-mini] Erro ao decrementar créditos:", updateError)
      }
    }

    console.log(`🎯 [GPT-4o-mini] Contrato avançado gerado com sucesso!`)
    console.log(`💰 [GPT-4o-mini] Crédito decrementado. Restam: ${subscription.creditos_avancados - 1}`)

    return NextResponse.json({
      success: true,
      clauses: aiClauses,
      message: "Contrato avançado gerado com GPT-4o-mini da OpenAI",
      cached: false,
      remainingCredits: subscription.creditos_avancados - 1,
    })
  } catch (error) {
    console.error("❌ [GPT-4o-mini] Erro:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor"

    if (errorMessage.includes("API Key da OpenAI")) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuração incompleta",
          message: "API Key da OpenAI não configurada. Contate o administrador do sistema.",
        },
        { status: 500 },
      )
    }

    if (errorMessage.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuração incompleta",
          message: "Service Role Key do Supabase não configurada. Contate o administrador do sistema.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: "Erro interno do servidor. Tente novamente em alguns minutos.",
      },
      { status: 500 },
    )
  }
}
