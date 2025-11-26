import { useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { updateDataFileName, updateDataFileMapping, applyRules, importConfig } = useFinanceStore();
  const [previewRow, setPreviewRow] = useState<any[] | null>(
    dataFile.parsedRows.length > 0 ? dataFile.parsedRows[0] : null
  );

  const handleDescriptionToggle = (index: number, checked: boolean) => {
    const current = dataFile.columnMapping.descriptionIndices;
    const updated = checked
      ? [...current, index].sort((a, b) => a - b)
      : current.filter((i) => i !== index);
    updateDataFileMapping(dataFile.id, { descriptionIndices: updated });
  };

  const handleConfigFile = async (file: File) => {
    try {
      const text = await file.text();
      importConfig(dataFile.id, text);
      toast.success('Configuration loaded for ' + dataFile.name);
    } catch (error) {
      toast.error('Invalid config file');
    }
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
            {dataFile.parsedRows.length} rows • Available as <code className="bg-muted px-1 rounded">row.filename</code> in rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleConfigFile(file);
            }}
            className="hidden"
            id={`config-input-${dataFile.id}`}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.getElementById(`config-input-${dataFile.id}`)?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            Load Config
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} className="text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
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

          <Button onClick={applyRules} size="sm" className="w-full">
            Apply Mapping
          </Button>
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
