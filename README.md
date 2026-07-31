# SIDES — playtest table

**Play follows form.** A remote, browser-based table for playtesting **SIDES**, the 3–6 player shedding game where the shape of a card tells you how play moves.

## Play now

**Live:** https://mickmcconnell-ai.github.io/sides/

One person clicks **Host** and gets a 4-letter room code. Everyone else opens the same link, clicks **Join**, and types the code. It connects the players directly, peer-to-peer — no server, no accounts, no install. Empty seats fill with **AI bots**, so two founders can still run a real 3–6 handed game.

> Keep the host's tab open — the game lives on the host. If a guest drops, a bot quietly takes their seat and play continues.

## The rules (Core Test 03)

- **Ladder:** Line ▸ Triangle ▸ Square ▸ Pentagon ▸ Hexagon. More sides sit higher.
- **Step** — play the form one level above or below the active form. Up = clockwise, down = counter-clockwise. Sets form + direction, moves one seat.
- **Stack** — play one or more *exact* matches of the active form. Direction holds. Moves one seat per card.
- **Circle** — wild, legal on any form. Name the next form, choose a direction. Moves one seat. Never stacks. (6 in the deck.)
- **Walls** — no wrap. At a Line you can only step up; at a Hexagon only down.
- **Blocked** — if you can't step, stack, or circle, draw one. Play it if legal, else pass.
- **Win** — first to empty their hand, even on a stack or circle.

86-card deck: 16 each of Line / Triangle / Square / Pentagon / Hexagon + 6 Circle. Deal 9 each. An optional **+1 starter-card** fairness variant is a toggle in the lobby.

## How it's built

A single self-contained `index.html` — engine, UI, AI bots, and networking in one file. Multiplayer is WebRTC via [PeerJS](https://peerjs.com/) over its public broker. The geometric card faces are inline SVG; the whole thing runs client-side.

## Verification

The rules engine is exercised headlessly in `test/test_engine.js`: it extracts the engine section from `index.html` and simulates thousands of randomized bot games, asserting perfect card conservation (always 86), only-legal moves, wall integrity, and guaranteed termination.

```
node test/test_engine.js
```

Last run: 8,000 games — 100% terminated, 0 illegal moves, 0 stalls, max 113 turns.

## Update / deploy

Pages serves `index.html` from the default branch. To change the game, edit `index.html` and push — Pages rebuilds automatically. To take the site down, make the repo private or delete it.

---

*Confidential working prototype — July 2026. Page carries a `noindex` tag; treat the URL as need-to-know.*
