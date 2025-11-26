import { create } from 'zustand';

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
  filename: string; // Original filename
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
  filename: string;
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
  importConfig: (configJson: string) => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  reset: () => void;
}

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
      dataFiles: [],
      transactions: [],
      rules: [],
      selectedMonth: null,
      hoveredMonth: null,

      addDataFile: (file) => {
        set((state) => ({
          dataFiles: [...state.dataFiles, file],
        }));
        get().saveToLocalStorage();
      },

      removeDataFile: (id) => {
        const { dataFiles } = get();
        const file = dataFiles.find(f => f.id === id);

        // Remove from localStorage first
        if (file) {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          localStorage.removeItem(`finance-file-${sanitizedName}`);
        }

        set((state) => ({
          dataFiles: state.dataFiles.filter((f) => f.id !== id),
        }));
        get().saveToLocalStorage();
      },

      updateDataFileName: (id, name) => {
        const { dataFiles } = get();
        const oldFile = dataFiles.find(f => f.id === id);

        // Remove old localStorage entry if name changed
        if (oldFile && oldFile.name !== name) {
          const oldSanitizedName = oldFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          localStorage.removeItem(`finance-file-${oldSanitizedName}`);
        }

        set((state) => ({
          dataFiles: state.dataFiles.map((file) =>
            file.id === id ? { ...file, name } : file
          ),
        }));
        get().saveToLocalStorage();
      },

      updateDataFileMapping: (id, mapping) => {
        set((state) => ({
          dataFiles: state.dataFiles.map((file) =>
            file.id === id
              ? { ...file, columnMapping: { ...file.columnMapping, ...mapping } }
              : file
          ),
        }));
        get().saveToLocalStorage();
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
        get().saveToLocalStorage();
      },

      updateRule: (id, updates) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === id ? { ...rule, ...updates } : rule
          ),
        }));
        get().saveToLocalStorage();
      },

      deleteRule: (id) => {
        set((state) => ({
          rules: state.rules.filter((rule) => rule.id !== id),
        }));
        get().saveToLocalStorage();
      },

      reorderRules: (newOrder) => {
        set({ rules: newOrder });
        get().saveToLocalStorage();
      },

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
            filename: dataFile.name,
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
        const { rules } = get();
        return JSON.stringify({ rules }, null, 2);
      },

      importConfig: (configJson) => {
        try {
          const config = JSON.parse(configJson);
          if (config.rules) {
            set({ rules: config.rules });
            get().saveToLocalStorage();
          }
        } catch (err) {
          console.error('Invalid config JSON:', err);
        }
      },

      saveToLocalStorage: () => {
        const { dataFiles, rules } = get();

        // Save each data file separately (with all its data)
        // Use sanitized filename as key
        dataFiles.forEach((file) => {
          try {
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `finance-file-${sanitizedName}`;
            localStorage.setItem(key, JSON.stringify(file));
          } catch (err) {
            console.error(`Failed to save file ${file.name}:`, err);
          }
        });

        // Save config (just rules)
        try {
          localStorage.setItem('finance-config', JSON.stringify({ rules }));
        } catch (err) {
          console.error('Failed to save config:', err);
        }
      },

      loadFromLocalStorage: () => {
        try {
          // Load rules from config
          const configStr = localStorage.getItem('finance-config');
          const rules = configStr ? JSON.parse(configStr).rules || [] : [];

          // Load all data files
          const loadedFiles: DataFile[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('finance-file-')) {
              const fileStr = localStorage.getItem(key);
              if (fileStr) {
                try {
                  const file = JSON.parse(fileStr);
                  loadedFiles.push(file);
                } catch (err) {
                  console.error(`Failed to parse file ${key}:`, err);
                }
              }
            }
          }

          set({
            dataFiles: loadedFiles,
            rules,
          });
        } catch (err) {
          console.error('Failed to load from localStorage:', err);
        }
      },

      reset: () => {
        const { dataFiles } = get();

        // Clear all file data from localStorage
        dataFiles.forEach((file) => {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          localStorage.removeItem(`finance-file-${sanitizedName}`);
        });
        localStorage.removeItem('finance-config');

        set({
          dataFiles: [],
          transactions: [],
          rules: [],
          selectedMonth: null,
          hoveredMonth: null,
        });
      },
}));
