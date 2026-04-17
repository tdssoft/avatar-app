# eavatar.diet — Avatar App
<!-- React + TypeScript + Vite → Vercel | Supabase self-hosted VPS 51.68.130.246 -->
<!-- Limit: trzymaj ten plik < 200 linii. Szczegóły → .claude/rules/ -->

## Auto-approve scope
- Edytuj dowolne pliki w: ./src, ./tests, ./supabase, ./scripts
- Uruchamiaj: npm run *, npx playwright *, git add, git commit, curl -s (readonly)
- NIGDY bez pytania: git push, operacje na produkcyjnej DB, reset środowiska

## Kiedy ZATRZYMAĆ SIĘ i zapytać użytkownika
1. `git push` — zawsze pytaj, nawet jeśli testy przeszły
2. Test E2E failuje 2 razy z rzędu — opisz błąd i zapytaj co dalej
3. INSERT/UPDATE/DELETE przez Supabase API na produkcji — potwierdź
4. Brakujące credentials / env variable — zapytaj, nie zgaduj
5. Błąd wymagający zmiany architektury — nie próbuj >3 iteracje, zapytaj

## Kontekst projektu
- Frontend: https://app.eavatar.diet (Vercel auto-deploy z main)
- Supabase URL: https://app.eavatar.diet | Service Role Key: w .env.vps
- Node.js: `export PATH="/Users/alanurban/.nvm/versions/node/v20.20.1/bin:$PATH"`
- Klient testowy: alan@tdssoft.pl / Admin1234!
- Admin: admin@eavatar.diet / Admin123!

## Workflow testów E2E
1. Zmiana → `git commit` (lokalnie, bezpieczne)
2. `BASE_URL=https://app.eavatar.diet npx playwright test <plik> --config=playwright.live.config.ts`
3. Pass → zapytaj użytkownika o git push | Fail → napraw (max 2 próby) → zapytaj

## Zasady bezpieczeństwa
- NIGDY nie pushuj do main bez potwierdzenia użytkownika
- NIGDY nie modyfikuj .env.local, .env.vps bez polecenia
- Nie commituj: .env*, *.pem, *_key*

## Aktualizacja pamięci
<!-- Po każdej sesji: nowe fakty o projekcie → ~/.claude/projects/-Users-alanurban-Documents/memory/MEMORY.md -->
Po zakończonym zadaniu zapisz do MEMORY.md: nowe tabele DB, zmienione adresy, naprawione bugi, nowe pliki kluczowe.

## Reguły modułowe (ładuj tylko gdy potrzebne)
@.claude/rules/supabase.md
@.claude/rules/testing.md
@.claude/rules/deployment.md
