import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ColumnMappingSelectorProps {
  excelHeaders: string[];
  excelData: any[][];
  columnMapping: { [key: string]: number | null };
  onMappingChange: (field: string, columnIndex: number | null) => void;
}

const fieldLabels: { [key: string]: { label: string; required: boolean; description: string } } = {
  tipo_usuario: { label: 'Tipo de Usuário', required: true, description: 'Tipo do usuário (cooperado, admin, admin_obras, executivo_vendas)' },
  nome_completo: { label: 'Nome Completo', required: true, description: 'Nome completo do cooperado' },
  email: { label: 'Email', required: true, description: 'Endereço de email' },
  cpf: { label: 'CPF', required: true, description: 'Documento CPF (11 dígitos)' },
  telefone: { label: 'Telefone', required: false, description: 'Número de telefone/celular' },
  quadra: { label: 'Quadra', required: false, description: 'Identificação da quadra' },
  lote: { label: 'Lote', required: false, description: 'Número do lote' },
  fase: { label: 'Fase', required: false, description: 'Fase do empreendimento' },
  data_compra: { label: 'Data de Compra', required: false, description: 'Data da compra (YYYY-MM-DD)' },
};

export default function ColumnMappingSelector({ 
  excelHeaders, 
  excelData,
  columnMapping, 
  onMappingChange 
}: ColumnMappingSelectorProps) {
  
  // Pegar amostra de dados (primeiras 3 linhas)
  const sampleData = excelData.slice(1, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapeamento de Colunas</CardTitle>
        <CardDescription>
          Configure quais colunas do seu Excel correspondem a cada campo. 
          Os campos com <Badge variant="destructive" className="ml-2">obrigatório</Badge> precisam ser mapeados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(fieldLabels).map(([fieldKey, fieldInfo]) => (
            <div key={fieldKey} className="space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor={`mapping-${fieldKey}`} className="font-semibold">
                  {fieldInfo.label}
                </Label>
                {fieldInfo.required && (
                  <Badge variant="destructive" className="text-xs">
                    obrigatório
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{fieldInfo.description}</p>
              
              <Select
                value={columnMapping[fieldKey]?.toString() ?? 'none'}
                onValueChange={(value) => 
                  onMappingChange(fieldKey, value === 'none' ? null : parseInt(value))
                }
              >
                <SelectTrigger id={`mapping-${fieldKey}`}>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Não mapear</span>
                  </SelectItem>
                  {excelHeaders.map((header, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {header || `Coluna ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Mostrar preview dos dados mapeados */}
              {columnMapping[fieldKey] !== null && (
                <div className="mt-2 p-3 bg-muted rounded-md space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Preview dos dados:
                  </p>
                  {sampleData.map((row, rowIndex) => (
                    <div key={rowIndex} className="text-sm truncate">
                      <span className="text-muted-foreground">Linha {rowIndex + 2}:</span>{' '}
                      <span className="font-mono">
                        {row[columnMapping[fieldKey]!] || '(vazio)'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
