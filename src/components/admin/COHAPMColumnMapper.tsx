import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface COHAPMColumnMapperProps {
  previewData: any[];
  targetFields: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

export function COHAPMColumnMapper({ 
  previewData, 
  targetFields, 
  onMappingChange 
}: COHAPMColumnMapperProps) {
  const excelColumns = previewData.length > 0 ? Object.keys(previewData[0]) : [];
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  const handleMappingChange = (systemField: string, excelColumn: string) => {
    const newMapping = { ...mapping };
    
    if (excelColumn === 'none') {
      delete newMapping[excelColumn];
      // Remove any existing mapping to this system field
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === systemField) {
          delete newMapping[key];
        }
      });
    } else {
      newMapping[excelColumn] = systemField;
    }
    
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const getExcelColumnForField = (systemField: string): string => {
    const entry = Object.entries(mapping).find(([_, value]) => value === systemField);
    return entry ? entry[0] : 'none';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapeamento de Colunas</CardTitle>
        <CardDescription>
          Configure quais colunas da sua planilha correspondem aos campos do sistema.
          Campos marcados com <Badge variant="secondary" className="ml-1">Comprador</Badge>, 
          <Badge variant="secondary" className="ml-1">Contrato</Badge> ou 
          <Badge variant="secondary" className="ml-1">Parcela</Badge> indicam a categoria.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(targetFields).map(([fieldKey, fieldLabel]) => {
              const category = fieldKey.startsWith('comprador_') ? 'Comprador' 
                : fieldKey.startsWith('contrato_') ? 'Contrato' 
                : 'Parcela';
              
              const selectedColumn = getExcelColumnForField(fieldKey);

              return (
                <div key={fieldKey} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`map-${fieldKey}`} className="text-sm font-medium">
                      {fieldLabel}
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                  </div>
                  
                  <Select
                    value={selectedColumn}
                    onValueChange={(value) => handleMappingChange(fieldKey, value)}
                  >
                    <SelectTrigger id={`map-${fieldKey}`}>
                      <SelectValue placeholder="Selecione uma coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Não mapear</span>
                      </SelectItem>
                      {excelColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedColumn !== 'none' && previewData.length > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                      <p className="font-semibold text-muted-foreground">Preview:</p>
                      {previewData.slice(0, 2).map((row, idx) => (
                        <div key={idx} className="truncate">
                          <span className="text-muted-foreground">L{idx + 1}:</span>{' '}
                          <span className="font-mono">{row[selectedColumn] || '(vazio)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

import React from 'react';
