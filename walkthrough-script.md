# Walkthrough script (≤ 5 minutes)

Record screen + voice, export as `walkthrough.mp4`.

| Time      | Section                                                                                  | What you say / show                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Intro & deliverables                                                                     | "Hi — this is the Applications Search take-home. Live URL: <paste>. Google Drive folder: <paste>. Source is in the Drive too." |
| 0:30–1:00 | Stack & repo tour                                                                        | Next.js 14 App Router, TypeScript, Tailwind, Supabase. Walk the folder tree. Mention migrations are split 001-004.            |
| 1:00–1:45 | Data model + indexes                                                                     | Open `001_schema.sql` then `002_indexes.sql`. Call out the weighted stored tsvector + GIN, and the two trigram indexes.       |
| 1:45–2:30 | RPC + ranking demo                                                                       | Open `004_search_fn.sql`, walk the `websearch_to_tsquery` + `ilike` OR, then in the live app type `sadia` and show ranking. |
| 2:30–3:15 | UX states                                                                                | Show: idle with recent searches, typing (inline spinner), loading (skeleton + stale results dimmed), results, empty → fuzzy, error. |
| 3:15–3:50 | URL sync + Cmd/K + keyboard nav                                                          | Show `?q=sadia`, refresh, then Cmd+K, then ↓/Enter.                                                                         |
| 3:50–4:25 | Auth gating proof                                                                        | Run the `curl` from the README that uses the anon key — show `[]`. Then sign in via magic link to prove the gate works.      |
| 4:25–4:50 | Performance evidence                                                                    | Show the table in §4 of the README and `assets/explain-after.txt`. Briefly explain why `%a%` still seq-scans.                |
| 4:50–5:00 | Limitations + next steps + thanks                                                         | Honest read of §5 and §6 from the README. Close with the Drive link.                                                          |

Total: 5:00.
