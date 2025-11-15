import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';
import { ChevronLeft, ChevronRight, ArrowLeft, Upload, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewRow {
  row: number;
  nome_completo: string;
  email: string;
  password: string;
  cpf?: string;
  telefone?: string;
  quadra?: string;
  lote?: string;
  fase?: string;
  data_compra?: string;
  valid: boolean;
}

interface FinancialPreviewRow {
  cliente: string;
  quadraLote: string;
  numeroParcelas: number;
  parcelasValidas: number;
  valorTotal: string;
  valorPago: string;
  parcelas: any[];
  valido: boolean;
}

interface PreviewStats {
  total: number;
  valid: number;
  invalid: number;
  autogenPasswords?: number;
  totalRegistros?: number;
  registrosValidos?: number;
  registrosInvalidos?: number;
  totalParcelas?: number;
}

export default function PreviewImportacao() {
  const location = useLocation();
  const navigate = useNavigate();
  const { previewData, previewStats, isFinancialImport } = location.state || { previewData: [], previewStats: {}, isFinancialImport: false };

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [previewPage, setPreviewPage] = useState(1);
  const [previewItemsPerPage] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!previewData || previewData.length === 0) {
      toast.error('Nenhum dado de preview disponível');
      navigate('/admin');
      return;
    }

    // Select all valid rows by default
    if (isFinancialImport) {
      const validRowsSet = new Set<number>(
        previewData.map((_: any, idx: number) => idx).filter((idx: number) => previewData[idx].valido)
      );
      setSelectedRows(validRowsSet);
    } else {
      const validRowsSet = new Set<number>(previewData.filter((r: PreviewRow) => r.valid).map((r: PreviewRow) => r.row));
      setSelectedRows(validRowsSet);
    }
  }, [previewData, navigate, isFinancialImport]);

  const handleToggleRow = (rowNumber: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowNumber)) {
        newSet.delete(rowNumber);
      } else {
        newSet.add(rowNumber);
      }
      return newSet;
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    if (!sortColumn) return previewData;

    return [...previewData].sort((a: any, b: any) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle financial data specific columns
      if (isFinancialImport) {
        if (sortColumn === 'numeroParcelas' || sortColumn === 'parcelasValidas') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else if (sortColumn === 'valorTotal' || sortColumn === 'valorPago') {
          // Remove currency formatting for comparison
          aValue = parseFloat(aValue.replace(/[^\d,-]/g, '').replace(',', '.'));
          bValue = parseFloat(bValue.replace(/[^\d,-]/g, '').replace(',', '.'));
        }
      } else {
        // Handle user data specific columns
        if (sortColumn === 'row') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 inline-block" />
      : <ArrowDown className="ml-2 h-4 w-4 inline-block" />;
  };

  const handleToggleAll = () => {
    if (isFinancialImport) {
      const sortedData = getSortedData();
      const currentPageData = sortedData
        .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
        .filter((r: FinancialPreviewRow) => r.valido);
      
      const currentPageIndices = currentPageData.map((item: any) => 
        previewData.indexOf(item)
      );
      
      const allSelected = currentPageIndices.every(idx => selectedRows.has(idx));
      
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        if (allSelected) {
          currentPageIndices.forEach(idx => newSet.delete(idx));
        } else {
          currentPageIndices.forEach(idx => newSet.add(idx));
        }
        return newSet;
      });
    } else {
      const sortedData = getSortedData();
      const currentPageRows = sortedData
        .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
        .filter((r: PreviewRow) => r.valid);

      const allSelected = currentPageRows.every((r: PreviewRow) => selectedRows.has(r.row));
      
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        currentPageRows.forEach((r: PreviewRow) => {
          if (allSelected) {
            newSet.delete(r.row);
          } else {
            newSet.add(r.row);
          }
        });
        return newSet;
      });
    }
  };

  const handleConfirmImport = () => {
    if (selectedRows.size === 0) {
      toast.error('Selecione pelo menos um registro para importar');
      return;
    }

    // Navigate back to admin with selected data
    if (isFinancialImport) {
      toast.info('Use a nova página de Importação Financeira');
      navigate('/importacao-financeira');
    } else {
      navigate('/admin', {
        state: {
          importData: previewData.filter((row: PreviewRow) => selectedRows.has(row.row)),
          startImport: true
        }
      });
    }
  };

  const handleCancel = () => {
    navigate('/admin');
  };

  const totalPages = Math.ceil(getSortedData().length / previewItemsPerPage);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Preview da Importação</h1>
              <p className="text-muted-foreground">
                Revise os dados antes de importar para o sistema
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Registros</CardDescription>
              <CardTitle className="text-3xl">{previewStats.totalRegistros || previewStats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Registros Válidos</CardDescription>
              <CardTitle className="text-3xl text-green-600">{previewStats.registrosValidos || previewStats.valid}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Registros Inválidos</CardDescription>
              <CardTitle className="text-3xl text-destructive">{previewStats.registrosInvalidos || previewStats.invalid}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{isFinancialImport ? 'Total de Parcelas' : 'Senhas Geradas'}</CardDescription>
              <CardTitle className="text-3xl text-primary">{previewStats.totalParcelas || previewStats.autogenPasswords || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Selection Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="text-lg font-medium">
                    {selectedRows.size} de {isFinancialImport 
                      ? previewData.filter((r: FinancialPreviewRow) => r.valido).length 
                      : previewData.filter((r: PreviewRow) => r.valid).length} registros selecionados
                  </span>
                </div>
                {selectedRows.size < (isFinancialImport 
                  ? previewData.filter((r: FinancialPreviewRow) => r.valido).length 
                  : previewData.filter((r: PreviewRow) => r.valid).length) && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      if (isFinancialImport) {
                        setSelectedRows(new Set(
                          previewData
                            .map((_: any, idx: number) => idx)
                            .filter((idx: number) => previewData[idx].valido)
                        ));
                      } else {
                        setSelectedRows(new Set(previewData.filter((r: PreviewRow) => r.valid).map((r: PreviewRow) => r.row)));
                      }
                    }}
                    className="h-auto p-0 text-primary"
                  >
                    Selecionar todos válidos
                  </Button>
                )}
                {selectedRows.size > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSelectedRows(new Set())}
                    className="h-auto p-0 text-muted-foreground"
                  >
                    Limpar seleção
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dados para Importação</CardTitle>
            <CardDescription>
              Selecione os registros que deseja importar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] rounded-md border">
              {isFinancialImport ? (
                // Financial Import Table
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            getSortedData()
                              .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                              .filter((r: FinancialPreviewRow) => r.valido)
                              .length > 0 &&
                            getSortedData()
                              .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                              .filter((r: FinancialPreviewRow) => r.valido)
                              .every((item: any) => {
                                const globalIdx = previewData.indexOf(item);
                                return selectedRows.has(globalIdx);
                              })
                          }
                          onCheckedChange={handleToggleAll}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('cliente')}
                      >
                        Cliente{renderSortIcon('cliente')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('quadraLote')}
                      >
                        Quadra/Lote{renderSortIcon('quadraLote')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('numeroParcelas')}
                      >
                        Nº Parcelas{renderSortIcon('numeroParcelas')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('parcelasValidas')}
                      >
                        Válidas{renderSortIcon('parcelasValidas')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('valorTotal')}
                      >
                        Valor Total{renderSortIcon('valorTotal')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('valorPago')}
                      >
                        Valor Pago{renderSortIcon('valorPago')}
                      </TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedData()
                      .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                      .map((row: FinancialPreviewRow, index: number) => {
                        const globalIdx = previewData.indexOf(row);
                        return (
                          <TableRow
                            key={index}
                            className={`${!row.valido ? 'bg-muted/50' : ''} ${selectedRows.has(globalIdx) ? 'bg-primary/5' : ''}`}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedRows.has(globalIdx)}
                                onCheckedChange={() => handleToggleRow(globalIdx)}
                                disabled={!row.valido}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{row.cliente}</TableCell>
                            <TableCell className="font-mono text-sm">{row.quadraLote}</TableCell>
                            <TableCell className="text-right">{row.numeroParcelas}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={row.parcelasValidas === row.numeroParcelas ? "default" : "secondary"}>
                                {row.parcelasValidas}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{row.valorTotal}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{row.valorPago}</TableCell>
                            <TableCell>
                              {row.valido ? (
                                <Badge variant="default" className="bg-green-600">Válido</Badge>
                              ) : (
                                <Badge variant="destructive">Inválido</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                // User Import Table
                <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          getSortedData()
                            .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                            .filter((r: PreviewRow) => r.valid)
                            .every((r: PreviewRow) => selectedRows.has(r.row)) &&
                          getSortedData()
                            .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                            .filter((r: PreviewRow) => r.valid).length > 0
                        }
                        onCheckedChange={handleToggleAll}
                      />
                    </TableHead>
                    <TableHead 
                      className="w-16 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('row')}
                    >
                      #{renderSortIcon('row')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('nome_completo')}
                    >
                      Nome{renderSortIcon('nome_completo')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('email')}
                    >
                      Email{renderSortIcon('email')}
                    </TableHead>
                    <TableHead className="w-24">Senha</TableHead>
                    <TableHead 
                      className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('quadra')}
                    >
                      Quadra{renderSortIcon('quadra')}
                    </TableHead>
                    <TableHead 
                      className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('lote')}
                    >
                      Lote{renderSortIcon('lote')}
                    </TableHead>
                    <TableHead 
                      className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('fase')}
                    >
                      Fase{renderSortIcon('fase')}
                    </TableHead>
                    <TableHead 
                      className="w-32 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('data_compra')}
                    >
                      Data Compra{renderSortIcon('data_compra')}
                    </TableHead>
                    <TableHead className="w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedData()
                    .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                    .map((row: PreviewRow, index: number) => (
                      <TableRow
                        key={index}
                        className={`${!row.valid ? 'bg-muted/50' : ''} ${selectedRows.has(row.row) ? 'bg-primary/5' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(row.row)}
                            onCheckedChange={() => handleToggleRow(row.row)}
                            disabled={!row.valid}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{row.row}</TableCell>
                        <TableCell className="font-medium">
                          {row.nome_completo || <span className="text-muted-foreground italic text-xs">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.email || <span className="text-muted-foreground italic text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          {row.password ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">••••••••</code>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.quadra || <span className="text-muted-foreground italic text-xs">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.lote || <span className="text-muted-foreground italic text-xs">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.fase || <span className="text-muted-foreground italic text-xs">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.data_compra || <span className="text-muted-foreground italic text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge variant="default" className="text-xs">Válido</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Incompleto</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              )}
            </ScrollArea>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {Math.min((previewPage - 1) * previewItemsPerPage + 1, getSortedData().length)} a {Math.min(previewPage * previewItemsPerPage, getSortedData().length)} de {getSortedData().length} registros
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                      disabled={previewPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                  </PaginationItem>

                  {/* First page */}
                  {previewPage > 2 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setPreviewPage(1)} isActive={false}>
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Ellipsis before */}
                  {previewPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Previous page */}
                  {previewPage > 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setPreviewPage(previewPage - 1)} isActive={false}>
                        {previewPage - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Current page */}
                  <PaginationItem>
                    <PaginationLink isActive={true}>
                      {previewPage}
                    </PaginationLink>
                  </PaginationItem>

                  {/* Next page */}
                  {previewPage < totalPages && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setPreviewPage(previewPage + 1)} isActive={false}>
                        {previewPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Ellipsis after */}
                  {previewPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Last page */}
                  {previewPage < totalPages - 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setPreviewPage(totalPages)}
                        isActive={false}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                      disabled={previewPage >= totalPages}
                      className="gap-1"
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedRows.size === 0 ? (
                  <span className="text-destructive font-medium">Selecione pelo menos um registro para importar</span>
                ) : (
                  <span>
                    <strong className="text-primary">{selectedRows.size}</strong> registro{selectedRows.size !== 1 ? 's' : ''} será{selectedRows.size !== 1 ? 'ão' : ''} importado{selectedRows.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={selectedRows.size === 0}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Iniciar Importação ({selectedRows.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
