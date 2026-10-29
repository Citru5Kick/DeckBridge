# DeckBridge 0.1.13 — instrukcja odczytu ikon

Zestaw Duotone łączy błękit #4BD8F5 i złoto #F2CE7B na granatowym tle #101F30. Ikony pluginu mają rozmiary 72 i 144 px; tekstury addonu 32 px (TGA). Edytowalne źródło: scripts/create-duotone-icons.ps1. Ikony umiejętności nadal pochodzą z WoW.

Akcje: Action Slot, Emote, Map & Quests, Backpack, Character, Spellbook i Screen Reader. Starszy identyfikator World Map pozostaje ukrytym aliasem dla zgodności przypisań.

Screen Reader domyślnie jest OFF. Umieść go razem z Action Slot na aktywnej stronie i kliknij, aby zezwolić na odczyt. Przechwytywanie działa tylko przy aktywnym oknie WoW. Zamknięcie gry lub usunięcie ostatniego wymaganego przycisku wyłącza czytnik; ponowne uruchomienie wymaga kliknięcia. Mechanizm dzierżawy zatrzymuje osierocony proces. Plugin, obsługa klawiatury i odczyt SavedVariables działają niezależnie od tego przełącznika.

Ikona przy minimapie otwiera edytor stref; można ją przeciągać wokół minimapy. Polecenie /dbzones również otwiera edytor, a /dbcheck sprawdza przypisania. Wybierz strefę, przypnij ją do standardowego paska, przesuń, zmień rozmiar lub obróć o 90 stopni. Po zamknięciu edytora obrysy znikają, małe znaczniki pozostają widoczne do odczytu. Niestandardowe paski wymagają osobnej weryfikacji. Globus wyświetla adres https://citru5kick.pl do skopiowania.

Plugin używa com.deckbridge.wow.dev, addonu DeckBridgeDev i bazy DeckBridgeDevDB. Przy aktualizacji zachowaj te identyfikatory techniczne i istniejące SavedVariables.

Kontrole automatyczne obejmują TypeScript, kompilację DEV, składnię JS, manifest i kompletność paczki. Testy z atrapami lub syntetycznymi danymi nie potwierdzają działania Lua w grze, odczytu prawdziwego ekranu ani urządzenia. Te elementy wymagają testu ręcznego.

Aktualizacja, odinstalowanie i rozwiązywanie problemów: [podręcznik użytkownika](USER-GUIDE.pl.md). Manifest wydania nie konfiguruje debuggera Node.js.
