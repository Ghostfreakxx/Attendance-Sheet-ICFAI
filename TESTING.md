# Testing

## Automatic tests

Every pull request runs the browser tests on GitHub (see the **Tests** check). To run them yourself:

```bash
npm install
npx playwright install chromium
npm test
```

| Suite | What it checks |
|---|---|
| `tests/full.test.js` | Every tab and button: taking attendance, register, reports, students, subjects, settings, backup/restore, new semester/batch, theme, printing, phone widths, blocked storage |
| `tests/edge.test.js` | Excel paste with an S.No column, Mizo characters, duplicate roll numbers, two tabs open at once, Indian time zone at midnight, report % vs an independent calculation, CSV escaping, iPhone layout and share sheet, upgrading old saved data, 300 random actions |
| `tests/scale.test.js` | 150 students × 8 subjects × a full semester (~590 classes): speed and storage size |
| `tests/pwa.test.js` | Installable (no Chrome installability errors), works offline, offline tag, install button |

## Manual check on a real phone (5 minutes)

The automatic tests use Chrome. Before handing it over, try these on an **iPhone (Safari)** and an **Android phone**:

1. Open the site link, then install it (iPhone: Share → Add to Home Screen; Android: Install app).
2. Open the installed app, tap **Load sample MA class**, and take attendance for today.
3. Turn on **Aeroplane mode**, close the app fully, reopen it: data should still be there and marking should work.
4. Reports → **Download CSV**: on iPhone the share sheet should open (choose *Save to Files*); on Android it should download. Open it in Excel/Sheets.
5. Settings → **Download backup**, then **Erase everything**, then **Restore from backup**: all data returns.
6. Settings → **Erase everything** to clear the sample before real use.
