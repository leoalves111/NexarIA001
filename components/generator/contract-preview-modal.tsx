"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Download, Edit3, Clock, Database, Scale, AlertTriangle, CheckCircle, Save, X } from "lucide-react"

interface ContractPreviewModalProps {
  content: string
  title: string
  isOpen: boolean
  onClose: () => void
  onExport: (format: "pdf" | "word") => void
  onEditInput: () => void
  onTitleSave: (newTitle: string) => void
  contractType: "simple" | "advanced"
  cacheHit: boolean
  lexmlData?: any
  isDemo: boolean
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
  isDemo,
}: ContractPreviewModalProps) {
  const [exporting, setExporting] = useState<"pdf" | "word" | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState(title)

  const handleExport = async (format: "pdf" | "word") => {
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
                  {isDemo && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Demo
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
        <div className="flex-1 px-6">
          <ScrollArea className="h-[500px] w-full">
            <div className="contract-preview bg-white dark:bg-gray-900 p-8 rounded-lg border shadow-sm">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  lineHeight: "1.8",
                  fontSize: "14px",
                }}
              >
                <div className="whitespace-pre-wrap font-serif text-gray-900 dark:text-gray-100">
                  {content.split("\n").map((line, index) => {
                    if (line.startsWith("# ")) {
                      return (
                        <h1 key={index} className="text-xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                          {line.replace("# ", "")}
                        </h1>
                      )
                    }
                    if (line.startsWith("## ")) {
                      return (
                        <h2 key={index} className="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">
                          {line.replace("## ", "")}
                        </h2>
                      )
                    }
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return (
                        <p key={index} className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          {line.replace(/\*\*/g, "")}
                        </p>
                      )
                    }
                    return (
                      <p key={index} className="mb-2 text-gray-800 dark:text-gray-200">
                        {line}
                      </p>
                    )
                  })}
                </div>
              </div>

              {/* Rodapé do documento */}
              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {isDemo && (
                    <div className="mb-2 text-orange-600 font-medium">⚠️ NEXAR IA DEMO - Documento de demonstração</div>
                  )}
                  <div>Documento gerado por NEXAR IA – não substitui orientação jurídica profissional.</div>
                  <div className="mt-1">
                    Gerado em: {new Date().toLocaleString("pt-BR")} • Tipo:{" "}
                    {contractType === "simple" ? "Contrato Simples" : "Contrato Avançado"}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Disclaimer */}
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
              disabled={exporting !== null}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {exporting === "word" ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Word
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
