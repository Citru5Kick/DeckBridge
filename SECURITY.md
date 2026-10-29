# Security

Do not post exploit details, credentials, SavedVariables or account data in public issues. Use GitHub's private vulnerability reporting for this repository once the maintainer has enabled it. If it is unavailable, first ask for a private reporting channel without including sensitive details.

No formal security audit or supported-version policy is claimed. Maintainer review is required before a security fix is released. See PRIVACY.md for local data access, screen capture and remote resources.

## Preventing credential leaks

Enable the local pre-commit check with `git config --local core.hooksPath .githooks`. It checks staged Git objects, including forced additions of ignored files. Run `npm run check:secrets` to check all reachable Git history. Known credential patterns are reported by file/rule only, without the matched value. This is a targeted check, not a guarantee that arbitrary secrets will be recognized.

The workflow performs the history check before installing dependencies, does not persist checkout credentials, pins actions to commit hashes and disables dependency install scripts. CI runs after a push; use the local hook and repository push protection to block leaks before publication. The `.env.example` exception is for placeholders only and is still scanned for credential patterns.

The settings component is loaded with a pinned Subresource Integrity hash. A changed response will be blocked until its contents and hash are reviewed. This does not remove the external service dependency.

`npm audit` currently flags GHSA-gcqx-w48m-w2h4 in the build-only `deepmerge` dependency used by the Node resolver. Upstream has no patched version; it is not bundled into the plugin runtime. Builds should not process untrusted dependency/configuration objects with credentials present. The CI audit blocks high and critical findings and retains lower-severity reports for review.

## Polski

Nie publikuj szczegółów podatności ani danych konta w publicznym zgłoszeniu. Użyj prywatnego zgłaszania podatności GitHuba, gdy autor je włączy. Jeśli jest niedostępne, poproś najpierw o prywatny kanał bez ujawniania szczegółów. Projekt nie deklaruje formalnego audytu bezpieczeństwa.

Lokalną kontrolę przed commitem włącza `git config --local core.hooksPath .githooks`; `npm run check:secrets` sprawdza całą dostępną historię Git. Kontrola wykrywa znane wzorce, nie dowolną tajną wartość. Nie wypisuje dopasowanych sekretów. CI uruchamia się dopiero po pushu, dlatego ochronę przed publikacją zapewniają lokalny hook i ochrona push na GitHubie. Szablony `.env.example` również podlegają sprawdzaniu treści.

Akcje CI są przypięte do SHA, poświadczenia checkout nie są utrwalane, a skrypty instalacyjne zależności są wyłączone. Skrypt ustawień ma przypięty hash SRI: zmieniona odpowiedź zostanie zablokowana do czasu przeglądu i aktualizacji hasha.

Audyt npm zgłasza GHSA-gcqx-w48m-w2h4 w buildowej zależności `deepmerge`, która nie trafia do wykonawczego pakietu pluginu. Brak poprawionej wersji upstream. Nie przetwarzaj niezaufanych zależności/konfiguracji w środowisku zawierającym poświadczenia. Audyt CI blokuje wysokie i krytyczne zgłoszenia; niższe pozostają widoczne do przeglądu.
