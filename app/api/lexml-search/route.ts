import { type NextRequest, NextResponse } from "next/server"

// Simulação da API LexML para desenvolvimento
const simulateLexML = async (query: string) => {
  // Simular delay da API
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const mockLaws = [
    {
      title: "Lei nº 10.406/2002 - Código Civil",
      description: "Institui o Código Civil brasileiro, regulamentando contratos e obrigações.",
      url: "http://www.planalto.gov.br/ccivil_03/leis/2002/l10406.htm",
      relevance: 0.9,
    },
    {
      title: "Lei nº 8.078/1990 - Código de Defesa do Consumidor",
      description: "Dispõe sobre a proteção do consumidor e dá outras providências.",
      url: "http://www.planalto.gov.br/ccivil_03/leis/l8078.htm",
      relevance: 0.8,
    },
    {
      title: "Lei nº 13.874/2019 - Lei da Liberdade Econômica",
      description: "Institui a Declaração de Direitos de Liberdade Econômica.",
      url: "http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13874.htm",
      relevance: 0.7,
    },
  ]

  return {
    laws: mockLaws.filter((law) => law.title.toLowerCase().includes(query.toLowerCase().split(" ")[0])),
    query,
    total: mockLaws.length,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { query } = body

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ laws: [], query: "", total: 0 })
    }

    // Tentar usar LexML real (se disponível) ou simulação
    try {
      // Por enquanto, usar simulação
      const result = await simulateLexML(query)
      return NextResponse.json(result)
    } catch (lexmlError) {
      console.warn("Erro LexML:", lexmlError)
      // Retornar resultado vazio em caso de erro
      return NextResponse.json({ laws: [], query, total: 0 })
    }
  } catch (error) {
    console.error("Erro na API lexml-search:", error)
    return NextResponse.json({ laws: [], query: "", total: 0 })
  }
}
