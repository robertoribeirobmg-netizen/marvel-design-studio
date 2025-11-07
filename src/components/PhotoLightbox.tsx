import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Photo {
  id: string;
  foto_url: string;
  titulo: string;
  descricao?: string;
  categoria: 'fundacao' | 'estrutura' | 'acabamento';
  data_upload: string;
}

interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function PhotoLightbox({ photos, currentIndex, isOpen, onClose, onNavigate }: PhotoLightboxProps) {
  if (!photos.length) return null;

  const currentPhoto = photos[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(currentIndex + 1);
    }
  };

  const getCategoryLabel = (categoria: string) => {
    switch (categoria) {
      case 'fundacao': return 'Fundação';
      case 'estrutura': return 'Estrutura';
      case 'acabamento': return 'Acabamento';
      default: return categoria;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 overflow-hidden">
        <div className="relative w-full h-full flex flex-col bg-background">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Navigation Buttons */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 pt-16">
            <img
              src={currentPhoto.foto_url}
              alt={currentPhoto.titulo}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Info Bar */}
          <div className="border-t border-border bg-background/95 backdrop-blur-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{currentPhoto.titulo}</h3>
                  <Badge variant="secondary">
                    {getCategoryLabel(currentPhoto.categoria)}
                  </Badge>
                </div>
                {currentPhoto.descricao && (
                  <p className="text-sm text-muted-foreground">{currentPhoto.descricao}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(currentPhoto.data_upload).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {currentIndex + 1} / {photos.length}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
