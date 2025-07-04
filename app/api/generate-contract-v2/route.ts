import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"

// Schema para validação dos dados estruturados
const PersonSchema = z.object({
  tipo: z.enum(["pf", "pj"], {
    errorMap: () => ({ message: "Tipo deve ser 'pf' (Pessoa Física) ou 'pj' (Pessoa Jurídica)" }),
  }),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200, "Nome muito longo"),
  documento: z.string().min(8, "Documento deve ter pelo menos 8 caracteres").max(20, "Documento muito longo"),
  endereco: z.string().min(5, "Endereço deve ser informado").max(300, "Endereço muito longo"),
  cidade: z.string().min(2, "Cidade é obrigatória").max(100, "Nome da cidade muito longo"),
  estado: z.string().min(2, "Estado é obrigatório").max(2, "Estado deve ter exatamente 2 caracteres (ex: SP, RJ)"),
  cep: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email deve ter formato válido (exemplo@dominio.com)").optional().or(z.literal("")),
})

const ContractSchema = z.object({
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(200, "Título muito longo"),
  tipo: z.enum(
    [
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
    ],
    {
      errorMap: () => ({ message: "Tipo de contrato inválido" }),
    },
  ),
  tipoPersonalizado: z.string().optional(), // Para quando tipo for "outros"
  prompt: z.string().min(20, "PROMPT deve ter pelo menos 20 caracteres").max(3000, "PROMPT muito longo"),
  valor: z.string().min(1, "Valor é obrigatório").max(50, "Valor muito longo"),
  prazo: z.string().min(1, "Prazo é obrigatório").max(100, "Prazo muito longo"),
  observacoes: z.string().max(1000, "Observações muito longas").optional(),
  template: z.string().optional(), // Template visual escolhido
  leisSelecionadas: z
    .array(
      z.object({
        text: z.string(),
        description: z.string(),
        category: z.string().optional(),
        context: z.string().optional(),
      }),
    )
    .optional(), // Campo para leis selecionadas via OpenAI
})

const GenerateContractV2Schema = z.object({
  contratante: PersonSchema,
  contratada: PersonSchema,
  contrato: ContractSchema,
})

// Validação de CPF
const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, "")
  if (cleaned.length !== 11 || cleaned.match(/^(\d)\1{10}$/)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cleaned.charAt(i)) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== Number.parseInt(cleaned.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleaned.charAt(i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === Number.parseInt(cleaned.charAt(10))
}

// Validação de CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/[^\d]/g, "")
  if (cleaned.length !== 14 || cleaned.match(/^(\d)\1{13}$/)) return false

  let length = cleaned.length - 2
  let numbers = cleaned.substring(0, length)
  const digits = cleaned.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number.parseInt(digits.charAt(0))) return false

  length = length + 1
  numbers = cleaned.substring(0, length)
  sum = 0
  pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += Number.parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === Number.parseInt(digits.charAt(1))
}

// Templates CSS para diferentes estilos
const getTemplateStyles = (templateId: string): string => {
  const templates = {
    professional: `
      .contract-container { font-family: 'Times New Roman', serif; background: #fff; }
      .contract-header { border-bottom: 3px solid #1e40af; color: #1e40af; }
      .clause-title { background: #f8fafc; border-left: 4px solid #1e40af; padding: 12px; }
      .value-highlight { background: #fef3c7; border: 1px solid #f59e0b; }
    `,
    modern: `
      .contract-container { font-family: 'Segoe UI', sans-serif; background: linear-gradient(to bottom, #f8fafc, #fff); }
      .contract-header { border-bottom: 2px solid #06b6d4; color: #0891b2; background: #f0f9ff; }
      .clause-title { background: #06b6d4; color: white; padding: 10px; border-radius: 5px; }
      .value-highlight { background: #a5f3fc; border-radius: 4px; }
    `,
    minimalist: `
      .contract-container { font-family: 'Arial', sans-serif; background: #fff; }
      .contract-header { border-bottom: 1px solid #d1d5db; color: #374151; }
      .clause-title { border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 600; }
      .value-highlight { background: #f3f4f6; }
    `,
    corporate: `
      .contract-container { font-family: 'Georgia', serif; background: #1e293b; color: #f1f5f9; }
      .contract-header { border-bottom: 3px solid #eab308; color: #eab308; }
      .clause-title { background: #334155; border-left: 5px solid #eab308; color: #eab308; }
      .value-highlight { background: #fbbf24; color: #000; }
    `,
    legal: `
      .contract-container { font-family: 'Times New Roman', serif; background: #fffbeb; }
      .contract-header { border: 2px solid #92400e; color: #92400e; background: #fef3c7; }
      .clause-title { background: #fed7aa; border: 1px solid #ea580c; color: #9a3412; }
      .value-highlight { background: #fdba74; border: 1px solid #ea580c; }
    `,
    creative: `
      .contract-container { font-family: 'Verdana', sans-serif; background: linear-gradient(45deg, #fdf2f8, #f0fdf4); }
      .contract-header { border-bottom: 3px solid #ec4899; color: #be185d; }
      .clause-title { background: linear-gradient(90deg, #ec4899, #8b5cf6); color: white; border-radius: 10px; }
      .value-highlight { background: #fce7f3; border: 2px solid #ec4899; border-radius: 8px; }
    `,
    tech: `
      .contract-container { font-family: 'Monaco', monospace; background: #0f172a; color: #e2e8f0; }
      .contract-header { border-bottom: 2px solid #22d3ee; color: #22d3ee; background: #082f49; }
      .clause-title { background: #1e293b; border-left: 4px solid #06b6d4; color: #06b6d4; }
      .value-highlight { background: #164e63; color: #22d3ee; border: 1px solid #06b6d4; }
    `,
    premium: `
      .contract-container { font-family: 'Garamond', serif; background: linear-gradient(to bottom, #fef7cd, #fff); }
      .contract-header { border-bottom: 3px solid #d97706; color: #92400e; text-shadow: 1px 1px 2px #fbbf24; }
      .clause-title { background: linear-gradient(90deg, #f59e0b, #d97706); color: white; text-shadow: 1px 1px 2px #000; }
      .value-highlight { background: #fef3c7; border: 2px solid #f59e0b; box-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
    `,
    startup: `
      .contract-container { font-family: 'Roboto', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
      .contract-header { border-bottom: 2px solid #4f46e5; color: #fff; background: rgba(0,0,0,0.2); }
      .clause-title { background: rgba(0,0,0,0.3); border-left: 4px solid #10b981; color: #10b981; }
      .value-highlight { background: #10b981; color: #000; border-radius: 6px; }
    `,
    classic: `
      .contract-container { font-family: 'Book Antiqua', serif; background: #fefce8; }
      .contract-header { border: 3px double #a16207; color: #a16207; background: #fffbeb; }
      .clause-title { background: #fef3c7; border: 1px solid #d97706; color: #92400e; text-align: center; }
      .value-highlight { background: #fed7aa; border: 2px dotted #ea580c; }
    `,
  }

  return templates[templateId as keyof typeof templates] || templates.professional
}

// Gerar cláusulas dinâmicas com IA
const generateDynamicClauses = (data: z.infer<typeof GenerateContractV2Schema>): string => {
  const { contratante, contratada, contrato } = data

  // Gerar cláusulas específicas baseadas no tipo e objeto do contrato
  let specificClauses = ""

  if (contrato.tipo === "servicos") {
    specificClauses = `
    <div class="clause-title">CLÁUSULA 4ª - ESPECIFICAÇÕES TÉCNICAS</div>
    <div class="clause-content">
      <p>Os serviços serão executados conforme especificações técnicas detalhadas, incluindo:</p>
      <div class="clause-item">• Metodologia de trabalho definida e documentada;</div>
      <div class="clause-item">• Entregáveis específicos com critérios de aceitação;</div>
      <div class="clause-item">• Cronograma detalhado de execução das atividades;</div>
      <div class="clause-item">• Recursos técnicos e humanos adequados.</div>
    </div>
    
    <div class="clause-title">CLÁUSULA 5ª - PROPRIEDADE INTELECTUAL</div>
    <div class="clause-content">
      <p>Todos os direitos de propriedade intelectual sobre os resultados dos serviços prestados pertencerão ao CONTRATANTE, conforme Lei nº 9.609/98 (Lei do Software) e Lei nº 9.610/98 (Lei de Direitos Autorais).</p>
    </div>`
  } else if (contrato.tipo === "trabalho") {
    specificClauses = `
    <div class="clause-title">CLÁUSULA 4ª - JORNADA DE TRABALHO</div>
    <div class="clause-content">
      <p>A jornada de trabalho será conforme especificado, observando-se os limites da Consolidação das Leis do Trabalho (CLT) e Constituição Federal, artigo 7º, XIII.</p>
      <div class="clause-item">• Horário de trabalho: conforme acordo entre as partes;</div>
      <div class="clause-item">• Intervalos: respeitando legislação trabalhista;</div>
      <div class="clause-item">• Horas extras: quando acordadas, pagas com adicional legal.</div>
    </div>
    
    <div class="clause-title">CLÁUSULA 5ª - DIREITOS TRABALHISTAS</div>
    <div class="clause-content">
      <p>São assegurados todos os direitos previstos na legislação trabalhista vigente, incluindo férias, 13º salário, FGTS e demais benefícios conforme CLT.</p>
    </div>`
  }

  // Adicionar cláusulas baseadas nas observações
  let observationClauses = ""
  if (contrato.observacoes && contrato.observacoes.trim()) {
    const obs = contrato.observacoes.toLowerCase()

    if (obs.includes("confidencial") || obs.includes("sigilo") || obs.includes("dados")) {
      observationClauses += `
      <div class="clause-title">CLÁUSULA ESPECIAL - CONFIDENCIALIDADE</div>
      <div class="clause-content">
        <p>As partes comprometem-se ao sigilo absoluto sobre informações confidenciais, conforme Lei nº 13.709/18 (LGPD):</p>
        <div class="clause-item">• Proibição de divulgação a terceiros;</div>
        <div class="clause-item">• Uso exclusivo para fins contratuais;</div>
        <div class="clause-item">• Multa por descumprimento: R$ 50.000,00;</div>
        <div class="clause-item">• Vigência: 5 anos após término do contrato.</div>
      </div>`
    }

    if (obs.includes("garantia") || obs.includes("defeito")) {
      observationClauses += `
      <div class="clause-title">CLÁUSULA ESPECIAL - GARANTIA ESTENDIDA</div>
      <div class="clause-content">
        <p>Garantia integral conforme Código Civil (arts. 615-626) e Código de Defesa do Consumidor:</p>
        <div class="clause-item">• Prazo: 12 meses a partir da entrega;</div>
        <div class="clause-item">• Cobertura: vícios ocultos e defeitos;</div>
        <div class="clause-item">• Exclusões: uso inadequado ou força maior;</div>
        <div class="clause-item">• Reparo sem ônus adicional.</div>
      </div>`
    }
  }

  return specificClauses + observationClauses
}

// Gerar contrato com dados estruturados
const generateStructuredContract = (data: z.infer<typeof GenerateContractV2Schema>): string => {
  const { contratante, contratada, contrato } = data

  // Obter o template CSS escolhido
  const templateStyles = getTemplateStyles(contrato.template || "professional")

  // Gerar cláusulas dinâmicas
  const dynamicClauses = generateDynamicClauses(data)

  // Definir labels corretos baseado no tipo
  const contratanteLabel = contratante.tipo === "pf" ? "CONTRATANTE (Pessoa Física)" : "CONTRATANTE (Empresa)"
  const contratadaLabel = contratada.tipo === "pf" ? "CONTRATADA (Pessoa Física)" : "CONTRATADA (Empresa)"

  const contratanteDoc =
    contratante.tipo === "pf" ? `CPF nº ${contratante.documento}` : `CNPJ nº ${contratante.documento}`
  const contratadaDoc = contratada.tipo === "pf" ? `CPF nº ${contratada.documento}` : `CNPJ nº ${contratada.documento}`

  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contrato.titulo}</title>
    <style>
        @page {
            margin: 2.5cm;
            size: A4;
        }
        
        body {
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        ${templateStyles}
        
        .contract-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            min-height: 100vh;
        }
        
        .contract-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            border-radius: 8px;
        }
        
        .contract-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .contract-subtitle {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 5px;
        }
        
        .parties-intro {
            margin: 30px 0;
            text-align: justify;
            font-size: 14px;
            line-height: 1.7;
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #e5e7eb;
        }
        
        .party-info {
            font-weight: bold;
            margin: 15px 0;
            padding: 12px;
            border-radius: 6px;
        }
        
        .clause-title {
            font-weight: bold;
            font-size: 16px;
            margin: 25px 0 15px 0;
            padding: 15px;
            border-radius: 8px;
        }
        
        .clause-content {
            margin-left: 20px;
            margin-bottom: 20px;
            text-align: justify;
            font-size: 14px;
            line-height: 1.7;
        }
        
        .clause-item {
            margin: 8px 0;
            padding: 5px 0;
            padding-left: 15px;
        }
        
        .signatures {
            margin-top: 60px;
            text-align: center;
            padding: 20px;
        }
        
        .signature-block {
            display: inline-block;
            width: 45%;
            margin: 20px 2.5%;
            text-align: center;
        }
        
        .signature-line {
            border-top: 2px solid #666;
            margin: 50px 0 10px 0;
            padding-top: 15px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .value-highlight {
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: bold;
            display: inline-block;
            margin: 0 2px;
        }
        
        .ai-generated {
            font-size: 10px;
            text-align: right;
            opacity: 0.6;
            margin-top: 20px;
        }
        
        @media print {
            @page {
                size: A4;
                margin: 2cm;
            }
            
            body { 
                margin: 0; 
                padding: 0;
                font-size: 12pt;
                line-height: 1.4;
                color: #000 !important;
                background: white !important;
            }
            
            .contract-container { 
                max-width: none;
                margin: 0;
                padding: 0;
                box-shadow: none;
                page-break-inside: avoid;
            }
            
            .contract-header {
                page-break-after: avoid;
                break-after: avoid;
            }
            
            .clause-title {
                page-break-after: avoid;
                break-after: avoid;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .clause-content {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .signatures {
                page-break-before: avoid;
                break-before: avoid;
            }
            
            .ai-generated {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="contract-header">
            <h1 class="contract-title">${contrato.titulo}</h1>
            <div class="contract-subtitle">Contrato gerado com IA - GPT-4o-mini Avançado</div>
        </div>
        
        <div class="parties-intro">
            <div class="party-info">
                <strong>${contratanteLabel}:</strong> ${contratante.nome}, ${contratanteDoc}, 
                residente e domiciliado(a) em ${contratante.endereco}, ${contratante.cidade}/${contratante.estado}
                ${contratante.email ? `, e-mail: ${contratante.email}` : ""}
                ${contratante.telefone ? `, telefone: ${contratante.telefone}` : ""}, 
                doravante denominado(a) <strong>${contratanteLabel}</strong>.
            </div>
            
            <div class="party-info">
                <strong>${contratadaLabel}:</strong> ${contratada.nome}, ${contratadaDoc}, 
                residente e domiciliado(a) em ${contratada.endereco}, ${contratada.cidade}/${contratada.estado}
                ${contratada.email ? `, e-mail: ${contratada.email}` : ""}
                ${contratada.telefone ? `, telefone: ${contratada.telefone}` : ""}, 
                doravante denominado(a) <strong>${contratadaLabel}</strong>.
            </div>
            
            <p style="margin-top: 25px; text-align: justify;">
                As partes acima identificadas têm, entre si, justo e acordado o presente 
                <span class="value-highlight">${contrato.titulo}</span>, que se regerá pelas cláusulas e condições seguintes:
            </p>
        </div>

            <div class="clause-title">CLÁUSULA 1ª - OBJETO DO CONTRATO</div>
    <div class="clause-content">
      <p>${contrato.prompt}</p>
    </div>

        <div class="clause-title">CLÁUSULA 2ª - VALOR E FORMA DE PAGAMENTO</div>
        <div class="clause-content">
            <p>O valor total dos serviços será de <span class="value-highlight">${contrato.valor}</span>.</p>
            <p>O pagamento será realizado conforme acordado entre as partes, mediante apresentação de nota fiscal ou recibo.</p>
            <p>Em caso de atraso no pagamento, incidirão juros de 1% (um por cento) ao mês e multa de 2% (dois por cento) sobre o valor em atraso, conforme artigo 406 do Código Civil.</p>
        </div>

        <div class="clause-title">CLÁUSULA 3ª - PRAZO DE EXECUÇÃO</div>
        <div class="clause-content">
            <p>O prazo para execução dos serviços será de <span class="value-highlight">${contrato.prazo}</span>, contados a partir da assinatura deste contrato.</p>
            <p>O prazo poderá ser prorrogado mediante acordo expresso entre as partes, conforme necessidade técnica devidamente justificada.</p>
        </div>

        ${dynamicClauses}

        <div class="clause-title">CLÁUSULA 6ª - OBRIGAÇÕES DAS PARTES</div>
        <div class="clause-content">
            <p><strong>6.1. Obrigações da CONTRATADA:</strong></p>
            <div class="clause-item">• Executar os serviços objeto deste contrato com qualidade e dentro do prazo estabelecido;</div>
            <div class="clause-item">• Manter sigilo absoluto sobre todas as informações obtidas durante a execução dos serviços;</div>
            <div class="clause-item">• Comunicar imediatamente ao CONTRATANTE qualquer irregularidade ou dificuldade na execução dos serviços;</div>
            <div class="clause-item">• Atender aos padrões técnicos e de qualidade exigidos pelo mercado.</div>
            
            <p style="margin-top: 20px;"><strong>6.2. Obrigações do CONTRATANTE:</strong></p>
            <div class="clause-item">• Efetuar o pagamento nas condições e prazos estabelecidos;</div>
            <div class="clause-item">• Fornecer todas as informações e materiais necessários para a execução dos serviços;</div>
            <div class="clause-item">• Disponibilizar o ambiente adequado para a prestação dos serviços, quando necessário;</div>
            <div class="clause-item">• Colaborar ativamente para o bom andamento dos trabalhos.</div>
        </div>

        ${
          contrato.observacoes
            ? `
        <div class="clause-title">CLÁUSULA 7ª - DISPOSIÇÕES ESPECIAIS</div>
        <div class="clause-content">
            <p>${contrato.observacoes}</p>
        </div>
        `
            : ""
        }

        <div class="clause-title">CLÁUSULA 8ª - RESCISÃO</div>
        <div class="clause-content">
            <p>O presente contrato poderá ser rescindido:</p>
            <div class="clause-item">• Por acordo entre as partes;</div>
            <div class="clause-item">• Por inadimplemento de qualquer das cláusulas contratuais;</div>
            <div class="clause-item">• Por impossibilidade de execução dos serviços.</div>
            <p>Em caso de rescisão por inadimplemento, a parte culpada ficará sujeita ao pagamento de multa equivalente a 10% (dez por cento) do valor total do contrato.</p>
        </div>

        <div class="clause-title">CLÁUSULA 9ª - FORO</div>
        <div class="clause-content">
            <p>Fica eleito o foro da comarca de <span class="value-highlight">${contratante.cidade}/${contratante.estado}</span> para dirimir quaisquer questões decorrentes deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <p style="font-size: 18px; font-weight: bold;">${contratante.cidade}, ${dataAtual}.</p>
        </div>

        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line">${contratante.nome}<br>CONTRATANTE</div>
            </div>
            <div class="signature-block">
                <div class="signature-line">${contratada.nome}<br>CONTRATADA</div>
            </div>
        </div>
        
        <div class="ai-generated">
            Contrato gerado automaticamente pela NexarIA com tecnologia GPT-4o-mini Avançado
        </div>
    </div>
</body>
</html>`
}

// Cache em memória
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Sistema de detecção de padrões de bot (similar ao generate-smart-contract)
interface BotPattern {
  ip: string
  timestamps: number[]
  isBlocked: boolean
  blockEndTime?: number
  suspicionLevel: number
  blockCount: number
}

const botDetection = new Map<string, BotPattern>()

// Configuração para detecção
const BOT_CONFIG = {
  minInterval: 4000, // 4 segundos mínimo entre requests (mais conservador para v2)
  maxRequestsPerWindow: 4, // Máximo 4 requests em 3 minutos
  windowDuration: 180000, // Janela de 3 minutos
  patternThreshold: 65, // 65% de suspeita = bloqueio
  initialBlockDuration: 180000, // 3 minutos inicial
  maxBlockDuration: 3600000, // 1 hora máximo
}

// Função para detectar padrões suspeitos
function detectBotPatterns(ip: string, timestamps: number[]): number {
  if (timestamps.length < 2) return 0

  let suspicion = 0
  const recentRequests = timestamps.slice(-8) // Últimos 8 requests

  // 1. Detectar intervalos muito regulares (padrão de bot)
  const intervals = recentRequests.slice(1).map((timestamp, i) => timestamp - recentRequests[i])

  if (intervals.length >= 2) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance =
      intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length

    // Se a variância é muito baixa = padrão muito regular = bot
    if (variance < 150 && avgInterval < 8000) {
      suspicion += 45
      console.warn(`🤖 [Contract V2 Bot] IP ${ip}: Padrão regular detectado`, { avgInterval, variance })
    }
  }

  // 2. Detectar requests muito rápidos consecutivos
  const fastRequests = intervals.filter((interval) => interval < BOT_CONFIG.minInterval).length
  if (fastRequests > 0) {
    suspicion += fastRequests * 25
    console.warn(`🤖 [Contract V2 Bot] IP ${ip}: ${fastRequests} requests muito rápidos`)
  }

  // 3. Detectar volume alto em pouco tempo
  const last2Minutes = timestamps.filter((t) => Date.now() - t < 120000).length
  if (last2Minutes > 6) {
    suspicion += 30
    console.warn(`🤖 [Contract V2 Bot] IP ${ip}: ${last2Minutes} requests em 2 minutos`)
  }

  return Math.min(suspicion, 100)
}

// Função para verificar e atualizar detecção de bot
function checkBotDetection(ip: string): { isBlocked: boolean; reason?: string } {
  const now = Date.now()
  let pattern = botDetection.get(ip)

  if (!pattern) {
    pattern = {
      ip,
      timestamps: [now],
      isBlocked: false,
      suspicionLevel: 0,
      blockCount: 0,
    }
    botDetection.set(ip, pattern)
    return { isBlocked: false }
  }

  // Verificar se ainda está bloqueado
  if (pattern.isBlocked && pattern.blockEndTime && now < pattern.blockEndTime) {
    return {
      isBlocked: true,
      reason: `Bloqueado por suspeita de bot. Tente novamente em ${Math.ceil((pattern.blockEndTime - now) / 60000)} minutos.`,
    }
  }

  // Remover timestamps antigos (fora da janela)
  pattern.timestamps = pattern.timestamps.filter((t) => now - t < BOT_CONFIG.windowDuration)
  pattern.timestamps.push(now)

  // Verificar se excedeu limite de requests
  if (pattern.timestamps.length > BOT_CONFIG.maxRequestsPerWindow) {
    pattern.suspicionLevel += 40
    console.warn(`🤖 [Contract V2 Bot] IP ${ip}: Excedeu limite de requests (${pattern.timestamps.length})`)
  }

  // Detectar padrões suspeitos
  const patternSuspicion = detectBotPatterns(ip, pattern.timestamps)
  pattern.suspicionLevel = Math.max(pattern.suspicionLevel, patternSuspicion)

  // Aplicar bloqueio se necessário
  if (pattern.suspicionLevel >= BOT_CONFIG.patternThreshold) {
    pattern.isBlocked = true
    pattern.blockCount++

    // Aumentar duração do bloqueio progressivamente
    const blockDuration = Math.min(
      BOT_CONFIG.initialBlockDuration * Math.pow(2, pattern.blockCount - 1),
      BOT_CONFIG.maxBlockDuration,
    )

    pattern.blockEndTime = now + blockDuration

    console.warn(`🚫 [Contract V2 Bot] IP ${ip} BLOQUEADO por ${Math.ceil(blockDuration / 60000)} minutos`, {
      suspicionLevel: pattern.suspicionLevel,
      blockCount: pattern.blockCount,
      timestamps: pattern.timestamps.length,
    })

    return {
      isBlocked: true,
      reason: `Atividade suspeita detectada. Bloqueado por ${Math.ceil(blockDuration / 60000)} minutos.`,
    }
  }

  // Reduzir suspeita gradualmente se comportamento melhorar
  if (pattern.suspicionLevel > 0 && patternSuspicion < 20) {
    pattern.suspicionLevel = Math.max(0, pattern.suspicionLevel - 5)
  }

  botDetection.set(ip, pattern)
  return { isBlocked: false }
}

// Limpeza periódica do cache e detecção de bot
setInterval(() => {
  const now = Date.now()

  // Limpar cache expirado
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key)
    }
  }

  // Limpar detecção de bot expirada
  for (const [ip, pattern] of botDetection.entries()) {
    if (pattern.isBlocked && pattern.blockEndTime && now > pattern.blockEndTime) {
      pattern.isBlocked = false
      pattern.suspicionLevel = Math.max(0, pattern.suspicionLevel - 20)
    }

    // Remover entradas muito antigas
    if (pattern.timestamps.length === 0 || now - Math.max(...pattern.timestamps) > 3600000) {
      botDetection.delete(ip)
    }
  }
}, 60000) // Limpeza a cada minuto

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ✅ CORREÇÃO: Obter IP real do usuário
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ip = forwarded?.split(",")[0] || realIp || "unknown"

    console.log(`🚀 [Contract V2] Nova requisição de ${ip}`)

    // ✅ CORREÇÃO: Verificar detecção de bot
    const botCheck = checkBotDetection(ip)
    if (botCheck.isBlocked) {
      console.warn(`🚫 [Contract V2] Request bloqueado para ${ip}: ${botCheck.reason}`)
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: botCheck.reason,
          type: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 },
      )
    }

    // ✅ CORREÇÃO: Validar dados de entrada
    const body = await request.json()
    console.log("📝 [Contract V2] Dados recebidos:", {
      contratante: body.contratante?.nome,
      contratada: body.contratada?.nome,
      tipo: body.contrato?.tipo,
      titulo: body.contrato?.titulo,
    })

    // Validação com Zod
    const validationResult = GenerateContractV2Schema.safeParse(body)
    if (!validationResult.success) {
      console.error("❌ [Contract V2] Erro de validação:", validationResult.error.errors)
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    const data = validationResult.data

    // ✅ CORREÇÃO: Validar documentos (CPF/CNPJ)
    if (data.contratante.tipo === "pf" && !validateCPF(data.contratante.documento)) {
      return NextResponse.json({ error: "CPF do contratante inválido" }, { status: 400 })
    }

    if (data.contratante.tipo === "pj" && !validateCNPJ(data.contratante.documento)) {
      return NextResponse.json({ error: "CNPJ do contratante inválido" }, { status: 400 })
    }

    if (data.contratada.tipo === "pf" && !validateCPF(data.contratada.documento)) {
      return NextResponse.json({ error: "CPF da contratada inválido" }, { status: 400 })
    }

    if (data.contratada.tipo === "pj" && !validateCNPJ(data.contratada.documento)) {
      return NextResponse.json({ error: "CNPJ da contratada inválido" }, { status: 400 })
    }

    // ✅ CORREÇÃO: Verificar cache
    const cacheKey = JSON.stringify(data)
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("⚡ [Contract V2] Retornando do cache")
      return NextResponse.json({
        success: true,
        contract: cached.data,
        cached: true,
        processingTime: Date.now() - startTime,
      })
    }

    // ✅ CORREÇÃO: Gerar contrato estruturado
    console.log("🔄 [Contract V2] Gerando contrato estruturado...")
    const contractHtml = generateStructuredContract(data)

    // ✅ CORREÇÃO: Salvar no cache
    cache.set(cacheKey, {
      data: contractHtml,
      timestamp: Date.now(),
    })

    const processingTime = Date.now() - startTime
    console.log(`✅ [Contract V2] Contrato gerado com sucesso em ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      contract: contractHtml,
      cached: false,
      processingTime,
      metadata: {
        titulo: data.contrato.titulo,
        tipo: data.contrato.tipo,
        contratante: data.contratante.nome,
        contratada: data.contratada.nome,
        valor: data.contrato.valor,
        prazo: data.contrato.prazo,
        template: data.contrato.template || "professional",
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error("❌ [Contract V2] Erro ao gerar contrato:", error)

    // ✅ CORREÇÃO: Tratamento de erro melhorado
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados de entrada inválidos",
          details: error.errors,
          processingTime,
        },
        { status: 400 },
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Formato JSON inválido",
          message: "Verifique se os dados estão no formato correto",
          processingTime,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: "Tente novamente em alguns instantes",
        processingTime,
      },
      { status: 500 },
    )
  }
}

// ✅ CORREÇÃO: Adicionar método GET para health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Contract Generator V2",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    cache: {
      size: cache.size,
      maxAge: CACHE_DURATION,
    },
    botDetection: {
      activeIPs: botDetection.size,
      blockedIPs: Array.from(botDetection.values()).filter((p) => p.isBlocked).length,
    },
  })
}
