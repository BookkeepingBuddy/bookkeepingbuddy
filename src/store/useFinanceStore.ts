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
}

export interface Transaction {
  date: string;
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
        
        const transactions: Transaction[] = parsedRows.map((row) => {
          const rawData: Record<string, any> = {};
          row.forEach((cell, idx) => {
            rawData[`col${idx}`] = cell;
          });
          
          // Parse date
          let date = '';
          if (columnMapping.dateIndex !== null) {
            date = String(row[columnMapping.dateIndex] || '');
          }
          
          // Parse amount
          let amount = 0;
          if (columnMapping.amountIndex !== null) {
            let amountStr = String(row[columnMapping.amountIndex] || '0');
            if (columnMapping.decimalSeparator === ',') {
              amountStr = amountStr.replace(',', '.');
            }
            amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
          }
          
          // Parse description
          const description = columnMapping.descriptionIndices
            .map((idx) => String(row[idx] || ''))
            .join(' ')
            .trim();
          
          const transaction: Transaction = {
            date,
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
