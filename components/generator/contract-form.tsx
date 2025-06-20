"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, FileText, Zap } from "lucide-react"

interface ContractFormProps {
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  onGenerate: () => void
  generating: boolean
  contractType: "simple" | "advanced"
  disabled?: boolean
  userPlan?: string
}

export default function ContractForm({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  onGenerate,
  generating,
  contractType,
  disabled = false,
  userPlan = "Básico",
}: ContractFormProps) {
  const [titleCount, setTitleCount] = useState(0)
  const [descriptionCount, setDescriptionCount] = useState(0)
  const [descriptionProgress, setDescriptionProgress] = useState(0)

  const maxTitleChars = 100
  const maxDescriptionChars = 5000

  useEffect(() => {
    setTitleCount(title.length)
  }, [title])

  useEffect(() => {
    setDescriptionCount(description.length)
    setDescriptionProgress((description.length / maxDescriptionChars) * 100)
  }, [description])

  const isTitleOverLimit = titleCount > maxTitleChars
  const isDescriptionOverLimit = descriptionCount > maxDescriptionChars
  const isDescriptionNearLimit = descriptionProgress > 80

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          Informações do Contrato
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Título do Contrato */}
        <div>
          <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Título do Contrato
          </Label>
          <Input
            id="title"
            placeholder="Ex: Contrato de Prestação de Serviços de Marketing Digital"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={`mt-2 ${
              isTitleOverLimit
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
            disabled={generating || disabled}
            maxLength={maxTitleChars + 10}
          />
          <div className="mt-1 flex justify-between items-center text-xs">
            <span className={`${isTitleOverLimit ? "text-red-600" : "text-gray-500"}`}>
              {titleCount} / {maxTitleChars} caracteres
            </span>
          </div>
        </div>

        {/* Descrição do Contrato */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição detalhada do contrato
            </Label>
            <Badge variant="outline" className="text-xs">
              Plano: {userPlan} • Limite: {descriptionCount.toLocaleString()}/5.000
            </Badge>
          </div>
          <Textarea
            id="description"
            placeholder={`Descreva detalhadamente o contrato que você precisa:

• Tipo de serviço ou produto
• Partes envolvidas (contratante e contratado)
• Valores e forma de pagamento
• Prazos e cronograma
• Cláusulas especiais (confidencialidade, não concorrência, etc.)
• Condições de rescisão
• Outras informações relevantes

Exemplo: "Preciso de um contrato de prestação de serviços de consultoria em marketing digital para uma empresa de tecnologia, com duração de 6 meses, valor mensal de R$ 5.000,00, pagamento até o dia 5 de cada mês, com cláusulas de confidencialidade e não concorrência..."`}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className={`min-h-[200px] mt-2 resize-none ${
              isDescriptionOverLimit
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : isDescriptionNearLimit
                  ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
            disabled={generating || disabled}
            maxLength={maxDescriptionChars + 100}
          />

          {/* Contador de caracteres e barra de progresso */}
          <div className="mt-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span
                className={`${
                  isDescriptionOverLimit ? "text-red-600" : isDescriptionNearLimit ? "text-yellow-600" : "text-gray-500"
                }`}
              >
                {descriptionCount.toLocaleString()} / {maxDescriptionChars.toLocaleString()} caracteres
              </span>
              <span className="text-gray-400">Tipo: {contractType === "simple" ? "Simples" : "Avançado"}</span>
            </div>

            <Progress
              value={Math.min(descriptionProgress, 100)}
              className={`h-2 ${
                isDescriptionOverLimit
                  ? "[&>div]:bg-red-500"
                  : isDescriptionNearLimit
                    ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-green-500"
              }`}
            />
          </div>
        </div>

        {/* Avisos */}
        {isTitleOverLimit && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              Título muito longo. Reduza em {titleCount - maxTitleChars} caracteres.
            </AlertDescription>
          </Alert>
        )}

        {isDescriptionOverLimit && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              Limite de caracteres excedido. Reduza o texto em{" "}
              {(descriptionCount - maxDescriptionChars).toLocaleString()} caracteres.
            </AlertDescription>
          </Alert>
        )}

        {isDescriptionNearLimit && !isDescriptionOverLimit && (
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Você está próximo do limite. Restam {(maxDescriptionChars - descriptionCount).toLocaleString()}{" "}
              caracteres.
            </AlertDescription>
          </Alert>
        )}

        {/* Botão de gerar */}
        <Button
          onClick={onGenerate}
          disabled={
            generating || !title.trim() || !description.trim() || isTitleOverLimit || isDescriptionOverLimit || disabled
          }
          className={`w-full ${
            contractType === "simple" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-red-500 hover:bg-red-600"
          }`}
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Gerando contrato...
            </>
          ) : (
            <>
              {contractType === "simple" ? <FileText className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />}
              Gerar {title || "Contrato"}
            </>
          )}
        </Button>

        {/* Disclaimer */}
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
            <strong>Importante:</strong> Nosso sistema fornece contratos sofisticados, mas não substitui orientação
            jurídica profissional. Consulte um advogado para validação legal antes de usar em situações formais.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
