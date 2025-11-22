# copilot-cli

CLI tool for querying Copilot.money financial data via CSV exports.

## Installation

```bash
npm install
npm run build
npm link  # Makes 'copilot' command available globally
```

## Usage

### Sync (Export + Import) - macOS only

```bash
# One command to export from Copilot and import
copilot sync

# Requires an Apple Shortcut named "Export Copilot"
# See "Apple Shortcuts Setup" below
```

### Export from Copilot - macOS only

```bash
# Trigger export via Apple Shortcuts
copilot export

# Custom shortcut name
copilot export --shortcut "My Copilot Export"
```

### Import transactions from CSV

```bash
# Import a CSV file manually exported from Copilot
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

## Apple Shortcuts Setup (macOS)

To enable `copilot sync` and `copilot export`, create an Apple Shortcut:

1. Open **Shortcuts** app
2. Create new shortcut named **"Export Copilot"**
3. Add actions:
   - **Open App**: Copilot
   - **Wait**: 2 seconds
   - **Run AppleScript** (or use keyboard shortcuts to navigate to export)

Alternative: Export manually from Copilot (Settings → Account → Export) and use `copilot import`.

## Workflow

**Automated (macOS)**:
```bash
copilot sync        # Export + import in one step
copilot summary     # View spending
```

**Manual (any platform)**:
1. Export CSV from Copilot.money (Settings → Account → Export)
2. Run `copilot import <file.csv>`
3. Query with `copilot tx` or `copilot summary`

## FAQ / Troubleshooting

### "permission denied: copilot" after npm link

The TypeScript compiler doesn't preserve execute permissions. Fix with:

```bash
chmod +x $(npm prefix -g)/lib/node_modules/copilot-cli/dist/cli.js
```

Or rebuild (this runs automatically now):
```bash
npm run build  # postbuild script sets +x
```

### Command not found after npm link

Your shell may not have the npm global bin in PATH. Check with:

```bash
echo $PATH | grep -o '[^:]*npm[^:]*'
npm prefix -g  # Shows where npm installs global packages
```

Add to your shell config (~/.zshrc or ~/.bashrc):
```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

### Import shows 0 transactions

Make sure you're exporting from Copilot.money, not another app. The CSV should have columns like: `date`, `name`, `amount`, `category`, `account`.

### Search returns no results

Searches look at the transaction description. Run `copilot tx -d 7` to see recent transactions and verify descriptions are populated.

### "SQLITE_CONSTRAINT" error on import

This can happen with corrupted or partial imports. Reset the database:

```bash
rm ~/.copilot-cli/copilot.db
copilot import your-file.csv
```

### How do I export from Copilot.money?

1. Open Copilot app on Mac/iPhone
2. Go to **Settings** → **Account** → **Export**
3. Choose date range and export as CSV
4. Import with `copilot import ~/Downloads/copilot-export.csv`

### Can I use this with other finance apps?

The CSV parser is flexible and handles common column names (date, description, amount, category, account). If your app exports similar CSV format, it may work. Test with `--dry-run` first.

### Where is my data stored?

```bash
copilot db-path  # Shows: ~/.copilot-cli/copilot.db
```

This is a SQLite database. You can query it directly:
```bash
sqlite3 ~/.copilot-cli/copilot.db "SELECT COUNT(*) FROM transactions"
```

### How do I backup my data?

```bash
cp ~/.copilot-cli/copilot.db ~/copilot-backup-$(date +%Y%m%d).db
```

## Legal Disclaimers

### Not Financial Advice

This software is a data management tool only. Nothing in this software constitutes financial, investment, legal, or tax advice. The developers are not financial advisors, accountants, or attorneys. Always consult qualified professionals for financial decisions.

### No Affiliation

This project is **not affiliated with, endorsed by, or connected to**:
- **Copilot.money** or its parent company
- **Microsoft Corporation** or GitHub Copilot
- **Any other "Copilot" branded product or service**

"Copilot" in this project name refers solely to compatibility with CSV exports from the Copilot.money personal finance app. All trademarks belong to their respective owners.

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
