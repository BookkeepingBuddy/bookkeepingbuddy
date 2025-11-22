**Role:** You are a Senior Frontend Engineer and UX Designer specializing in privacy-first, local-only financial data visualization tools.

**Task:** Create a complete, single-page React application (using Vite) that can be hosted as a static site on GitHub Pages. The application must process sensitive financial data entirely on the client side (browser), with absolutely no data sent to any backend server.

**Context:** The user has financial export files (CSV, or XLS) and needs to categorize transactions using custom JavaScript rules, view them in a pivot table, and analyze them via interactive radar charts.

### 1\. Technical Stack & Architecture

  * **Framework:** React (Vite).
  * **Styling:** Tailwind CSS (for a clean, modern UI).
  * **State Management:** Zustand or React Context.
  * **File Parsing:** `papaparse` (for CSV/TXT) and `xlsx` (for Excel).
  * **Charts:** `Recharts` or `Chart.js` (specifically for Radar charts).
  * **Icons:** `lucide-react`.
  * **Persistence:** `localStorage` (default) with an option to download as json and an option to sync **only the configuration JSON** (not the transaction data) to Google Drive via the client-side API.

### 2\. Core Features

#### A. File Ingestion (Drag & Drop)

  * Create a drop zone that accepts `.csv`, `.txt`, `.tab`, and `.xls/.xlsx` files.
  * **Auto-detection:** Attempt to detect delimiters (comma, tab, semicolon).
  * **Parsing Logic:** Parse the file into a generic array of objects.
      * *Note based on sample data:* Be prepared to handle files with and without headers. If no headers are detected, generate generic ones (Col1, Col2, etc.) until mapped.
  * Creates a drop zone for a configuration file.
  * **Parsing Logic:** Parses the file into current configuration, this should create a popup where the user needs to confirm before overwriting the current config.

#### B. Configuration Panel (The "Brain")

Create a settings modal or sidebar that persists to LocalStorage. It must handle:

1.  **Column Mapping:** Dropdowns to select which column corresponds to:
      * Transaction Date (plus a format selector, e.g., YYYYMMDD, DD-MM-YYYY).
      * Amount (handle commas/dots for decimals).
      * Description (can be a concatenation of multiple columns).
2.  **Rule Engine:** A list of user-defined rules. Each rule consists of:
      * **Logic:** A text area for a JavaScript code snippet. The function receives a `row` object. The user enters the body of the function returning `true`/`false`.
      * **Category:** String input.
      * **Subcategory:** String input.
      * **Validation:** When the user types in the JS box, validate the syntax in real-time. If it throws an error, make the input border **thick red** and show the error message in small red text below. Save automatically on Enter/Blur if valid.

#### C. Categorization Logic

  * Run the rules against the imported data.
  * **Logic:** Iterate through rows. The first rule that returns `true` assigns the Category/Subcategory.
  * Display two lists in the UI:
    1.  **Uncategorized Transactions:** Lines that matched no rules.
    2.  **Categorized Transactions:** Lines that matched a rule (show which rule matched).

#### D. Pivot Table View (The "Harmonica")

Create a tabbed view. Tab 1 is "Data/Config", Tab 2 is "Analysis".

  * **Structure:**
      * **Columns:** Time buckets (Months). Rightmost columns: "Yearly Gross Total" and "Monthly Average".
      * **Rows:** Hierarchical structure: `Category` -\> `Subcategory` -\> `Individual Transactions`.
  * **Interaction:**
      * Categories and Subcategories should be collapsible (Accordion/Harmonica style).
      * When a Subcategory is expanded, show the individual transactions (Date, Desc, Amount) sorted by date.
  * **Filtering:** Add a global filter (text search across description/amounts) that updates the pivot table.

#### E. Interactive Radar Charts (Right Sidebar)

On the right side of the Analysis tab, render two Radar Graphs:

1.  **Top Graph (Categories):**
      * **Data 1 (Filled Area):** The distribution of the column the user *clicked* on in the pivot table (e.g., "July 2025").
      * **Data 2 (Line only):** The distribution of the column the user is currently *hovering* over.
2.  **Bottom Graph (Subcategories):**
      * Same logic (Clicked vs. Hovered) but breaking down the data by subcategories.

### 3\. User Experience & Privacy (Strict Constraints)

  * **Client-Side Only:** Explicitly add comments in the code ensuring no `fetch` or `axios` calls send transaction data to an external URL.
  * **Google Drive:** Implement the Google Drive client flow purely for reading/writing a `config.json` file. Do not upload CSV data there.
  * **Visual Feedback:** Use loading states when parsing large files.
  * **Download buttons:** There should be an option to download the categorized data with columns `date`, `amount`, `description`, `category` and `subcategory` as a csv. There should be a button to download the current configuration as `config.json`. This file should also be uploadable in a configuration drop zone.

### 4\. Sample Data Structure

The user provided Dutch banking data. Please ensure the default Column Mapper looks for standard Dutch headers like:

  * `Transactiedatum` or column index 2 (YYYYMMDD).
  * `Bedrag` or `Transactiebedrag` or column index 6 (can be negative).
  * `Omschrijving` or index 7.

### 5\. Output Requirements

Please provide:

1.  The `package.json` dependencies.
2.  The main `App.jsx` structure.
3.  The `FileParser.js` utility (handling CSV/XLS).
4.  The `RuleEngine.js` logic (handling the `new Function()` safety for user rules).
5.  The `PivotTable.jsx` component.
6.  The `RadarView.jsx` component.
7.  Instructions on how to deploy this to GitHub Pages.

-----

### How to use this prompt

1.  **Paste** the text above into the LLM.
2.  **Wait** for the code generation. It will likely give you a project structure.
3.  **Setup:** Since this is a full application, you will need to run this locally first to build it.
      * Install Node.js.
      * Run `npm create vite@latest my-finance-app -- --template react`
      * Copy the code the LLM gives you into the respective files.
      * Run `npm run build`
4.  **Deploy:** The build command creates a `dist` folder. You can upload the contents of that folder directly to a GitHub repository (gh-pages branch) to host it.

### Specific Advice on the "User Defined JS" Feature

The prompt includes a specific instruction about the "thick red border" validation. The LLM will likely implement a `try/catch` block around a `new Function()` constructor to achieve this. This allows you to write rules like:

```javascript
// Example rule you can type in the app later
return row.description.toLowerCase().includes('albert heijn');
```

This will map to Category: "Groceries", Subcategory: "Supermarket".