# Baden Barbell

A personal workout log. Plain HTML, CSS and JavaScript with no build step. It installs to your phone home screen as a PWA, works offline, and keeps everything in `localStorage` on the device.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page |
| `styles.css` | All the styling, light and dark mode |
| `app.js` | The program, logging, editing, progress and backup |
| `sw.js` | Service worker that makes it work offline |
| `manifest.webmanifest` | Name, colours and icons for installing |
| `icons/` | App icons |

## Run it locally

Any static server works. For example:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Host it for free

**GitHub Pages:** in the repo go to Settings, then Pages. Under "Build and deployment" pick "Deploy from a branch", choose `main` and `/ (root)`, and save. After a minute it's live at `https://<your-username>.github.io/<repo-name>/`.

**Netlify Drop:** go to https://app.netlify.com/drop and drag this folder onto the page. You get a URL straight away.

## Add it to your phone

* **iPhone (Safari):** open the URL, tap Share, then "Add to Home Screen".
* **Android (Chrome):** open the URL, tap the three dot menu, then "Install app" or "Add to Home screen".

## Updating the app

When you change any file, bump `VERSION` in `sw.js` (for example `bb-v2`). The app picks up the new files on the next open, and shows them the time after that.

## Screens

* **Today:** live dashboard. Session progress ring, session timer, rest timer since your last ticked set, volume, top set, your next set with its plates, and estimated maxes (Epley).
* **Train:** log sets. Squat, bench and deadlift rows show the plates per side under each set. A rest timer pill pops up after each ticked set (tap to hide).
* **Plates:** plate calculator for KG plates in competition colours. Pick a 20, 15 or 25 kg bar, 2.5 kg comp collars or none, and which plates you have. Quick load buttons give 50% to 100% of your maxes.
* **Progress:** best lifts, total, top weight per week and sets done per day.
* **Setup:** maxes, backup and restore, theme and reset.

## Swapping exercises

Tap the swap arrows on any exercise card (or tap its name). Type anything you like, or tap a suggestion, and it swaps straight away. Sets, reps and percentages stay the same, and the new exercise starts a fresh log. The old one's history is kept, so "Restore this day" brings it back with its weights. Names you type are remembered and show first next time.

## Changing your program

Tap **Edit** on any day, or the pencil on any exercise card. You can rename an exercise (with suggestions), change which lift it counts toward, change reps and percentages for each set, add or remove sets, reorder, delete and add exercises. Reps and sets change in all 4 weeks unless you tick "Only change sets and reps in this week". Percentages always change in the week you're looking at, so your weekly progression stays intact.

## Theme

Dark with gradients by default. Setup lets you switch to Light or System.

## Moving your data

Setup has a **Copy backup** button. Paste the text somewhere safe, then on the other device paste it into the box and tap **Restore from backup**.
