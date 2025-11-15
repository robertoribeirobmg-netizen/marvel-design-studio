import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, Table2 } from 'lucide-react';

export default function ContratoCohapmHelp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Estrutura do Banco de Dados - Contratos COHAPM
        </CardTitle>
        <CardDescription>
          Campos disponíveis na tabela contratos_cohapm
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Table2 className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-3">Estrutura dos Campos:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="destructive" className="mt-0.5">obrigatório</Badge>
                <div>
                  <strong>comprador_id</strong> (text): ID do comprador na tabela compradores_cohapm (UUID formato: 123e4567-e89b-12d3-a456-426614174000)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>numero_contrato</strong> (text): Número/código do contrato (max 100 caracteres)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>data_contrato</strong> (date): Data do contrato no formato YYYY-MM-DD
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>quadra</strong> (text): Identificação da quadra (max 20 caracteres)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>lote</strong> (text): Número do lote (max 20 caracteres)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>area_m2</strong> (numeric): Área em metros quadrados (ex: 250.50)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>valor_total</strong> (numeric): Valor total do contrato (ex: 150000.00)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>valor_entrada</strong> (numeric): Valor da entrada (ex: 30000.00)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>numero_parcelas</strong> (integer): Quantidade de parcelas (número inteiro)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>valor_parcela</strong> (numeric): Valor de cada parcela (ex: 1000.00)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>situacao</strong> (text): Situação do contrato (ex: Regular, Irregular) - max 50 caracteres
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>status</strong> (text): Status do contrato (ex: Ativo, Cancelado) - max 50 caracteres
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>corretor</strong> (text): Nome do corretor (max 200 caracteres)
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">opcional</Badge>
                <div>
                  <strong>imobiliaria</strong> (text): Nome da imobiliária (max 200 caracteres)
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertDescription>
            <p className="text-sm">
              <strong>Importante:</strong> Os campos <code>created_at</code> e <code>updated_at</code> são preenchidos automaticamente pelo sistema.
              O campo <code>id</code> é gerado automaticamente (auto-increment).
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
