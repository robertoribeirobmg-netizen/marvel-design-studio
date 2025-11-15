import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ProcessImport() {
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
