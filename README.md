# copilot-cli

CLI tool for querying Copilot.money financial data via CSV exports.

## Installation

```bash
npm install
npm run build
npm link  # Makes 'copilot' command available globally
```

## Usage

### Import transactions from Copilot CSV export

```bash
# Export from Copilot: Settings → Account → Export Data
copilot import ~/Downloads/copilot-export.csv

# Preview without importing
copilot import ~/Downloads/copilot-export.csv --dry-run
```

### Query transactions

```bash
# Last 30 days
copilot transactions

# Shortcuts
copilot tx -d 7           # Last 7 days
copilot tx -c groceries   # Filter by category
copilot tx -s "amazon"    # Search description
copilot tx --min -100     # Minimum amount
copilot tx --json         # JSON output
```

### View summaries

```bash
# Overview of last 30 days
copilot summary

# Spending by category
copilot summary --by-category

# Monthly breakdown
copilot summary --by-month

# Custom period
copilot summary -d 90 --by-category
```

### Utility commands

```bash
copilot db-path  # Show database location
```

## Data Storage

Data is stored in `~/.copilot-cli/copilot.db` (SQLite).

## Workflow

1. Export CSV from Copilot.money (Settings → Account → Export)
2. Run `copilot import <file.csv>`
3. Query with `copilot tx` or `copilot summary`

For automated exports, consider using Apple Shortcuts to trigger Copilot export and place in a watched folder.
