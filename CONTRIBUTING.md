# Contributing

Use Windows, Node.js 24 and `npm ci`. Follow the build sequence in README. Do not change technical identifiers or add fallback to another DeckBridge edition. Keep Polish and English guides aligned.

Before committing, enable the local secret check with `git config --local core.hooksPath .githooks`. Run `node scripts/test-secrets.cjs` for its regression tests and `npm run check:secrets` for the reachable-history scan. See SECURITY.md for limits and credential-handling rules.

Run the mocked JavaScript suite with `node scripts/run-tests.cjs`. Run each PowerShell test in a fresh `powershell.exe -NoProfile -File scripts/<test>.ps1` process: `test-dev-keys`, `test-live-reader`, `test-reader-lease`, `test-game-exit`. These use fake key backends, synthetic images or fake processes, not real game input/capture. Stop after any failure. They do not replace manual WoW and Stream Deck testing.

Report the version, Windows/Stream Deck/WoW versions, display scaling, steps, expected result and actual result. Redact personal data. Proposed additional gameplay features require maintainer agreement before implementation.

Original Duotone artwork is reproducible from `scripts/create-duotone-icons.ps1`. It refuses existing output directories. Use a disposable source checkout with empty asset destinations if regenerating; do not delete working assets just to rerun it. Preserve license notices. Contributions must be your own or have compatible redistribution rights.

## Po polsku

Używaj Windows, Node.js 24 i `npm ci`. Wykonaj kontrole z README oraz testy opisane powyżej. Każdy test PowerShell uruchamiaj w osobnym procesie. Testy z atrapami nie zastępują próby w grze i na urządzeniu. Zachowaj rozdzielenie identyfikatorów i zgodność dokumentacji PL/EN. Nie publikuj danych konta w zgłoszeniach. Nowe funkcje gry uzgodnij wcześniej z autorem. Wkład musi mieć prawa pozwalające na publikację.

Przed commitem włącz `git config --local core.hooksPath .githooks`. Test kontroli sekretów uruchamia `node scripts/test-secrets.cjs`, a historię sprawdza `npm run check:secrets`. Ograniczenia i zasady ochrony poświadczeń opisuje SECURITY.md.
