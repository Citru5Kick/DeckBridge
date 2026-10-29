# DeckBridge — obsługa i rozwiązywanie problemów

[English](USER-GUIDE.en.md) · [Instalacja i wymagania](README.pl.md) · [Prywatność](PRIVACY.md)

## Konfiguracja

W WoW otwórz edytor przyciskiem minimapy lub `/dbzones`. Wybierz strefę, włącz ją i wybierz źródłowy pasek. Automatyczne dopasowanie przykleja strefę do standardowego paska. Możesz również przeciągnąć strefę, zmienić rozmiar dolnym prawym uchwytem i obrócić ją o 90 stopni. Zaznaczona strefa ma złoty obrys. Po zakończeniu zamknij edytor: obrysy znikają, małe znaczniki odczytu pozostają. Niestandardowe paski wymagają osobnego sprawdzenia.

W Stream Deck dodaj Action Slot. Wybierz tę samą strefę oraz pozycję 1–12. Jako plik danych wskaż rzeczywisty `WTF/Account/<konto>/SavedVariables/DeckBridgeDev.lua`, jeśli automatyczne wykrywanie nie wybierze właściwego. Nie wskazuj pliku innej edycji DeckBridge. Po pierwszym zalogowaniu `/reload` zapisuje dane na dysku.

Screen Reader umieść na tej samej stronie urządzenia co Action Slot. Przycisk domyślnie pokazuje OFF; kliknij, aby zezwolić na odczyt. Odczyt pikseli działa tylko dla aktywnego okna WoW. Zamknięcie gry, wyłączenie czytnika lub usunięcie ostatniego wymaganego przycisku zatrzymuje czytnik. Po powrocie wymagane jest ponowne kliknięcie. OFF dotyczy przechwytywania ekranu; plugin nadal może obsługiwać klawisze i plik danych.

Emote udostępnia listę emotek. Map & Quests, Backpack, Character oraz Spellbook mają odrębne akcje. Polecenie `/dbcheck` weryfikuje przypisania skrótów addonu. Sprawdź konflikty F1–F12 z modyfikatorami i Ctrl+Alt+Shift+A–Q. Pierwsze kliknięcie podczas startu pomocniczego procesu może być pominięte; po chwili naciśnij ponownie.

## Aktualizacja

1. Pobierz paczkę zgodnej wersji z sekcji Releases i sprawdź jej SHA-256 względem opublikowanego pliku sum. Zanotuj wersję, z której aktualizujesz.
2. Wyłącz Screen Reader i zamknij WoW. Zachowaj kopię folderów tej edycji, jej `DeckBridgeDev.lua` oraz ustawień/przypisań Stream Deck. Dane użytkownika nie są częścią paczki wydania.
3. Ustal rzeczywiste ścieżki `Interface/AddOns/DeckBridgeDev` oraz `%APPDATA%/Elgato/StreamDeck/Plugins/com.deckbridge.wow.dev.sdPlugin`. Aktualizacja dotyczy wyłącznie tych dwóch folderów. Nie kopiuj całego `addon`, całego katalogu Plugins ani folderu nadrzędnego z ZIP-a.
4. Zatrzymaj tylko plugin `com.deckbridge.wow.dev` przed wymianą jego plików. Jeśli nie wiesz, jak zatrzymać go osobno, poproś o pomoc przed nadpisaniem. Nie zamykaj całej aplikacji Stream Deck w celu restartu tej edycji.
5. Zainstaluj nową parę addon/plugin i uruchom wyłącznie ten plugin. Zachowaj nazwy techniczne. Nie zastępuj SavedVariables, profili ani innej edycji DeckBridge.
6. Uruchom grę, sprawdź `/dbcheck`, jedną akcję i zmianę ikony. Czytnik włącz ponownie ręcznie. Jeśli test nie przejdzie, zatrzymaj aktualizowaną edycję i skorzystaj z zachowanych kopii.

## Odinstalowanie

Wyłącz czytnik, zamknij WoW i zatrzymaj tylko `com.deckbridge.wow.dev`. Usuń przypisane do tej edycji akcje z profili Stream Deck, jeśli nie będą już potrzebne. Po sprawdzeniu pełnych ścieżek możesz usunąć wyłącznie folder addonu `DeckBridgeDev` oraz folder pluginu `com.deckbridge.wow.dev.sdPlugin`.

Dane `DeckBridgeDev.lua` w SavedVariables i pamięć ikon `%USERPROFILE%/.deckbridge-dev/icons-v1` można zachować do ponownej instalacji. Ich usunięcie jest osobną, opcjonalną decyzją: najpierw zamknij grę i zatrzymaj plugin, wykonaj kopię i upewnij się, że wskazujesz dane tej edycji. Nie usuwaj całego WTF, konta, Plugins ani danych innego DeckBridge.

## Rozwiązywanie problemów

| Objaw | Co sprawdzić |
| --- | --- |
| Brak kategorii DeckBridge | Czy zainstalowano zbudowany folder pluginu, a nie ZIP źródeł? Czy spełnione są wymagania README? |
| Brak danych lub stare ikony | Zaloguj postać, wykonaj `/reload`, sprawdź ścieżkę i nazwę `DeckBridgeDev.lua`. Plik dyskowy aktualizuje WoW przy zapisie, nie po każdej zmianie umiejętności. |
| Ikona zmienia się dopiero po `/reload` | Włącz Screen Reader na stronie z Action Slot, ustaw WoW jako aktywne okno i sprawdź aktywną strefę oraz widoczne znaczniki. |
| Czytnik wrócił do OFF | Po zamknięciu gry, zmianie strony/usunięciu wymaganych przycisków lub restarcie włącz go ręcznie. Jest to celowe. |
| Reader ERROR | Naciśnięcie przycisku ponawia próbę po błędzie. Sprawdź dostępność Windows PowerShell i zgłoś błąd, jeśli powraca. Nie wyłączaj zabezpieczeń systemu w celu obejścia błędu. |
| Przycisk nie uruchamia akcji | Ustaw aktywne okno WoW, poczekaj na start pomocniczego procesu, sprawdź `/dbcheck` i konflikty klawiszy. Po zmianach przypisań wyjdź z walki i sprawdź ponownie. |
| Niektóre ikony są puste | Sprawdź dostęp do usług ikon opisanych w PRIVACY.md. Odczyt identyfikatora i pobranie obrazu to osobne czynności. |

W zgłoszeniu podaj wersje DeckBridge, WoW, Windows i Stream Deck, skalowanie ekranu, kroki i rezultat. Zanonimizuj logi i zrzuty. Nie publikuj SavedVariables, nazw katalogów konta ani eksportów profili. Zasady zgłoszeń: [CONTRIBUTING.md](CONTRIBUTING.md) i [SECURITY.md](SECURITY.md).
