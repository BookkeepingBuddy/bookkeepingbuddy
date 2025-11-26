import { useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useFinanceStore, DataFile } from '@/store/useFinanceStore';
import { Button } from '@/components/ui/button';
import { Upload, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { DataFileCard } from '@/components/DataFileCard';

const initialColumnMapping = {
  dateIndex: null,
  dateFormat: 'YYYY-MM-DD',
  amountIndex: null,
  decimalSeparator: '.' as const,
  descriptionIndices: [],
  columnNames: [],
  hasHeaders: false,
};

interface Step1ImportProps {
  onNext: () => void;
}

export function Step1Import({ onNext }: Step1ImportProps) {
  const { dataFiles, addDataFile, removeDataFile } = useFinanceStore();

  const detectHeaders = (rows: any[][]): boolean => {
    if (rows.length < 2) return false;
    const firstRow = rows[0];
    const secondRow = rows[1];
    
    // Check if first row has mostly strings and second row has numbers
    const firstRowStrings = firstRow.filter((cell) => typeof cell === 'string' && isNaN(Number(cell)));
    const secondRowNumbers = secondRow.filter((cell) => !isNaN(Number(cell)));
    
    return firstRowStrings.length > firstRow.length / 2 && secondRowNumbers.length > 0;
  };

  const handleDataFile = useCallback(async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      let parsedRows: any[][] = [];
      let rawContent = '';

      if (extension === 'csv' || extension === 'txt' || extension === 'tab') {
        const text = await file.text();
        rawContent = text;
        
        const result = Papa.parse(text);
        parsedRows = result.data as any[][];
      } else if (extension === 'xls' || extension === 'xlsx') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        rawContent = XLSX.utils.sheet_to_csv(firstSheet);
      } else {
        toast.error('Unsupported file format');
        return;
      }

      // Detect headers
      const hasHeaders = detectHeaders(parsedRows);
      const columnNames = hasHeaders
        ? parsedRows[0].map((cell, idx) => String(cell || `col${idx}`))
        : parsedRows[0]?.map((_, idx) => `col${idx}`) || [];

      const newDataFile: DataFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        rawContent,
        parsedRows,
        columnMapping: {
          ...initialColumnMapping,
          columnNames,
          hasHeaders,
        },
      };

      addDataFile(newDataFile);
      toast.success(`File "${file.name}" loaded successfully`);
    } catch (error) {
      toast.error('Failed to read file');
      console.error(error);
    }
  }, [addDataFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => handleDataFile(file));
    },
    [handleDataFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => handleDataFile(file));
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors hover:border-primary hover:bg-primary-light cursor-pointer"
      >
        <input
          type="file"
          accept=".csv,.txt,.tab,.xls,.xlsx"
          onChange={handleFileInput}
          className="hidden"
          id="file-input-data"
          multiple
        />
        <label htmlFor="file-input-data" className="cursor-pointer">
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Drop Data Files</h3>
          <p className="text-xs text-muted-foreground">CSV, TXT, TAB, or Excel files (multiple allowed)</p>
        </label>
      </div>

      {/* Data File Cards */}
      {dataFiles.length > 0 && (
        <div className="space-y-4">
          {dataFiles.map((dataFile) => (
            <DataFileCard
              key={dataFile.id}
              dataFile={dataFile}
              onRemove={() => removeDataFile(dataFile.id)}
            />
          ))}
        </div>
      )}

      {dataFiles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No data files loaded yet. Drop or select files to begin.</p>
        </div>
      )}

      {/* Next Button */}
      {dataFiles.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={onNext} size="lg">
            Next: Configure Rules
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
