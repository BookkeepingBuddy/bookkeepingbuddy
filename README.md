# FinanceFlow

A privacy-first financial analysis tool that runs 100% in your browser. No data is ever sent to any server.

**Live Demo**: [https://bookkeepingbuddy.github.io/bookkeepingbuddy/](https://bookkeepingbuddy.github.io/bookkeepingbuddy/)

## Features

- **Import Data**: Support for CSV, TXT, TAB, XLS, and XLSX files
- **Column Mapping**: Flexible mapping for date, amount, and description columns
- **Custom Rules**: JavaScript-based categorization rules with drag-and-drop reordering
- **AI Integration**: Generate categorization rules with AI assistants (copy prompt to ChatGPT/Claude)
- **Pivot Table**: Hierarchical view by category and subcategory with monthly breakdown
- **Charts**: Pie charts showing distribution by category and subcategory
- **Export**: Download categorized transactions as CSV or save/load configuration as JSON

## Privacy

All data processing happens locally in your browser:
- No backend server
- No data transmission
- No cookies or tracking
- Configuration can be saved/loaded via JSON files

## Getting Started

### Using the hosted version

Visit [https://bookkeepingbuddy.github.io/bookkeepingbuddy/](https://bookkeepingbuddy.github.io/bookkeepingbuddy/)

### Running locally

```sh
# Clone the repository
git clone https://github.com/BookkeepingBuddy/bookkeepingbuddy.git

# Navigate to the project directory
cd bookkeepingbuddy

# Install dependencies
npm install

# Start the development server
npm run dev
```

## How to Use

### Step 1: Import
1. Drop your bank export file (CSV, XLS, etc.) into the data drop zone
2. Configure column mapping for date, amount, and description
3. Select the correct date format and decimal separator

### Step 2: Rules
1. Create categorization rules using JavaScript
2. Rules are evaluated in order - first match wins
3. Use the AI Help button to generate rules automatically
4. Drag and drop to reorder rules

Example rules:
```javascript
// Match grocery store
return row.description.toLowerCase().includes("albert heijn");

// Match rent payments
return row.amount < -1000 && row.description.toLowerCase().includes("rent");

// Match income
return row.amount > 0;
```

### Step 3: Analysis
1. View the pivot table with monthly breakdown
2. Click on a month to see pie chart distributions
3. Toggle categories and subcategories
4. Export data or configuration

## Tech Stack

- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Charts**: Recharts
- **File Parsing**: PapaParse (CSV) + SheetJS (Excel)
- **Drag & Drop**: dnd-kit

## Deployment

The app is automatically deployed to GitHub Pages via GitHub Actions on push to the `main` branch.

## License

MIT
