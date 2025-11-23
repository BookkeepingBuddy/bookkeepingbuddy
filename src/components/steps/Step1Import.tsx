import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FileDropZone } from '../FileDropZone';
import { useFinanceStore, Transaction } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const DATE_FORMATS = [
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
  'YYYYMMDD',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
];

interface Step1ImportProps {
  onNext: () => void;
}

export function Step1Import({ onNext }: Step1ImportProps) {
  const {
    rawFileContent,
    parsedRows,
    columnMapping,
    setRawFileContent,
    setParsedRows,
    setColumnMapping,
    applyRules,
    importConfig,
    loadParsedRows,
  } = useFinanceStore();

  const [previewRow, setPreviewRow] = useState<any[] | null>(null);

  // Load parsed rows from localStorage on mount
  useEffect(() => {
    if (parsedRows.length === 0) {
      const loaded = loadParsedRows();
      if (loaded) {
        toast.success('Restored data from previous session');
      }
    }
  }, []);

  useEffect(() => {
    if (parsedRows.length > 1) {
      setPreviewRow(parsedRows[1]);
    }
  }, [parsedRows]);

  const detectHeaders = (rows: any[][]) => {
    if (rows.length === 0) return false;
    const firstRow = rows[0];
    return firstRow.every((cell: any) => typeof cell === 'string' && isNaN(Number(cell)));
  };

  const handleDataFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'csv' || extension === 'txt' || extension === 'tab') {
        const text = await file.text();
        setRawFileContent(text);

        Papa.parse(text, {
          complete: (result) => {
            const rows = result.data as any[][];

            const hasHeaders = detectHeaders(rows);
            setParsedRows(rows);
            const columnNames = hasHeaders
              ? rows[0].map((cell: any) => String(cell))
              : [];

            setColumnMapping({ columnNames, hasHeaders });
            toast.success('File parsed successfully');
          },
          error: (error) => {
            toast.error('Failed to parse CSV: ' + error.message);
          },
        });
      } else if (extension === 'xls' || extension === 'xlsx') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        const text = XLSX.utils.sheet_to_csv(firstSheet);
        setRawFileContent(text);
        setParsedRows(jsonData);

        const hasHeaders = detectHeaders(jsonData);
        const columnNames = hasHeaders
          ? jsonData[0].map((cell: any) => String(cell))
          : [];

        setColumnMapping({ columnNames, hasHeaders });
        toast.success('Excel file parsed successfully');
      } else {
        toast.error('Unsupported file format');
      }
    } catch (error) {
      toast.error('Failed to read file');
      console.error(error);
    }
  };

  const handleConfigFile = async (file: File) => {
    try {
      const text = await file.text();
      importConfig(text);
      toast.success('Configuration loaded');
    } catch (error) {
      toast.error('Invalid config file');
    }
  };

  const handleDescriptionToggle = (index: number, checked: boolean) => {
    const current = columnMapping.descriptionIndices;
    const updated = checked
      ? [...current, index].sort((a, b) => a - b)
      : current.filter((i) => i !== index);
    setColumnMapping({ descriptionIndices: updated });
  };

  const getJsonPreview = () => {
    if (!previewRow) return {};

    const rawData: Record<string, any> = {};

    previewRow.forEach((cell, idx) => {
      const colName = columnMapping.columnNames[idx] || `col${idx}`;
      rawData[colName] = cell;
    });

    const parseDate = (dateStr: string, format: string): Date => {
      const str = String(dateStr).trim();
      let year = 0, month = 0, day = 0;

      if (format === 'YYYY-MM-DD') {
        [year, month, day] = str.split('-').map(Number);
      } else if (format === 'DD-MM-YYYY') {
        [day, month, year] = str.split('-').map(Number);
      } else if (format === 'MM-DD-YYYY') {
        [month, day, year] = str.split('-').map(Number);
      } else if (format === 'YYYYMMDD') {
        year = Number(str.substring(0, 4));
        month = Number(str.substring(4, 6));
        day = Number(str.substring(6, 8));
      } else if (format === 'DD/MM/YYYY') {
        [day, month, year] = str.split('/').map(Number);
      } else if (format === 'MM/DD/YYYY') {
        [month, day, year] = str.split('/').map(Number);
      }

      return new Date(year, month - 1, day);
    };

    let date = new Date()
    let dateString = ''
    let year, month, day
    // Add parsed fields
    if (columnMapping.dateIndex !== null && previewRow[columnMapping.dateIndex]) {
      const dateStr = String(previewRow[columnMapping.dateIndex]);
      try {
        const parsedDate = parseDate(dateStr, columnMapping.dateFormat);
        if (parsedDate) {
          date = parsedDate;
          year = date.getFullYear();
          month = String(date.getMonth() + 1).padStart(2, '0');
          day = String(date.getDate()).padStart(2, '0');
          dateString = `${year}-${month}-${day}`;
        } else {
          dateString = `Invalid Date ${dateStr}`;
        }
      } catch {
        dateString = `[Invalid date: "${dateStr}"]`;
      }
    }
    let amount: number = 0
    if (columnMapping.amountIndex !== null && previewRow[columnMapping.amountIndex]) {
      let amountStr = String(previewRow[columnMapping.amountIndex]);
      if (columnMapping.decimalSeparator === ',') {
        amountStr = amountStr.replace(',', '.');
      }
      amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
    }
    let description = ''
    if (columnMapping.descriptionIndices.length > 0) {
      description = columnMapping.descriptionIndices
        .map((idx) => previewRow[idx])
        .join(' ');
    }

    const transaction: Transaction = {
      date,
      dateString,
      year,
      month,
      day,
      amount,
      description,
      rawData,
    };

    return transaction;
  };

  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full">
        {/* Left Panel - Controls */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-4">
              <FileDropZone
                onFileDrop={handleDataFile}
                accept=".csv,.txt,.tab,.xls,.xlsx"
                title="Drop Data File"
                description="CSV, TXT, TAB, XLS, XLSX"
                className="p-4"
              />
            </Card>
            <Card className="p-4">
              <FileDropZone
                onFileDrop={handleConfigFile}
                accept=".json"
                title="Drop Config File"
                description="Restore settings"
                className="p-4"
              />
            </Card>
          </div>

          {parsedRows.length > 0 && (
            <Card className="p-2">
              <h3 className="text-lg font-semibold mb-2">Column Mapping</h3>
              <div className="space-y-2">
                {/* Date */}
                <div>
                  <Label>Date Column</Label>
                  <Select
                    value={columnMapping.dateIndex?.toString() || ''}
                    onValueChange={(val) => setColumnMapping({ dateIndex: parseInt(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewRow?.map((cell, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {columnMapping.columnNames[idx] || `Column ${idx}`}: {String(cell).substring(0, 30)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Format</Label>
                  <Select
                    value={columnMapping.dateFormat}
                    onValueChange={(val) => setColumnMapping({ dateFormat: val })}
                  >
                    <SelectTrigger>
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
                  <Label>Amount Column</Label>
                  <Select
                    value={columnMapping.amountIndex?.toString() || ''}
                    onValueChange={(val) => setColumnMapping({ amountIndex: parseInt(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewRow?.map((cell, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {columnMapping.columnNames[idx] || `Column ${idx}`}: {String(cell).substring(0, 30)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Decimal Separator</Label>
                  <Select
                    value={columnMapping.decimalSeparator}
                    onValueChange={(val: '.' | ',') => setColumnMapping({ decimalSeparator: val })}
                  >
                    <SelectTrigger>
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
                  <Label>Description Columns (Multiple)</Label>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {previewRow?.map((cell, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Checkbox
                          id={`desc-${idx}`}
                          checked={columnMapping.descriptionIndices.includes(idx)}
                          onCheckedChange={(checked) => handleDescriptionToggle(idx, checked as boolean)}
                        />
                        <label htmlFor={`desc-${idx}`} className="text-sm cursor-pointer">
                          {columnMapping.columnNames[idx] || `Column ${idx}`}: {String(cell).substring(0, 40)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="space-y-2 flex flex-col">
          {rawFileContent && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Raw Preview (First 2 Lines)</h3>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                {rawFileContent.split('\n').slice(0, 2).join('\n')}
              </pre>
            </Card>
          )}

          {previewRow && (
            <Card className="p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-semibold mb-4">JSON Preview (First Row)</h3>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto flex-1">
                {JSON.stringify(getJsonPreview(), null, 2)}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                These property names are available in your JavaScript rules. Date is a Date object, amount is a number.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
