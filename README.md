# Fatevo — Can't pick? Fatevo.

A fun, offline-first random decision-maker for Android. Add your options, weight them, tap **ROLL**, and let fate decide — coin flips, dice, a prize wheel, best-of showdowns, and elimination brackets, wrapped in daily streaks and a monthly recap worth sharing.

## Features

- **Decision lists** — saved option sets with named, emoji-tagged options and weights (1–5); no-repeat toggle per list
- **Roll modes** — classic random pick, coin flip, dice, prize wheel, best-of-3, sudden-death tiebreak, and elimination mode
- **Daily streaks** — flame counter on the home screen with milestone celebrations at 7, 30, and 100 days; miss a day and it resets
- **Your Fatevo Month** — an on-device monthly recap of your top 3 decision categories with percentages, a confetti reveal, and a shareable recap card
- **Sharing** — share any result as text or as a category-led image card
- **How Fatevo works** — built-in help sheet explaining every mode
- **Free with ads** — AdMob anchored adaptive banner on the Lists screen

## Privacy

Fatevo works fully offline. No accounts, no sign-up, no tracking — your lists, roll history, streaks, settings, and recap statistics never leave your device. The only network-adjacent component is Google AdMob banner advertising.

## Tech stack

- [Expo](https://expo.dev) (SDK 57) + React Native 0.86 + TypeScript + React Navigation
- `expo-sqlite` — tables for sets, options, no-repeat bookkeeping, streaks, and monthly recap stats
- `react-native-google-mobile-ads` for banner monetization
- `expo-sharing` + `react-native-view-shot` for shareable result and recap cards
- Built and signed via [EAS Build](https://expo.dev/eas)

## Run it

Prerequisites: Node.js (LTS).

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

## Build it

```bash
eas build --platform android --profile preview   # sideloadable APK
eas build --platform android --profile production # AAB for Google Play
```

## Project status

In active development, heading toward a Google Play release. iOS is on hold.

## License

MIT — see [LICENSE](LICENSE) for details.
