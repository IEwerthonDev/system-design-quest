# Validation: vercel-judge

**Status:** PASS (smoke + unit gates)  
**Branch:** `feature/vercel-judge`  
**Preview:** https://system-design-quest-4o5und3uf-spiral-out.vercel.app  
**Deployment:** `dpl_5xcs42kmn6JoeFiynFa4ZbC2DYAS`

## Evidence

| Check | Result |
| ----- | ------ |
| `npx nx run-many -t lint test --projects=shared,server,client` | PASS |
| Vercel build includes `λ api/judge` | PASS (23.9KB) |
| `POST /api/judge` (protection bypass) returns JudgeResult JSON | PASS (mock, score/verdict present) |
| Pressure reasons in shared + client tests | PASS |

## Notes

- Deployment Protection returns 401 without SSO/bypass; authenticated browser sessions work same-origin.
- Sessions/leaderboard remain out of scope on Hobby.
