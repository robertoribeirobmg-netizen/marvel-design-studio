import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, ArrowLeft, AlertCircle, CheckCircle2, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

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

export default function CadastroLote() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cooperados, setCooperados] = useState<CooperadoData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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

      const cooperadosData: CooperadoData[] = [];

      // Pular o cabeçalho (linha 0)
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row[0]) continue; // Pular linhas vazias

        const nome = String(row[0] || '').trim();
        if (!nome) continue;

        const cooperado: CooperadoData = {
          nome_completo: nome,
          email: String(row[1] || '').trim(),
          cpf: String(row[2] || '').trim() || undefined,
          telefone: String(row[3] || '').trim() || undefined,
          quadra: String(row[4] || '').trim() || undefined,
          lote: String(row[5] || '').trim() || undefined,
          fase: String(row[6] || '').trim() || undefined,
          data_compra: String(row[7] || '').trim() || undefined,
        };

        cooperadosData.push(cooperado);
      }

      // Verificar duplicatas no banco
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('nome_completo, email, quadra, lote');

      if (error) throw error;

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
      toast.success(`${cooperadosData.length} cooperados encontrados no arquivo`);
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
        const autoPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

        const { error } = await supabase.functions.invoke('create-user', {
          body: {
            email: cooperado.email,
            password: autoPassword,
            nome_completo: cooperado.nome_completo,
            cpf: cooperado.cpf,
            telefone: cooperado.telefone,
            quadra: cooperado.quadra,
            lote: cooperado.lote,
            fase: cooperado.fase,
            data_compra: cooperado.data_compra,
          },
        });

        if (error) throw error;
        successCount++;
      } catch (error: any) {
        console.error(`Erro ao criar cooperado ${cooperado.nome_completo}:`, error);
        errors.push({
          nome: cooperado.nome_completo,
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
      {!showPreview && !resultado && (
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
