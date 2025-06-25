"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  Download,
  Edit3,
  Clock,
  Database,
  Scale,
  AlertTriangle,
  CheckCircle,
  Save,
  X,
  Lock,
} from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"

interface ContractPreviewModalProps {
  content: any
  title: string
  isOpen: boolean
  onClose: () => void
  onExport: (format: "pdf" | "word") => void
  onEditInput: () => void
  onTitleSave: (newTitle: string) => void
  contractType: "simple" | "advanced"
  cacheHit: boolean
  lexmlData?: any
}

export default function ContractPreviewModal({
  content,
  title,
  isOpen,
  onClose,
  onExport,
  onEditInput,
  onTitleSave,
  contractType,
  cacheHit,
  lexmlData,
}: ContractPreviewModalProps) {
  const [exporting, setExporting] = useState<"pdf" | "word" | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState(title)
  const { subscription, isFreePlan } = useSubscription()

  const handleExport = async (format: "pdf" | "word") => {
    // Block Word export for free plans
    if (format === "word" && isFreePlan) {
      return
    }

    setExporting(format)
    try {
      await onExport(format)
    } finally {
      setExporting(null)
    }
  }

  const handleTitleSave = () => {
    if (newTitle.trim() && newTitle !== title) {
      onTitleSave(newTitle.trim())
    }
    setEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setNewTitle(title)
    setEditingTitle(false)
  }

  // O conteúdo agora é um objeto, então precisamos de uma string para o preview.
  const displayContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-green-600" />
              <div className="flex flex-col">
                {editingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="text-lg font-semibold"
                      maxLength={100}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleTitleSave} className="bg-green-600 hover:bg-green-700">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleTitleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl">{title}</DialogTitle>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTitle(true)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={contractType === "simple" ? "default" : "destructive"}>
                    {contractType === "simple" ? "Simples" : "Avançado"}
                  </Badge>
                  {cacheHit && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      <Database className="h-3 w-3 mr-1" />
                      Cache
                    </Badge>
                  )}
                  {lexmlData && (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <Scale className="h-3 w-3 mr-1" />
                      LexML
                    </Badge>
                  )}
                  {isFreePlan && (
                    <Badge variant="outline" className="text-purple-600 border-purple-200">
                      Plano Gratuito
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Informações adicionais */}
        {(cacheHit || lexmlData) && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {cacheHit && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Recuperado do cache (geração instantânea)</span>
                </div>
              )}
              {lexmlData && (
                <div className="flex items-center gap-1">
                  <Scale className="h-4 w-4 text-green-600" />
                  <span>Consulta legal: {lexmlData.total || 0} referências encontradas</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo do contrato */}
        <div className="flex-1 px-6 relative">
          {/* Marca d'água para planos gratuitos */}
          {isFreePlan && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              style={{
                transform: "rotate(-45deg)",
                fontSize: "72px",
                color: "rgba(184, 134, 11, 0.1)",
                fontWeight: "bold",
                userSelect: "none",
              }}
            >
              NEXAR IA
            </div>
          )}

          <ScrollArea className="h-[500px] w-full">
            <div className="contract-preview bg-white dark:bg-gray-900 p-8 rounded-lg border shadow-sm">
              {/* Renderizar HTML diretamente */}
              <div
                className="contract-content"
                style={{
                  fontFamily: "monospace",
                  fontSize: "10pt",
                  lineHeight: "1.4",
                  color: "#000",
                  whiteSpace: "pre-wrap",
                }}
                dangerouslySetInnerHTML={{
                  __html: displayContent,
                }}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Disclaimer apenas no preview, não no PDF */}
        <div className="px-6">
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
              <strong>Este documento foi gerado por IA especializada em direito.</strong> Não substitui advogado.
              Consulte profissional antes de usar em situações formais.
            </AlertDescription>
          </Alert>
        </div>

        {/* Ações */}
        <div className="p-6 pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onEditInput} variant="outline" className="flex-1">
              <Edit3 className="mr-2 h-4 w-4" />
              Editar Descrição
            </Button>

            <Button
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {exporting === "pdf" ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </>
              )}
            </Button>

            <Button
              onClick={() => handleExport("word")}
              disabled={exporting !== null || isFreePlan}
              className={`flex-1 ${
                isFreePlan ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
              title={isFreePlan ? "Disponível apenas em planos pagos" : ""}
            >
              {isFreePlan && <Lock className="mr-2 h-4 w-4" />}
              {exporting === "word" ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Word {isFreePlan && "(Premium)"}
                </>
              )}
            </Button>
          </div>

          {isFreePlan && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 Upgrade para Premium para exportar em Word e remover marca d'água
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
