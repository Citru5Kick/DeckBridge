# Privacy / Prywatność

## English

The Screen Reader is OFF after plugin startup. An explicit button press is required. It captures pixels from the foreground WoW client to locate and decode addon markers; initial discovery scans a larger game image, then cached marker regions are sampled. Closing the tracked game process or removing the required controls revokes capture consent. No screenshot upload or screenshot recording is implemented by the reader. This statement describes project code, not the policies of external services.

The keyboard helper is separate and sends fixed key combinations to foreground WoW. The plugin reads the selected or discovered addon SavedVariables file, which can contain character, realm and specialization data. Screen Reader OFF does not stop those functions.

Ability icon identifiers/names are used for requests to `github.com/wowdev/wow-listfile` and `wow.zamimg.com`; redirects to approved GitHub asset hosts are allowed. Those servers receive normal network request information, including your IP. Icon mapping and images are cached under `%USERPROFILE%/.deckbridge-dev/icons-v1`. Property inspectors load `https://sdpi-components.dev/releases/v4/sdpi-components.js`, a remote executable script with its own availability and trust requirements. No analytics endpoint is configured in project code.

The inspector script has a pinned Subresource Integrity hash. Unexpectedly changed script contents are blocked; the request still reaches the external service.

The in-game globe displays the author's website address for copying; opening it manually is optional. Do not submit SavedVariables, account directory names, profile exports, screenshots with personal data or unredacted logs in public bug reports.

## Polski

Czytnik domyślnie jest OFF i wymaga kliknięcia. Odczytuje piksele aktywnego okna WoW: przy wykrywaniu większy obraz gry, później zapamiętane obszary znaczników. Zamknięcie śledzonego procesu gry lub usunięcie wymaganych przycisków cofa zgodę. Kod czytnika nie zapisuje zrzutów ani nie wysyła ich do sieci. Nie jest to deklaracja polityki usług zewnętrznych.

Proces klawiatury działa niezależnie i wysyła ustalone skróty do aktywnego WoW. Plugin odczytuje wybrany lub wykryty plik SavedVariables z informacjami o postaci, serwerze i specjalizacji. Wyłączenie czytnika nie wyłącza tych funkcji.

Pobieranie ikon korzysta z GitHub wow-listfile i wow.zamimg.com oraz zatwierdzonych przekierowań GitHub. Serwisy otrzymują m.in. adres IP i dane żądania ikony. Pamięć podręczna znajduje się w `%USERPROFILE%/.deckbridge-dev/icons-v1`. Inspektory ustawień ładują zewnętrzny skrypt sdpi-components.dev. Kod projektu nie konfiguruje analityki. Globus pokazuje adres strony autora do samodzielnego otwarcia.

Skrypt inspektora ma przypięty hash Subresource Integrity. Niespodziewanie zmieniona treść zostanie zablokowana; żądanie nadal trafia do zewnętrznego serwisu.

Do publicznych zgłoszeń nie dołączaj SavedVariables, nazw kont, eksportów profili ani niezanonimizowanych logów i zrzutów.
