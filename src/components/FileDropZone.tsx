import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFileDrop: (file: File) => void;
  accept: string;
  title: string;
  description: string;
  className?: string;
}

export function FileDropZone({
  onFileDrop,
  accept,
  title,
  description,
  className,
}: FileDropZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFileDrop(files[0]);
      }
    },
    [onFileDrop]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileDrop(files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary hover:bg-primary-light cursor-pointer",
        className
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        id={`file-input-${title}`}
      />
      <label htmlFor={`file-input-${title}`} className="cursor-pointer">
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </label>
    </div>
  );
}
