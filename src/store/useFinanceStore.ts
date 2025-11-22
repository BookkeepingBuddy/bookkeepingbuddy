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

export interface Transaction {
  date: Date;
  dateString: string;
  amount: number;
  description: string;
  category?: string;
  subcategory?: string;
  rawData: Record<string, any>;
}

interface FinanceStore {
  // Data
  rawFileContent: string | null;
  parsedRows: any[][];
  transactions: Transaction[];

  // Mapping
  columnMapping: ColumnMapping;

  // Rules
  rules: Rule[];

  // Analysis
  selectedMonth: string | null;
  hoveredMonth: string | null;

  // Actions
  setRawFileContent: (content: string) => void;
  setParsedRows: (rows: any[][]) => void;
  setColumnMapping: (mapping: Partial<ColumnMapping>) => void;
  addRule: () => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  reorderRules: (newOrder: Rule[]) => void;
  applyRules: () => void;
  setSelectedMonth: (month: string | null) => void;
  setHoveredMonth: (month: string | null) => void;
  exportConfig: () => string;
  importConfig: (configJson: string) => void;
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
      rawFileContent: null,
      parsedRows: [],
      transactions: [],
      columnMapping: initialColumnMapping,
      rules: [],
      selectedMonth: null,
      hoveredMonth: null,

      setRawFileContent: (content) => set({ rawFileContent: content }),

      setParsedRows: (rows) => set({ parsedRows: rows }),

      setColumnMapping: (mapping) =>
        set((state) => ({
          columnMapping: { ...state.columnMapping, ...mapping },
        })),

      addRule: () => {
        const newRule: Rule = {
          id: `rule-${Date.now()}`,
          category: '',
          subcategory: '',
          jsCode: 'return false;',
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
        const { parsedRows, columnMapping, rules } = get();

        const startRow = columnMapping.hasHeaders ? 1 : 0;
        const dataRows = parsedRows.slice(startRow);

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

        const transactions: Transaction[] = dataRows.filter((row) => row[columnMapping.amountIndex] !== undefined).map((row) => {
          const rawData: Record<string, any> = {};
          row.forEach((cell, idx) => {
            const colName = columnMapping.columnNames[idx] || `col${idx}`;
            rawData[colName] = cell;
            rawData[`col${idx}`] = cell;
          });

          // Parse date
          let date = new Date();
          let dateString = '';
          if (columnMapping.dateIndex !== null) {
            const dateValue = String(row[columnMapping.dateIndex] || '');
            date = parseDate(dateValue, columnMapping.dateFormat);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateString = `${year}-${month}-${day}`;
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

        set({ transactions });
      },

      setSelectedMonth: (month) => set({ selectedMonth: month }),
      setHoveredMonth: (month) => set({ hoveredMonth: month }),

      exportConfig: () => {
        const { columnMapping, rules } = get();
        return JSON.stringify({ columnMapping, rules }, null, 2);
      },

      importConfig: (configJson) => {
        try {
          const config = JSON.parse(configJson);
          set({
            columnMapping: config.columnMapping || initialColumnMapping,
            rules: config.rules || [],
          });
        } catch (err) {
          console.error('Invalid config JSON:', err);
        }
      },

      reset: () =>
        set({
          rawFileContent: null,
          parsedRows: [],
          transactions: [],
          columnMapping: initialColumnMapping,
          rules: [],
          selectedMonth: null,
          hoveredMonth: null,
        }),
    }),
    {
      name: 'finance-tool-storage',
      partialize: (state) => ({
        columnMapping: state.columnMapping,
        rules: state.rules,
      }),
    }
  )
);
