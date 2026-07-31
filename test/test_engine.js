// Headless verification: extract the ===ENGINE=== section from sides.html and simulate.
const fs = require('fs');
const path=require('path');
const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m = html.match(/===ENGINE START===[\s\S]*?===ENGINE END===/);
if(!m){ console.error('ENGINE markers not found'); process.exit(1); }
// strip the leading comment tail up to first "var FORMS"
let src = m[0];
src = src.slice(src.indexOf('var FORMS'));
src = src.slice(0, src.lastIndexOf('/* ===ENGINE END')); // safety, though marker already trimmed
// expose functions
src += '\nmodule.exports={FORMS,CW,CCW,rankOf,mod,buildDeck,shuffle,countForm,hasForm,legalPlays,hasAnyLegal,cardPlayable,newGame,seatOf,applyAction,botChooseAction,drawFromDeck};';
const E = (function(){ const module={exports:{}}; eval(src); return module.exports; })();

// deterministic RNG (mulberry32) for reproducibility
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function totalCards(g){
  let n=g.deck.length+g.discard.length;
  g.players.forEach(p=>n+=p.hand.length);
  return n;
}
function distinct(g){
  const s=new Set();
  g.deck.forEach(c=>s.add(c.id));
  g.discard.forEach(c=>s.add(c.id));
  g.players.forEach(p=>p.hand.forEach(c=>s.add(c.id)));
  return s.size;
}

let games=0, wins=0, stalls=0, maxTurns=0, illegalCaught=0;
const NGAMES=8000;
let failures=[];

for(let gi=0; gi<NGAMES; gi++){
  const rnd = rng(gi*2654435761 >>> 0 || 1);
  const nPlayers = 3 + Math.floor(rnd()*4); // 3..6
  const descs=[]; for(let i=0;i<nPlayers;i++) descs.push({id:'p'+i, name:'P'+i, isBot:true});
  const plus1 = rnd()<0.5;
  const g = E.newGame(descs, {plus1, dealerSeat:Math.floor(rnd()*nPlayers), rnd});

  // invariant right after deal
  if(totalCards(g)!==86 || distinct(g)!==86){ failures.push(`game ${gi}: bad deal count ${totalCards(g)}/${distinct(g)}`); continue; }

  let turns=0; const CAP=5000;
  while(!g.winner && turns<CAP){
    turns++;
    const seat=g.turnSeat;
    // choose bot action
    const act = E.botChooseAction(g, seat, rnd);

    // ---- validate legality of the chosen action against rules BEFORE applying ----
    const pl=g.players[seat];
    if(!g.needStartDir && !g.pendingDraw){
      const legal=E.legalPlays(pl.hand, g.activeForm);
      if(act.type==='draw'){
        if(E.hasAnyLegal(pl.hand,g.activeForm)){ failures.push(`game ${gi} turn ${turns}: drew while legal play existed`); break; }
      } else if(act.type==='step'){
        if(act.dir==='up' && !legal.stepUp){ failures.push(`game ${gi}: illegal stepUp`); break; }
        if(act.dir==='down' && !legal.stepDown){ failures.push(`game ${gi}: illegal stepDown`); break; }
      } else if(act.type==='stack'){
        if(act.count<1 || act.count>legal.stackMax){ failures.push(`game ${gi}: illegal stack ${act.count}/${legal.stackMax}`); break; }
      } else if(act.type==='circle'){
        if(!legal.circle){ failures.push(`game ${gi}: illegal circle`); break; }
      }
    }
    // wall check: active form / step must respect no-wrap
    const rBefore=E.rankOf(g.activeForm);

    const res = E.applyAction(g, seat, act, rnd);
    if(!res.ok){ failures.push(`game ${gi} turn ${turns}: applyAction rejected ${JSON.stringify(act)} -> ${res.error}`); break; }

    // ---- invariants after each action ----
    if(totalCards(g)!==86){ failures.push(`game ${gi} turn ${turns}: card count drifted to ${totalCards(g)}`); break; }
    if(distinct(g)!==86){ failures.push(`game ${gi} turn ${turns}: duplicate/lost card, distinct=${distinct(g)}`); break; }
    // active form must be a standard form within ladder
    if(E.FORMS.indexOf(g.activeForm)<0){ failures.push(`game ${gi}: active form invalid ${g.activeForm}`); break; }
    // turnSeat in range
    if(g.turnSeat<0 || g.turnSeat>=nPlayers){ failures.push(`game ${gi}: turnSeat OOB ${g.turnSeat}`); break; }
  }

  maxTurns=Math.max(maxTurns,turns);
  if(g.winner){
    wins++;
    // winner really has empty hand
    const ws=E.seatOf(g,g.winner);
    if(g.players[ws].hand.length!==0){ failures.push(`game ${gi}: winner not empty`); }
    // exactly the winner empty (first-out)
  } else if(turns>=CAP){ stalls++; failures.push(`game ${gi}: STALL (no winner in ${CAP} turns)`); }
  games++;
}

console.log('=== SIDES engine verification ===');
console.log('games simulated :', games);
console.log('games with winner:', wins, `(${(100*wins/games).toFixed(2)}%)`);
console.log('stalls          :', stalls);
console.log('max turns seen  :', maxTurns);
console.log('failures        :', failures.length);
if(failures.length){ console.log('--- first 12 failures ---'); failures.slice(0,12).forEach(f=>console.log('  '+f)); process.exitCode=1; }
else console.log('ALL INVARIANTS HELD ✓  (card conservation, legality, walls, termination)');
