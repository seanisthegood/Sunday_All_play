# The Sunday All-Play

## Preview and publish
Open this folder in VS Code and use Microsoft Live Preview on index.html. Opening index.html directly as a file will not load the CSVs. GitHub Pages serves these files normally. Publish the entire project, including app.js and data/.

## Weekly updates
1. Add the next week's rows to data/every_team_weekly_scores.csv. Keep the headers Week,Team ID,Team Name,Score,Status. Include every team each week, including bye scores, with Status exactly Played or Bye.
2. Update data/actual_standings.csv for the same reporting period. Headers: Team ID,Team Name,Wins,Losses,Points For,Points Against. These are actual scheduled-matchup season totals, excluding byes. Team IDs and names must match the scores file.
3. Preview and check the results, then commit and push both CSVs. Refresh the published page after deployment completes.

Scores and points-for totals are calculated from the weekly CSV. Actual records and points against come from actual_standings.csv. Points For in the standings CSV is retained as the supplied source total; the displayed points use the scores CSV and selected bye mode. The detailed all-play CSV and notebook are reference material, not runtime inputs.

Save CSVs as UTF-8, with plain numeric values (no thousands separators). Standard CSV quoted fields, escaped quotes, Windows line endings and UTF-8 BOM are supported. To keep matrices comparable, each included week must contain one row per team. Do not add partially completed weeks.

## Editing
- index.html: layout, text and styling (inside the style section)
- app.js: CSV loading, calculations and interactions
- data/: league data

The offline snapshot button embeds the loaded data and application code in a standalone HTML file. That downloaded copy does not fetch future CSV updates.

## Checks
Run `node tests/dashboard.cjs` to verify CSV loading, all-play totals, matrix consistency, sorting and error handling. No dependencies are needed.
