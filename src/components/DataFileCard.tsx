import { useState, useCallback } from 'react';
import { Trash2, Upload } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DataFile } from '@/store/useFinanceStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { toast } from 'sonner';

const DATE_FORMATS = [
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
  'YYYYMMDD',
  'DDMMYYYY',
  'MMDDYYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
];

interface DataFileCardProps {
  dataFile: DataFile;
  onRemove: () => void;
}

export function DataFileCard({ dataFile, onRemove }: DataFileCardProps) {
  const { updateDataFileName, updateDataFileMapping } = useFinanceStore();
  const [previewRow, setPreviewRow] = useState<any[] | null>(
    dataFile.parsedRows.length > 0 ? dataFile.parsedRows[0] : null
  );

  const handleReplaceFile = useCallback(async (file: File) => {
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

      // Update the dataFile with new data but keep column mapping and settings
      const updatedFile: DataFile = {
        ...dataFile,
        rawContent,
        parsedRows,
        filename: file.name, // Update original filename
      };

      // Use the store's internal setState to update the file
      useFinanceStore.setState((state) => ({
        dataFiles: state.dataFiles.map((f) =>
          f.id === dataFile.id ? updatedFile : f
        ),
      }));

      // Save to localStorage
      useFinanceStore.getState().saveToLocalStorage();

      setPreviewRow(parsedRows.length > 0 ? parsedRows[0] : null);
      toast.success(`Data replaced for "${dataFile.name}"`);
    } catch (error) {
      toast.error('Failed to replace file');
      console.error(error);
    }
  }, [dataFile]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleReplaceFile(files[0]);
      }
    },
    [handleReplaceFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleReplaceFile(files[0]);
    }
  };

  const handleDescriptionToggle = (index: number, checked: boolean) => {
    const current = dataFile.columnMapping.descriptionIndices;
    const updated = checked
      ? [...current, index].sort((a, b) => a - b)
      : current.filter((i) => i !== index);
    updateDataFileMapping(dataFile.id, { descriptionIndices: updated });
  };

  const getJsonPreview = () => {
    if (!previewRow) return {};

    const json: Record<string, any> = {};
    const { columnMapping } = dataFile;

    previewRow.forEach((cell, idx) => {
      const colName = columnMapping.columnNames[idx] || `col${idx}`;
      json[colName] = cell;
    });

    // Add parsed fields
    if (columnMapping.dateIndex !== null && previewRow[columnMapping.dateIndex]) {
      const dateStr = String(previewRow[columnMapping.dateIndex]);
      json.date = new Date(dateStr);
    }
    if (columnMapping.amountIndex !== null && previewRow[columnMapping.amountIndex]) {
      let amountStr = String(previewRow[columnMapping.amountIndex] || '0');
      if (columnMapping.decimalSeparator === ',') {
        amountStr = amountStr.replace(',', '.');
      }
      json.amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
    }
    if (columnMapping.descriptionIndices.length > 0) {
      json.description = columnMapping.descriptionIndices
        .map((idx) => previewRow[idx])
        .join(' ');
    }
    
    // Add filename
    json.filename = dataFile.name;

    return json;
  };

  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 max-w-md">
          <Label className="text-xs mb-1">File Name</Label>
          <Input
            value={dataFile.name}
            onChange={(e) => updateDataFileName(dataFile.id, e.target.value)}
            className="h-8"
            placeholder="Enter file name"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {dataFile.parsedRows.length} rows • Use <code className="bg-muted px-1 rounded">row.filename === '{dataFile.name}'</code> in rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-border rounded-lg px-3 py-2 transition-colors hover:border-primary hover:bg-muted/50 cursor-pointer"
          >
            <input
              type="file"
              accept=".csv,.txt,.tab,.xls,.xlsx"
              onChange={handleFileInput}
              className="hidden"
              id={`file-replace-${dataFile.id}`}
            />
            <label htmlFor={`file-replace-${dataFile.id}`} className="cursor-pointer flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Replace data</span>
            </label>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive h-8 w-8">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Data File</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{dataFile.name}"? This will remove all data and column mappings. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Column Mapping */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Column Mapping</h4>

          {/* Date */}
          <div>
            <Label className="text-xs">Date Column</Label>
            <Select
              value={dataFile.columnMapping.dateIndex?.toString() || ''}
              onValueChange={(val) => updateDataFileMapping(dataFile.id, { dateIndex: parseInt(val) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {previewRow?.map((cell, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    [{dataFile.columnMapping.columnNames[idx] || `Index ${idx}`}] {String(cell).substring(0, 30)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Date Format</Label>
            <Select
              value={dataFile.columnMapping.dateFormat}
              onValueChange={(val) => updateDataFileMapping(dataFile.id, { dateFormat: val })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((fmt) => (
                  <SelectItem key={fmt} value={fmt}>
                    {fmt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-xs">Amount Column</Label>
            <Select
              value={dataFile.columnMapping.amountIndex?.toString() || ''}
              onValueChange={(val) => updateDataFileMapping(dataFile.id, { amountIndex: parseInt(val) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {previewRow?.map((cell, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    [{dataFile.columnMapping.columnNames[idx] || `Index ${idx}`}] {String(cell).substring(0, 30)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Decimal Separator</Label>
            <Select
              value={dataFile.columnMapping.decimalSeparator}
              onValueChange={(val: '.' | ',') => updateDataFileMapping(dataFile.id, { decimalSeparator: val })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=".">Dot (.)</SelectItem>
                <SelectItem value=",">Comma (,)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs">Description Columns (Multiple)</Label>
            <div className="space-y-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
              {previewRow?.map((cell, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox
                    id={`desc-${dataFile.id}-${idx}`}
                    checked={dataFile.columnMapping.descriptionIndices.includes(idx)}
                    onCheckedChange={(checked) => handleDescriptionToggle(idx, checked as boolean)}
                  />
                  <label htmlFor={`desc-${dataFile.id}-${idx}`} className="text-xs cursor-pointer">
                    [{dataFile.columnMapping.columnNames[idx] || `Index ${idx}`}] {String(cell).substring(0, 30)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Click "Next" to apply mapping and rules
          </p>
        </div>

        {/* Right - Previews */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Raw Preview (First 2 Lines)</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto h-24">
              {dataFile.rawContent.split('\n').slice(0, 2).join('\n')}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">JSON Preview (First Row)</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-48">
              {JSON.stringify(getJsonPreview(), null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              These property names are available in your JavaScript rules.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
