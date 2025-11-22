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

## Legal Disclaimers

### Not Financial Advice

This software is a data management tool only. Nothing in this software constitutes financial, investment, legal, or tax advice. The developers are not financial advisors, accountants, or attorneys. Always consult qualified professionals for financial decisions.

### No Affiliation

This project is **not affiliated with, endorsed by, or connected to Copilot.money** or its parent company. "Copilot" in this context refers to compatibility with CSV exports from that service. All trademarks belong to their respective owners.

### Data Accuracy

This software processes data you provide via CSV exports. The developers make no guarantees about:
- Accuracy of parsed data
- Completeness of imports
- Correctness of calculations or summaries

**You are responsible for verifying all financial data.** Do not rely on this tool for tax preparation, financial reporting, or legal compliance without independent verification.

### No Warranty

This software is provided "as is" without warranty of any kind. See the [LICENSE](LICENSE) file for complete terms.

### Security Notice

This tool stores your financial transaction data locally in an unencrypted SQLite database (`~/.copilot-cli/copilot.db`). You are responsible for:
- Securing access to your computer
- Backing up your data
- Protecting exported CSV files containing sensitive financial information

### Privacy

This tool operates entirely offline. No data is transmitted to external servers. Your financial data never leaves your machine.

## License

MIT License - see [LICENSE](LICENSE) for details.
