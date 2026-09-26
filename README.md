# Attendance Sheet – ICFAI (MA)

A simple attendance register for ICFAI MA classes. It's one file (`index.html`) that runs in any browser, on a phone or a laptop. There is nothing to install, no login, and it works offline.

## How to open it

- **Quickest:** download `index.html` and double-click it.
- **Online (recommended):** turn on GitHub Pages under repo **Settings → Pages → Deploy from branch → `main` / root**. Then open `https://ghostfreakxx.github.io/attendance-sheet-icfai/` on any phone or computer.

## Install it as an app (works offline)

Open the website link once, then:
- **Android (Chrome):** tap **Install app** at the top of the page, or open the ⋮ menu → *Install app*.
- **iPhone / iPad (Safari):** tap **Share** → **Add to Home Screen**.
- **Computer (Chrome / Edge):** click **Install app**, or the install icon in the address bar.

After that it opens from the home screen like a normal app and works without internet. If you're offline, an "Offline – still saving" tag appears. When you're online it picks up new versions automatically.

## First-time setup (2 minutes)

1. **Subjects:** add each paper (code optional, e.g. `MA101 – Research Methodology`).
2. **Students:** copy the *Roll No* and *Name* columns from Excel or Google Sheets and paste them into the box, then click **Add students**. You can also import a `.csv` file.
3. **Settings:** fill in the batch, semester, faculty name and minimum attendance % (default **75%**).

Want to try it first? Click **Load sample MA class** on the welcome screen.

## Daily use

1. Open **Take Attendance**, pick the subject and date, and tap **Start**.
2. Everyone starts as **Present**, so tap **A** only for absentees (or tap a name to switch P/A). Use **L** for approved leave or medical absence; leave is not counted in the percentage.
3. That's it. Changes save automatically.

For a second lecture of the same subject on the same day, choose *Lecture no. 2*.

## Registers & reports

- **Register:** a date-by-date P/A grid per subject. Click any cell to correct it. You can download it as CSV (it opens in Excel) or print it.
- **Reports:** subject-wise and overall % per student, with shortage rows highlighted in red. It includes an "Only below minimum" filter, a CSV export with a SHORTAGE/OK column, and a print option.

Percentage = Present ÷ (Present + Absent).

## Reusing it every semester / batch

In **Settings & Data**:

| Button | Keeps | Clears |
|---|---|---|
| New semester | Students, class details | Subjects, attendance |
| New batch | Subjects, class details | Students, attendance |
| Erase everything | – | Everything |

Always click **Download backup** first to keep the old records. **Restore from backup** loads a backup file on any device.

## Important: where is my data?

Data is stored **only in the browser you use** (it is not uploaded anywhere). So:
- Use the same browser/device, **or** move data with *Download backup* → *Restore*.
- Clearing browser data or using Incognito mode will lose it, so keep regular backups (for example, weekly).

Each faculty member or class can keep a separate copy. Open it in a different browser, or save a copy of `index.html` for each class.
