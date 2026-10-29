# Testy i zakres zgodności

## Testy automatyczne

Używaj Windows, Node.js 24 i zależności z pliku blokady zainstalowanych przez `npm ci`. Wykonaj kontrole kompilacji z README.md, następnie `npm test` dla siedmiu zestawów JavaScript. Obejmują obsługę akcji, parsowanie danych, ograniczenia pobierania ikon, protokół znaczników, cykl życia czytnika, akcje użytkowe oraz schematy SDK.

Każdy test PowerShell uruchamiaj w osobnym procesie:

```powershell
powershell.exe -NoProfile -File scripts/test-dev-keys.ps1
powershell.exe -NoProfile -File scripts/test-live-reader.ps1
powershell.exe -NoProfile -File scripts/test-reader-lease.ps1
powershell.exe -NoProfile -File scripts/test-game-exit.ps1
```

Testy używają atrap procesów i obsługi klawiatury lub obrazów syntetycznych. Nie przechwytują pulpitu i nie wysyłają klawiszy do gry. GitHub Actions wykonuje kompilację i testy na Windows. Wyniki są dostępne w zakładce Actions repozytorium.

`node scripts/test-secrets.cjs` sprawdza wykrywanie poświadczeń i obiekty indeksu Git. `npm run check:secrets` skanuje historię bez wypisywania dopasowanych sekretów. Lokalną kontrolę przed commitem włącza `git config --local core.hooksPath .githooks`. CI również sprawdza historię, przypina wersje akcji i audytuje zależności; zakres oraz znane zgłoszenia opisuje SECURITY.md.

## Podstawowy test ręczny

Sprawdź start Screen Reader jako OFF, uruchamianie umiejętności przez Action Slot, aktualizację ikon bez /reload po włączeniu odczytu, działanie akcji użytkowych i przełączenie czytnika na OFF po zamknięciu WoW. Te punkty przeszły dla wydania testowego 0.1.13 na sprawdzonym stanowisku; nie potwierdzają zgodności z każdym systemem.

Czysta instalacja, odinstalowanie, inne ścieżki aktualizacji, niestandardowe paski i dodatkowe konfiguracje DPI/ekranu wymagają szerszych testów. Addon jest przeznaczony dla WoW Retail i deklaruje Interface 120105. Wymagania i obsługę opisują README.pl.md i USER-GUIDE.pl.md.

Konfiguracja zależności wymusza Zod 4.6.6. Testy obejmują rzeczywiste schematy zależności SDK z tą wersją. Kompilacja może zgłaszać ostrzeżenia adnotacji PURE i zależności cyklicznej w Zod, kończąc się poprawnie.
