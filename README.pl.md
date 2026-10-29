# DeckBridge

[English](README.md) · [Instrukcja obsługi](USER-GUIDE.pl.md) · [Prywatność](PRIVACY.md)

Addon WoW i plugin Stream Deck dla Windows. Udostępnia przyciski umiejętności z aktualnymi ikonami, edytowalne strefy odczytu, emotki, Map & Quests, Backpack, Character i Spellbook. Grafiki interfejsu mają wspólny styl Duotone.

## Wymagania

Windows 10+, Stream Deck 7.1+ i WoW Retail. Addon deklaruje Interface 120105. Wersja 0.1.13 to pierwsza publiczna wersja testowa. Inne wersje gry, niestandardowe paski i wszystkie konfiguracje DPI nie zostały potwierdzone.

Nazwa publiczna to DeckBridge. Identyfikatory techniczne zachowują `dev`: `com.deckbridge.wow.dev`, `DeckBridgeDev`, `DeckBridgeDevDB`. Nie zmieniaj nazw folderów ani nie nadpisuj innej instalacji DeckBridge. Równoległe wersje mogą kolidować przypisaniami klawiszy w grze.

## Pierwsza instalacja

1. Pobierz paczkę wydania przygotowaną przez autora. Automatyczny ZIP źródeł GitHuba nie jest gotowym pluginem.
2. Zamknij WoW. W swojej rzeczywistej instalacji Retail umieść tylko `addon/DeckBridgeDev` w `Interface/AddOns`.
3. W katalogu `%APPDATA%/Elgato/StreamDeck/Plugins` umieść tylko zbudowany folder `com.deckbridge.wow.dev.sdPlugin`. Jeśli cel już istnieje, zatrzymaj się i wykonaj kopię przed aktualizacją. Nie zastępuj SavedVariables ani profili.
4. Po pierwszej instalacji uruchom Stream Deck i WoW; włącz addon. Zaloguj postać i wykonaj `/reload`, aby zapisać początkowe dane.
5. Dodaj Action Slot, wybierz strefę i pozycję. Jeśli automatyczne wykrywanie nie wybierze pliku, wskaż właściwy `WTF/Account/<konto>/SavedVariables/DeckBridgeDev.lua`.
6. Przycisk minimapy lub `/dbzones` otwiera edytor stref. Dodaj Screen Reader na tej samej stronie Stream Deck i kliknij, aby włączyć odczyt. Okno WoW musi być aktywne. `/dbcheck` sprawdza przypisania akcji.

Addon rezerwuje F1–F12 z kombinacjami modyfikatorów oraz Ctrl+Alt+Shift+A–Q. Sprawdź kolizje ze swoimi skrótami. Pierwsze naciśnięcie podczas uruchamiania pomocniczego procesu może zostać pominięte; po uruchomieniu naciśnij ponownie. Przy aktualizacji restartuj wyłącznie ten plugin.

Instrukcje [aktualizacji](USER-GUIDE.pl.md#aktualizacja), [odinstalowania](USER-GUIDE.pl.md#odinstalowanie) i [rozwiązywania problemów](USER-GUIDE.pl.md#rozwiązywanie-problemów) znajdują się w podręczniku użytkownika. Manifest wydania nie konfiguruje debuggera Node.js. Przed udostępnieniem paczki sprawdź [testy i zakres zgodności](TESTING.pl.md).

## Prywatność i budowanie

Czytnik startuje wyłącznie po kliknięciu i domyślnie jest OFF. Zamknięcie gry wyłącza go. Sam plugin, obsługa klawiatury i SavedVariables działają niezależnie. Ikony mogą być pobierane z usług zewnętrznych; inspektory ustawień ładują zewnętrzny skrypt. Szczegóły: [PRIVACY.md](PRIVACY.md) i [instrukcja PL](LIVE-ICONS.pl.md).

Budowanie wymaga Node.js 24, npm i Windows PowerShell 5.1. Polecenia weryfikacji oraz pakowania znajdują się w [README angielskim](README.md#build-from-source). `npm ci` instaluje zależności według pliku blokady. `build:dev` kompiluje tylko DEV, a skrypt pakujący tworzy nowy katalog bez instalowania zmian. Testy i zasady zgłoszeń: [CONTRIBUTING.md](CONTRIBUTING.md).

Publiczna konfiguracja wymusza Zod 4.6.6 z poprawką [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), poza zakresem pierwotnie zadeklarowanym przez `@elgato/utils`. Sprawdzamy rzeczywiste schematy RPC i list SDK, kompilację oraz testy projektu. Świeżo zbudowana paczka wymaga jeszcze testu na urządzeniu.

## Licencja

Własny kod i grafiki Duotone: [MIT](LICENSE), copyright 2026 Citru5Kick. Licencje zależności pozostają odrębne i są dołączane do wydań. MIT nie obejmuje ikon i zasobów gry, znaków towarowych ani zewnętrznych zasobów. Projekt jest niezależny od Blizzard Entertainment oraz Elgato/Corsair.
