import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Rule {
  id: string;
  category: string;
  subcategory: string;
  jsCode: string;
  isValid: boolean;
  error?: string;
}

export interface ColumnMapping {
  dateIndex: number | null;
  dateFormat: string;
  amountIndex: number | null;
  decimalSeparator: '.' | ',';
  descriptionIndices: number[];
  columnNames: string[];
  hasHeaders: boolean;
}

export interface DataFile {
  id: string;
  name: string;
  rawContent: string;
  parsedRows: any[][];
  columnMapping: ColumnMapping;
}

export interface Transaction {
  date: Date;
  dateString: string;
  year: number;
  month: number;
  day: number;
  amount: number;
  description: string;
  category?: string;
  subcategory?: string;
  rawData: Record<string, any>;
}

interface FinanceStore {
  // Data
  dataFiles: DataFile[];
  transactions: Transaction[];

  // Rules
  rules: Rule[];

  // Analysis
  selectedMonth: string | null;
  hoveredMonth: string | null;

  // Actions
  addDataFile: (file: DataFile) => void;
  removeDataFile: (id: string) => void;
  updateDataFileName: (id: string, name: string) => void;
  updateDataFileMapping: (id: string, mapping: Partial<ColumnMapping>) => void;
  addRule: () => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  reorderRules: (newOrder: Rule[]) => void;
  applyRules: () => { dateParseErrors: number };
  setSelectedMonth: (month: string | null) => void;
  setHoveredMonth: (month: string | null) => void;
  exportConfig: () => string;
  importConfig: (fileId: string, configJson: string) => void;
  reset: () => void;
}

const initialColumnMapping: ColumnMapping = {
  dateIndex: null,
  dateFormat: 'YYYY-MM-DD',
  amountIndex: null,
  decimalSeparator: '.',
  descriptionIndices: [],
  columnNames: [],
  hasHeaders: false,
};

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      dataFiles: [],
      transactions: [],
      rules: [],
      selectedMonth: null,
      hoveredMonth: null,

      addDataFile: (file) => {
        set((state) => ({
          dataFiles: [...state.dataFiles, file],
        }));
      },

      removeDataFile: (id) => {
        set((state) => ({
          dataFiles: state.dataFiles.filter((f) => f.id !== id),
        }));
      },

      updateDataFileName: (id, name) => {
        set((state) => ({
          dataFiles: state.dataFiles.map((file) =>
            file.id === id ? { ...file, name } : file
          ),
        }));
      },

      updateDataFileMapping: (id, mapping) => {
        set((state) => ({
          dataFiles: state.dataFiles.map((file) =>
            file.id === id
              ? { ...file, columnMapping: { ...file.columnMapping, ...mapping } }
              : file
          ),
        }));
      },

      addRule: () => {
        const newRule: Rule = {
          id: `rule-${Date.now()}`,
          category: '',
          subcategory: '',
          jsCode: 'let matches = [\n"coolblue",\n]\nreturn matches.some(w => row.description.includes(w));',
          isValid: true,
        };
        set((state) => ({ rules: [...state.rules, newRule] }));
      },

      updateRule: (id, updates) =>
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === id ? { ...rule, ...updates } : rule
          ),
        })),

      deleteRule: (id) =>
        set((state) => ({
          rules: state.rules.filter((rule) => rule.id !== id),
        })),

      reorderRules: (newOrder) => set({ rules: newOrder }),

      applyRules: () => {
        const { dataFiles, rules } = get();
        let dateParseErrors = 0;
        const allTransactions: Transaction[] = [];

        // Process each data file
        dataFiles.forEach((dataFile) => {
          const { parsedRows, columnMapping } = dataFile;
          const startRow = columnMapping.hasHeaders ? 1 : 0;
          const dataRows = parsedRows.slice(startRow);

          const parseDate = (dateStr: string, format: string): Date | null => {
          const str = String(dateStr).trim();
          if (!str) return null;

          let year = 0, month = 0, day = 0;

          try {
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
            } else if (format === 'DDMMYYYY') {
              year = Number(str.substring(4, 8));
              month = Number(str.substring(2, 4));
              day = Number(str.substring(0, 2));
            } else if (format === 'MMDDYYYY') {
              year = Number(str.substring(4, 8));
              month = Number(str.substring(0, 2));
              day = Number(str.substring(2, 4));
            } else if (format === 'DD/MM/YYYY') {
              [day, month, year] = str.split('/').map(Number);
            } else if (format === 'MM/DD/YYYY') {
              [month, day, year] = str.split('/').map(Number);
            }

            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime()) || year < 1900 || year > 2100) {
              return null;
            }
            return date;
          } catch {
            return null;
            }
          };

          const fileTransactions: Transaction[] = dataRows
            .filter((row) => row[columnMapping.amountIndex!] !== undefined)
            .map((row) => {
          const rawData: Record<string, any> = {};
          row.forEach((cell, idx) => {
            const colName = columnMapping.columnNames[idx] || `col${idx}`;
            rawData[colName] = cell;
          });
          
          // Add filename for use in rules
          rawData.filename = dataFile.name;

          // Parse date
          let date = new Date();
          let dateString = '';
          let year = 0;
          let month = 0;
          let day = 0;
          if (columnMapping.dateIndex !== null) {
            const dateValue = String(row[columnMapping.dateIndex] || '');
            const parsedDate = parseDate(dateValue, columnMapping.dateFormat);
            if (parsedDate) {
              date = parsedDate;
              year = date.getFullYear();
              month = date.getMonth() + 1;
              day = date.getDate();
              dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            } else {
              dateParseErrors++;
              dateString = 'Invalid Date';
            }
            rawData.date = date;
          }

          // Parse amount
          let amount = 0;
          if (columnMapping.amountIndex !== null) {
            let amountStr = String(row[columnMapping.amountIndex] || '0');
            if (columnMapping.decimalSeparator === ',') {
              amountStr = amountStr.replace(',', '.');
            }
            amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
            rawData.amount = amount;
          }

          // Parse description
          const description = columnMapping.descriptionIndices
            .map((idx) => String(row[idx] || ''))
            .join(' ')
            .trim();
          rawData.description = description;

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

          // Apply rules (first match wins)
          for (const rule of rules) {
            if (rule.isValid && rule.jsCode) {
              try {
                const fn = new Function('row', rule.jsCode);
                const matches = fn(transaction);
                if (matches) {
                  transaction.category = rule.category;
                  transaction.subcategory = rule.subcategory;
                  break;
                }
              } catch (err) {
                // Skip invalid rules
              }
            }
          }

              return transaction;
            });

          allTransactions.push(...fileTransactions);
        });

        set({ transactions: allTransactions });
        return { dateParseErrors };
      },

      setSelectedMonth: (month) => set({ selectedMonth: month }),
      setHoveredMonth: (month) => set({ hoveredMonth: month }),

      exportConfig: () => {
        const { dataFiles, rules } = get();
        return JSON.stringify({ dataFiles, rules }, null, 2);
      },

      importConfig: (fileId, configJson) => {
        try {
          const config = JSON.parse(configJson);
          if (config.columnMapping) {
            // Apply to specific file
            set((state) => ({
              dataFiles: state.dataFiles.map((file) =>
                file.id === fileId
                  ? { ...file, columnMapping: config.columnMapping }
                  : file
              ),
            }));
          }
          if (config.rules) {
            set({ rules: config.rules });
          }
        } catch (err) {
          console.error('Invalid config JSON:', err);
        }
      },

      reset: () => {
        set({
          dataFiles: [],
          transactions: [],
          rules: [],
          selectedMonth: null,
          hoveredMonth: null,
        });
      },
    }),
    {
      name: 'finance-tool-storage',
      partialize: (state) => ({
        dataFiles: state.dataFiles,
        rules: state.rules,
      }),
    }
  )
);
