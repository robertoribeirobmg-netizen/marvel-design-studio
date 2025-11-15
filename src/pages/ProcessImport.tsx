import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processFinancialFile, DetailedImportResults } from '@/lib/processFinancialImport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ProcessImport() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [results, setResults] = useState<DetailedImportResults | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para a nova página de importação
    navigate('/importacao-financeira');
  }, [navigate]);

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Redirecionando...</CardTitle>
          <CardDescription>
            Você está sendo redirecionado para a nova página de importação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
