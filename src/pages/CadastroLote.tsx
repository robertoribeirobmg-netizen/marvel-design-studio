import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, ArrowLeft, AlertCircle, CheckCircle2, XCircle, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import ColumnMappingSelector from '@/components/ColumnMappingSelector';

interface CooperadoData {
  nome_completo: string;
  email: string;
  cpf?: string;
  telefone?: string;
  quadra?: string;
  lote?: string;
  fase?: string;
  data_compra?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

// Funções auxiliares de normalização
const normalizarCPF = (cpf: string | undefined): string | undefined => {
  if (!cpf) return undefined;
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.length === 11 ? cleaned : undefined;
};

const normalizarTelefone = (telefone: string | undefined): string | undefined => {
  if (!telefone) return undefined;
  const cleaned = telefone.replace(/\D/g, '');
  if (cleaned.length === 11) return `+55${cleaned}`;
  if (cleaned.length === 10) return `+55${cleaned}`;
  if (cleaned.startsWith('55') && cleaned.length === 13) return `+${cleaned}`;
  return cleaned.length >= 10 ? `+55${cleaned}` : undefined;
};

const normalizarData = (data: string | undefined): string | undefined => {
  if (!data) return undefined;
  
  // Se já está no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  
  // Se está no formato dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }
  
  // Tentar converter número do Excel (dias desde 1900-01-01)
  if (/^\d+$/.test(data)) {
    const excelDate = parseInt(data);
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return undefined;
};

const normalizarNome = (nome: string): string => {
  // Remove caracteres que não são letras, espaços ou acentos
  return nome.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
};

interface ColumnMapping {
  [key: string]: number | null;
}

export default function CadastroLote() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cooperados, setCooperados] = useState<CooperadoData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    nome_completo: null,
    email: null,
    cpf: null,
    telefone: null,
    quadra: null,
    lote: null,
    fase: null,
    data_compra: null,
  });
  const [resultado, setResultado] = useState<{
    success: number;
    errors: Array<{ nome: string; error: string }>;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      setShowPreview(false);
      setShowMapping(false);
      setResultado(null);
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      toast.error('Selecione um arquivo para processar');
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (sheetData.length < 2) {
        throw new Error('O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados');
      }

      // Extrair headers da primeira linha
      const headers = sheetData[0].map((h: any) => String(h || '').trim());
      setExcelHeaders(headers);
      setExcelData(sheetData);

      // Tentar auto-mapear colunas baseado nos nomes
      const autoMapping: ColumnMapping = {
        nome_completo: null,
        email: null,
        cpf: null,
        telefone: null,
        quadra: null,
        lote: null,
        fase: null,
        data_compra: null,
      };

      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('nome')) autoMapping.nome_completo = index;
        else if (headerLower.includes('email') || headerLower.includes('e-mail')) autoMapping.email = index;
        else if (headerLower.includes('cpf')) autoMapping.cpf = index;
        else if (headerLower.includes('telefone') || headerLower.includes('fone') || headerLower.includes('celular')) autoMapping.telefone = index;
        else if (headerLower.includes('quadra')) autoMapping.quadra = index;
        else if (headerLower.includes('lote')) autoMapping.lote = index;
        else if (headerLower.includes('fase')) autoMapping.fase = index;
        else if (headerLower.includes('data') && headerLower.includes('compra')) autoMapping.data_compra = index;
      });

      setColumnMapping(autoMapping);
      setShowMapping(true);
      toast.success('Arquivo processado! Configure o mapeamento das colunas');
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar o arquivo: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmMapping = async () => {
    // Validar mapeamento obrigatório
    if (columnMapping.nome_completo === null || columnMapping.email === null) {
      toast.error('Nome e Email são campos obrigatórios');
      return;
    }

    setIsProcessing(true);
    try {
      const cooperadosData: CooperadoData[] = [];

      // Processar dados usando mapeamento definido pelo usuário
      for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        
        const nomeRaw = columnMapping.nome_completo !== null ? String(row[columnMapping.nome_completo] || '').trim() : '';
        const emailRaw = columnMapping.email !== null ? String(row[columnMapping.email] || '').trim().toLowerCase() : '';
        
        if (!nomeRaw || !emailRaw) continue;
        
        // Verificar se o nome parece válido (tem pelo menos 2 palavras)
        if (nomeRaw.split(/\s+/).length < 2) {
          console.warn(`Nome inválido na linha ${i}:`, nomeRaw);
          continue;
        }

        if (!emailRaw.includes('@')) {
          console.warn(`Email inválido na linha ${i}:`, emailRaw);
          continue;
        }

        const cooperado: CooperadoData = {
          nome_completo: normalizarNome(nomeRaw),
          email: emailRaw,
          cpf: columnMapping.cpf !== null ? normalizarCPF(String(row[columnMapping.cpf] || '').trim()) : undefined,
          telefone: columnMapping.telefone !== null ? normalizarTelefone(String(row[columnMapping.telefone] || '').trim()) : undefined,
          quadra: columnMapping.quadra !== null ? String(row[columnMapping.quadra] || '').trim() || undefined : undefined,
          lote: columnMapping.lote !== null ? String(row[columnMapping.lote] || '').trim() || undefined : undefined,
          fase: columnMapping.fase !== null ? String(row[columnMapping.fase] || '').trim() || undefined : undefined,
          data_compra: columnMapping.data_compra !== null ? normalizarData(String(row[columnMapping.data_compra] || '').trim()) : undefined,
        };

        cooperadosData.push(cooperado);
      }

      // Verificar duplicatas no banco
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('nome_completo, email, quadra, lote');

      if (!error && profiles) {
        console.log(`✅ ${cooperadosData.length} cooperados processados do Excel`);
        console.log('Primeiros 3 cooperados:', cooperadosData.slice(0, 3));
      }
      
      // Marcar duplicatas
      cooperadosData.forEach(coop => {
        const duplicateByName = profiles?.find(p => 
          p.nome_completo.toUpperCase() === coop.nome_completo.toUpperCase()
        );
        const duplicateByEmail = profiles?.find(p => 
          p.email && coop.email && p.email.toLowerCase() === coop.email.toLowerCase()
        );
        const duplicateByLote = profiles?.find(p => 
          coop.quadra && coop.lote && p.quadra === coop.quadra && p.lote === coop.lote
        );

        if (duplicateByName) {
          coop.isDuplicate = true;
          coop.duplicateReason = 'Nome já cadastrado';
        } else if (duplicateByEmail) {
          coop.isDuplicate = true;
          coop.duplicateReason = 'Email já cadastrado';
        } else if (duplicateByLote) {
          coop.isDuplicate = true;
          coop.duplicateReason = 'Quadra/Lote já cadastrado';
        }
      });

      setCooperados(cooperadosData);
      setShowPreview(true);
      
      if (cooperadosData.length === 0) {
        toast.error('Nenhum cooperado válido encontrado no arquivo. Verifique o formato do Excel.');
      } else {
        toast.success(`${cooperadosData.length} cooperados encontrados no arquivo`);
      }
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar o arquivo: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const cooperadosParaImportar = cooperados.filter(c => !c.isDuplicate);
    
    if (cooperadosParaImportar.length === 0) {
      toast.error('Nenhum cooperado válido para importar');
      return;
    }

    setIsImporting(true);
    const errors: Array<{ nome: string; error: string }> = [];
    let successCount = 0;

    for (const cooperado of cooperadosParaImportar) {
      try {
        // Validações ANTES de enviar
        if (!cooperado.nome_completo || cooperado.nome_completo.trim().length < 3) {
          throw new Error('Nome completo inválido ou muito curto');
        }
        
        if (!cooperado.email || !cooperado.email.includes('@')) {
          throw new Error('Email inválido ou não fornecido');
        }

        const autoPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

        // Preparar dados com validações
        const dadosParaEnviar = {
          email: cooperado.email,
          password: autoPassword,
          nome_completo: cooperado.nome_completo,
          cpf: cooperado.cpf || null,
          telefone: cooperado.telefone || null,
          quadra: cooperado.quadra || null,
          lote: cooperado.lote || null,
          fase: cooperado.fase || null,
          data_compra: cooperado.data_compra || null,
        };

        console.log('✅ Dados validados para envio:', JSON.stringify(dadosParaEnviar, null, 2));

        const { data, error } = await supabase.functions.invoke('create-user', {
          body: dadosParaEnviar,
        });

        if (error) throw error;
        successCount++;
      } catch (error: any) {
        console.error(`❌ Erro ao criar cooperado ${cooperado.nome_completo || 'sem nome'}:`, error);
        errors.push({
          nome: cooperado.nome_completo || 'Sem nome',
          error: error.message || 'Erro desconhecido'
        });
      }
    }

    setResultado({ success: successCount, errors });
    setIsImporting(false);

    if (successCount > 0) {
      toast.success(`${successCount} cooperados cadastrados com sucesso!`);
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} erros durante o cadastro`);
    }
  };

  const handleDownloadTemplate = () => {
    // Criar template Excel com exemplo
    const templateData = [
      ['Nome Completo', 'Email', 'CPF', 'Telefone', 'Quadra', 'Lote', 'Fase', 'Data Compra'],
      ['João da Silva Santos', 'joao.silva@email.com', '123.456.789-00', '(71) 98765-4321', 'A', '10', 'Fase 1', '2024-01-15'],
      ['Maria Oliveira Costa', 'maria.oliveira@email.com', '987.654.321-00', '(71) 99876-5432', 'B', '25', 'Fase 2', '2024-02-20'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cooperados');
    XLSX.writeFile(wb, 'template_cooperados.xlsx');
    toast.success('Template baixado com sucesso!');
  };

  const cooperadosValidos = cooperados.filter(c => !c.isDuplicate).length;
  const cooperadosDuplicados = cooperados.filter(c => c.isDuplicate).length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Cadastro em Lote</h1>
          <p className="text-muted-foreground">
            Importe múltiplos cooperados a partir de um arquivo Excel
          </p>
        </div>
      </div>

      {/* Upload Section */}
      {!showMapping && !showPreview && !resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload do Arquivo Excel
            </CardTitle>
            <CardDescription>
              O arquivo deve conter as colunas: Nome, Email, CPF, Telefone, Quadra, Lote, Fase, Data Compra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Formato esperado:</strong> A primeira linha deve conter os cabeçalhos.
                As colunas Nome e Email são obrigatórias.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Baixar Template Excel
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              <Button
                onClick={handleProcessFile}
                disabled={!file || isProcessing}
                size="lg"
              >
                {isProcessing ? (
                  <>Processando...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Processar
                  </>
                )}
              </Button>
            </div>

            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: <code className="bg-muted px-2 py-1 rounded">{file.name}</code>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapping Section */}
      {showMapping && !showPreview && (
        <div className="space-y-6">
          <ColumnMappingSelector
            excelHeaders={excelHeaders}
            excelData={excelData}
            columnMapping={columnMapping}
            onMappingChange={(field, columnIndex) => {
              setColumnMapping(prev => ({
                ...prev,
                [field]: columnIndex
              }));
            }}
          />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setShowMapping(false);
                setFile(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <Button
              onClick={handleConfirmMapping}
              disabled={columnMapping.nome_completo === null || columnMapping.email === null || isProcessing}
              size="lg"
            >
              {isProcessing ? (
                <>Processando...</>
              ) : (
                <>
                  Continuar para Preview
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {showPreview && !resultado && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Preview dos Cooperados
              </CardTitle>
              <CardDescription>
                Revise os dados antes de confirmar o cadastro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total no Arquivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{cooperados.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Válidos para Cadastro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-2xl font-bold">{cooperadosValidos}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Duplicados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-2xl font-bold">{cooperadosDuplicados}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Quadra/Lote</TableHead>
                      <TableHead>Fase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cooperados.map((cooperado, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {cooperado.isDuplicate ? (
                            <Badge variant="destructive">
                              {cooperado.duplicateReason}
                            </Badge>
                          ) : (
                            <Badge variant="default">Novo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{cooperado.nome_completo}</TableCell>
                        <TableCell>{cooperado.email}</TableCell>
                        <TableCell>{cooperado.cpf || '-'}</TableCell>
                        <TableCell>
                          {cooperado.quadra && cooperado.lote
                            ? `${cooperado.quadra}/${cooperado.lote}`
                            : '-'}
                        </TableCell>
                        <TableCell>{cooperado.fase || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={cooperadosValidos === 0 || isImporting}
                  size="lg"
                >
                  {isImporting ? (
                    <>Cadastrando...</>
                  ) : (
                    <>Confirmar Cadastro de {cooperadosValidos} Cooperados</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Section */}
      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Resultado do Cadastro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{resultado.success} cooperados cadastrados com sucesso!</strong>
              </AlertDescription>
            </Alert>

            {resultado.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-destructive">
                  Erros ({resultado.errors.length}):
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{error.nome}</TableCell>
                          <TableCell className="text-destructive">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Voltar para Admin
              </Button>
              <Button onClick={() => {
                setResultado(null);
                setShowPreview(false);
                setCooperados([]);
                setFile(null);
              }}>
                Novo Cadastro em Lote
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
