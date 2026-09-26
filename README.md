# Fatevo — "Can't pick? Fatevo."

A fun random decision-maker. Add your options, weight them 1–5, tap **ROLL**, and let fate decide. Offline-first: everything lives on the device, $0/month, no accounts, no data collection.

## Screens
1. **My Lists** — saved option sets; tap to open, long-press to rename/delete, ＋ to create; 🔥 daily-streak banner on top
2. **List detail** — options with weights, no-repeat toggle, Share button, big ROLL button
3. **Add/Edit option** — name + weight stepper (1–5)
4. **Result** — animated shuffle-then-reveal, streak note / milestone celebration, "Roll again" / "Back to list"

## Run it
```bash
npm install
npx expo start        # scan the QR code with Expo Go on an Android phone
```

## Verify it
```bash
npm run typecheck     # TypeScript — must be clean
npm run test:roll     # unit tests for the weighted-random + no-repeat logic (seeded, deterministic)
npm run test:streak   # unit tests for the daily-streak transitions + milestones
```

## Publish day (NOT done — do not do these without Guy's sign-off)
- [ ] $25 one-time Google Play developer registration (personal account, identity verification)
- [ ] `eas build --platform android` → upload the `.aab` to Play Console
- [ ] Package name is `com.fatevo.app` — set in `app.json`, can never change after publish
- [ ] Listing assets: icon is in `assets/` (icon.png, adaptive-icon.png); still needed: feature graphic 1024×500, 2–8 phone screenshots, short + full description
- [ ] Content-rating questionnaire (G-rated utility)
- [ ] One-paragraph privacy policy ("Fatevo collects no data; everything stays on your device") hosted free, linked in the listing
- [ ] Data safety form: declare "no data collected"
- [ ] Attorney clearance on the Fatevo name before any filing/use

## Tech notes
- Expo SDK 57 + TypeScript + React Navigation (native stack)
- `expo-sqlite` — tables: `sets`, `options`, `drawn` (no-repeat bookkeeping), `streak` (single-row: count + last roll date; milestones at 7/30/100 in code, not data)
- `expo-sharing` + `expo-file-system` (new `File`/`Paths` API) — share a list as a text file
- No permissions beyond defaults; works fully in airplane mode
