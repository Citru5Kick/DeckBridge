# Testing and compatibility

## Automated tests

Use Windows, Node.js 24 and the locked dependencies installed with `npm ci`. Run the build checks in README.md, then `npm test` for the seven JavaScript suites. They cover action routing, data parsing, icon-download limits, the marker protocol, reader lifecycle, utility actions and SDK schemas.

Run each PowerShell test in a separate process:

```powershell
powershell.exe -NoProfile -File scripts/test-dev-keys.ps1
powershell.exe -NoProfile -File scripts/test-live-reader.ps1
powershell.exe -NoProfile -File scripts/test-reader-lease.ps1
powershell.exe -NoProfile -File scripts/test-game-exit.ps1
```

These tests use fake processes/backends or synthetic images. They do not capture the desktop or send keys to the game. GitHub Actions runs the build and test checks on Windows. Results are available in the repository's Actions tab.

`node scripts/test-secrets.cjs` checks credential detection and staged Git objects. `npm run check:secrets` scans reachable history without printing matched secret values. Enable the local pre-commit check using `git config --local core.hooksPath .githooks`. CI also checks history, pins action versions and audits dependencies; see SECURITY.md for coverage and known findings.

## Manual smoke test

Check that Screen Reader starts OFF, Action Slot activates the selected ability, live icons update without /reload after capture is enabled, utility actions work, and closing WoW turns capture OFF. These checks passed for the 0.1.13 preview on the tested setup; they do not establish support for every system.

Clean installation, uninstallation, other upgrade paths, custom bars and additional DPI/display configurations still need wider coverage. The addon targets WoW Retail and declares Interface 120105. See README.md and USER-GUIDE.en.md for requirements and usage.

The dependency manifest overrides Zod to 4.6.6. Tests exercise actual SDK dependency schemas with this version. Compilation can report PURE annotation and circular-dependency warnings inside Zod while completing successfully.
