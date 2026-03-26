const SYMBOLS = [
  { s:'🎰', w:22, p:[0,0,5,15,40,100,300] },
  { s:'🍒', w:20, p:[0,0,6,18,45,120,350] },
  { s:'🔔', w:18, p:[0,0,8,22,55,150,400] },
  { s:'🍀', w:15, p:[0,0,10,28,70,200,500] },
  { s:'🍋', w:10, p:[0,0,15,40,100,300,700] },
  { s:'🍊', w:7,  p:[0,0,25,60,180,500,1000] },
  { s:'🍇', w:5,  p:[0,0,40,100,300,800,1500] },
  { s:'💎', w:3,  p:[0,0,60,200,500,1500,3000] },
  { s:'🌟', w:1,  p:[0,0,100,400,1000,3000,10000], bonus:true },
];
const MULT = [1,2,3,5,10,20];
const REELS = 6;
const ROWS = 5;
const BASE = 5;
const DURATION = 20 * 60 * 1000;

let numP = 2;
let state = 'menu';
let timer = null;
let timeLeft = DURATION;
let players = [];
let gpAssignments = [];
let nextPlayerToJoin = 0;
let menuSel = 2;
let gameStarted = false;
let audioCtx = null;

function initAudio() {
  if(!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if(!audioCtx) initAudio();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  switch(type) {
    case 'spin':
      osc.frequency.value = 200;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
      break;
    case 'win':
      osc.frequency.value = 523;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 659;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);
      break;
    case 'bigwin':
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.connect(g);
          g.connect(audioCtx.destination);
          o.frequency.value = freq;
          o.type = 'sine';
          g.gain.setValueAtTime(0.15, audioCtx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          o.start();
          o.stop(audioCtx.currentTime + 0.4);
        }, i * 150);
      });
      break;
    case 'bonus':
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 1100;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.5);
      }, 250);
      break;
    case 'click':
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
      break;
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function initMenu() {
  createFallingStars();
  document.querySelectorAll('.player-option').forEach(btn => {
    btn.addEventListener('click', () => selectPlayers(parseInt(btn.dataset.p)));
  });
  document.getElementById('back-menu').onclick = () => {
    state = 'menu';
    gameStarted = false;
    if(timer) clearInterval(timer);
    gpAssignments = [];
    nextPlayerToJoin = 0;
    showScreen('menu-screen');
  };
  showScreen('menu-screen');
}

function createFallingStars() {
  const container = document.getElementById('falling-stars');
  container.innerHTML = '';
  const count = 15;
  for(let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'falling-star';
    star.textContent = '🌟';
    star.style.left = Math.random() * 100 + '%';
    star.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
    star.style.animationDuration = (8 + Math.random() * 6) + 's';
    star.style.animationDelay = Math.random() * 10 + 's';
    star.style.opacity = 0.2 + Math.random() * 0.3;
    container.appendChild(star);
  }
}

function selectPlayers(n) {
  numP = n;
  menuSel = n;
  document.querySelectorAll('.player-option').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.p) === n);
  });
  gpAssignments = [];
  nextPlayerToJoin = 0;
  state = 'join';
  updateJoinScreen();
  showScreen('join-screen');
}

function updateJoinScreen() {
  const container = document.getElementById('join-players');
  container.innerHTML = '';
  
  for(let i=0; i<numP; i++) {
    const div = document.createElement('div');
    div.className = 'join-player';
    const isJoined = i < nextPlayerToJoin;
    const isWaiting = i === nextPlayerToJoin;
    div.classList.add(isJoined ? 'ready' : 'waiting');
    div.innerHTML = `
      <span class="jp-name" style="color:var(--p${i+1})">JUGADOR ${i+1}</span>
      <span class="jp-status">${isJoined ? '✓ Conectado' : isWaiting ? 'Presiona A...' : 'Esperando...'}</span>
    `;
    container.appendChild(div);
  }
  
  document.getElementById('join-hint').textContent = 
    nextPlayerToJoin >= numP ? '¡Todos listos!' : `Esperando jugador ${nextPlayerToJoin + 1}...`;
}

function tryJoinGame(gpIdx) {
  if(state !== 'join') return;
  if(gpAssignments.includes(gpIdx)) return;
  if(nextPlayerToJoin >= numP) return;
  
  gpAssignments[nextPlayerToJoin] = gpIdx;
  nextPlayerToJoin++;
  updateJoinScreen();
  
  if(nextPlayerToJoin >= numP) {
    setTimeout(startGame, 1000);
  }
}

function getRandomSymbol(excludeBonus = false) {
  let available = SYMBOLS;
  if(excludeBonus) {
    available = SYMBOLS.filter(s => !s.bonus);
  }
  const weights = available.map(s => s.w);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for(let i = 0; i < available.length; i++) {
    random -= weights[i];
    if(random <= 0) {
      return SYMBOLS.indexOf(available[i]);
    }
  }
  return SYMBOLS.indexOf(available[available.length - 1]);
}

function startGame() {
  if(state === 'playing' || gameStarted) return;
  gameStarted = true;

  players = [];
  for(let i=0; i<numP; i++) {
    players.push({
      balance: 1000,
      mult: 1,
      spinning: false,
      reelVals: [],
      wins: 0,
      spins: 0,
      history: [],
      freeSpins: 0,
      freeSpinsTotal: 0,
      freeSpinsWins: 0,
      autoPlaying: false,
      spinType: Math.random() < 0.5 ? 'blur' : 'vertical'
    });
  }
  
  buildGameUI();
  showScreen('game-screen');
  updateScoreboard();
  startTimer();
}

function buildGameUI() {
  const grid = document.getElementById('players-grid');
  grid.innerHTML = '';
  grid.className = 'players-grid';
  
  if(numP === 1) grid.classList.add('p1');
  else if(numP === 2) grid.classList.add('p2-v');
  else if(numP === 3) grid.classList.add('p3');
  else grid.classList.add('p4');

  players.forEach((p, idx) => {
    const cell = document.createElement('div');
    cell.className = 'player-cell';
    
    const panel = document.createElement('div');
    panel.className = `player-panel p${idx+1}c`;
    panel.id = `panel-${idx}`;
    
    const gpIdx = gpAssignments[idx];
    const gpDisplay = gpIdx !== undefined ? `GP${gpIdx+1}` : '—';
    
    panel.innerHTML = `
      <div class="player-top">
        <div class="player-info">
          <span class="pname">JUGADOR ${idx+1}</span>
          <span class="pgp-badge">${gpDisplay}</span>
        </div>
        <span class="pbalance" id="bal-${idx}">$${p.balance}</span>
      </div>
      <div class="spin-counter">TIRADAS: <span id="spins-${idx}">0</span></div>
      <div class="reels-wrapper">
        <div class="reels-area" id="reels-${idx}"></div>
      </div>
      <div class="controls-area">
        <div class="mult-row" id="mult-row-${idx}">
          ${MULT.map(m => `<button class="cbtn${m===1?' selected':''}" data-m="${m}" onclick="setMult(${idx},${m})">x${m}</button>`).join('')}
        </div>
        <div class="lever-container"><div class="lever" id="lever-${idx}" onclick="leverPull(${idx})"><div class="lever-knob"></div><div class="lever-stick"></div><div class="lever-base"></div></div></div>
      </div>
      <div class="winpopup" id="wp-${idx}"><div class="wtext">+$$0</div></div>
    `;
    
    cell.appendChild(panel);
    grid.appendChild(cell);

    const reelsC = document.getElementById(`reels-${idx}`);
    p.reelVals = [];
    
    for(let r=0; r<REELS; r++) {
      const reel = document.createElement('div');
      reel.className = 'reel';
      const inner = document.createElement('div');
      inner.className = 'reel-inner';
      inner.id = `ri-${idx}-${r}`;
      
      const col = [];
      for(let row=0; row<ROWS; row++) {
        const si = getRandomSymbol();
        col.push(si);
        const sym = document.createElement('div');
        sym.className = 'sym';
        if(SYMBOLS[si].bonus) sym.classList.add('bonus-sym');
        sym.innerHTML = SYMBOLS[si].s;
        inner.appendChild(sym);
      }
      p.reelVals.push(col);
      reel.appendChild(inner);
      reelsC.appendChild(reel);
    }

    updatePlayerUI(idx);
  });

  buildPaytable();
}

function updatePlayerUI(idx) {
  const p = players[idx];
  document.getElementById(`bal-${idx}`).textContent = `$${p.balance}`;
  document.getElementById(`spins-${idx}`).textContent = p.spins;
  document.querySelectorAll(`#panel-${idx} .cbtn[data-m]`).forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.m) === p.mult);
  });
  
  const lever = document.getElementById(`lever-${idx}`);
  const disabled = p.spinning || totalBet(p) > p.balance || state !== 'playing';
  lever.classList.toggle('disabled', disabled);
  lever.classList.toggle('free', p.freeSpins > 0);
}

function updateScoreboard() {
  const sb = document.getElementById('scoreboard');
  sb.innerHTML = '';
  players.forEach((p, idx) => {
    const d = document.createElement('div');
    d.className = 'pscore';
    d.innerHTML = `P${idx+1}: <span>$${p.balance}</span>`;
    sb.appendChild(d);
  });
}

function buildPaytable() {
  const list = document.getElementById('paytable-list');
  list.innerHTML = '';
  
  SYMBOLS.forEach(s => {
    const row = document.createElement('div');
    row.className = `pay-row${s.bonus ? ' bonus-row' : ''}`;
    row.dataset.sym = SYMBOLS.indexOf(s);
    row.innerHTML = `
      <div class="sym-box"><span class="sym">${s.s}</span></div>
      <span class="payouts">${s.p.slice(2).join(' / ')}</span>
    `;
    list.appendChild(row);
  });
}

function highlightPaytableRows(winSymbols) {
  document.querySelectorAll('.pay-row').forEach(r => r.classList.remove('highlight'));
  winSymbols.forEach(si => {
    const row = document.querySelector(`.pay-row[data-sym="${si}"]`);
    if(row) row.classList.add('highlight');
  });
}

function totalBet(p) {
  return BASE * p.mult;
}

function leverPull(idx) {
  const p = players[idx];
  const lever = document.getElementById(`lever-${idx}`);
  if(p.spinning || totalBet(p) > p.balance || state !== 'playing' || lever.classList.contains('pulled')) return;
  
  lever.classList.add('pulled');
  spin(idx);
}

function leverUp(idx) {
  const lever = document.getElementById(`lever-${idx}`);
  if(lever) lever.classList.remove('pulled');
}

function setMult(idx, m) {
  players[idx].mult = m;
  updatePlayerUI(idx);
  playSound('click');
}

function cycleMult(idx) {
  const current = players[idx].mult;
  const idxM = MULT.indexOf(current);
  const nextM = MULT[(idxM + 1) % MULT.length];
  setMult(idx, nextM);
}

function updateActivePanel(idx) {
  document.querySelectorAll('.player-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${idx}`).classList.add('active');
}

function showWin(idx, amt) {
  const wp = document.getElementById(`wp-${idx}`);
  wp.querySelector('.wtext').textContent = `+$${amt}`;
  wp.classList.add('show');
  wp.style.animation = 'none';
  wp.offsetHeight;
  wp.style.animation = 'winPopup .5s ease-out';
  setTimeout(() => wp.classList.remove('show'), 2500);
}

function hideWin(idx) {
  const wp = document.getElementById(`wp-${idx}`);
  wp.classList.remove('show');
}

function spawnParticles() {
  const emojis = ['✨', '💰', '⭐', '🌟', '💎', '🎰', '🍒', '🔔'];
  for(let i=0; i<20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = (20 + Math.random() * 60) + '%';
    p.style.top = (20 + Math.random() * 60) + '%';
    const angle = Math.random() * Math.PI * 2;
    const dist = 150 + Math.random() * 200;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    p.style.fontSize = (1.2 + Math.random() * 0.8) + 'rem';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

function shakeScreen() {
  document.body.style.animation = 'screenShake .3s';
  setTimeout(() => document.body.style.animation = '', 300);
}

function showBonusNotify(count) {
  const notify = document.getElementById('bonus-notify');
  document.getElementById('bonus-info').textContent = `+${count} GIROS GRATIS`;
  notify.classList.add('show');
  setTimeout(() => notify.classList.remove('show'), 2500);
}

let bonusSuspenseEl = null;

function showBonusSuspense() {
  if(bonusSuspenseEl) return; // Ya existe
  
  bonusSuspenseEl = document.createElement('div');
  bonusSuspenseEl.className = 'bonus-suspense show';
  bonusSuspenseEl.innerHTML = `
    <div class="star-icon">🌟</div>
    <div class="missing-text">¡FALTA 1!</div>
  `;
  document.body.appendChild(bonusSuspenseEl);
  
  // Sonido de suspenso
  if(audioCtx) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  }
}

function hideBonusSuspense() {
  if(bonusSuspenseEl) {
    bonusSuspenseEl.remove();
    bonusSuspenseEl = null;
  }
}

function clearWinnerAnimations(pIdx) {
  document.querySelectorAll(`#panel-${pIdx} .sym`).forEach(s => {
    s.classList.remove('winner', 'big-win');
  });
  document.querySelectorAll(`#panel-${pIdx} .reel`).forEach(r => {
    r.classList.remove('winner');
  });
}

function animateReelWinners(pIdx, winningPositions) {
  if(!winningPositions || winningPositions.length === 0) return;
  const uniqueReels = new Set(winningPositions.map(p => p.reel));
  
  winningPositions.forEach(pos => {
    const reelPositions = winningPositions.filter(p => p.reel === pos.reel);
    const reelEl = document.querySelectorAll(`#reels-${pIdx} .reel`)[pos.reel];
    if(uniqueReels.size >= 3) reelEl.classList.add('winner');
    
    const symEl = document.querySelectorAll(`#ri-${pIdx}-${pos.reel} .sym`)[pos.row];
    if(symEl) {
      symEl.classList.add('winner');
      if(winningPositions.length >= 5) {
        symEl.classList.add('big-win');
      }
    }
  });
}

function startTimer() {
  timeLeft = DURATION;
  state = 'playing';
  
  timer = setInterval(() => {
    timeLeft -= 1000;
    const mins = Math.floor(timeLeft / 60000);
    const secs = Math.floor((timeLeft % 60000) / 1000);
    const display = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    document.getElementById('timer').textContent = display;
    
    const timerEl = document.getElementById('timer');
    if(timeLeft <= 60000) {
      timerEl.classList.add('warning');
    } else {
      timerEl.classList.remove('warning');
    }
    
    if(timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  state = 'ended';
  clearInterval(timer);
  
  let max = -1, winner = 0;
  players.forEach((p, i) => { if(p.balance > max) { max = p.balance; winner = i; } });
  
  document.getElementById('w-name').textContent = `JUGADOR ${winner + 1}`;
  document.getElementById('w-score').textContent = `$${max}`;
  
  const scoresDiv = document.getElementById('scores-final');
  scoresDiv.innerHTML = '';
  players.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'score-final-item';
    item.innerHTML = `P${i+1}: <span>$${p.balance}</span>`;
    scoresDiv.appendChild(item);
  });
  
  showScreen('end-screen');
}

function updateHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  
  const allEntries = [];
  players.forEach((p, pIdx) => {
    p.history.slice(0, 20).forEach(h => {
      allEntries.push({ ...h, player: pIdx });
    });
  });
  
  allEntries.sort((a, b) => b.spin - a.spin);
  
  allEntries.slice(0, 30).forEach(h => {
    const item = document.createElement('div');
    const isWin = h.amount > 0;
    item.className = `history-item ${isWin ? 'win' : 'lose'}`;
    item.innerHTML = `
      <span class="spin-num">P${h.player+1}#${h.spin}</span>
      <span class="amount">${h.amount >= 0 ? '+' : ''}$${h.amount}</span>
      ${h.isBonus ? '<span class="bonus-label">FREE</span>' : ''}
    `;
    list.appendChild(item);
  });
}

function countBonusSymbols(grid) {
  let count = 0;
  for(let r=0; r<REELS; r++) {
    for(let row=0; row<ROWS; row++) {
      if(SYMBOLS[grid[r][row]].bonus) count++;
    }
  }
  return count;
}

function spin(pIdx) {
  const p = players[pIdx];
  if(p.spinning) return;
  
  if(p.freeSpins > 0) {
    p.freeSpins--;
    p.spinning = true;
    updatePlayerUI(pIdx);
    doFreeSpin(pIdx);
    return;
  }
  
  if(totalBet(p) > p.balance) return;
  
  p.spinning = true;
  p.balance -= totalBet(p);
  p.spins++;
  updatePlayerUI(pIdx);
  updateScoreboard();
  hideWin(pIdx);
  clearWinnerAnimations(pIdx);

  const final = [];
  for(let r=0; r<REELS; r++) {
    const col = [];
    for(let row=0; row<ROWS; row++) {
      col.push(getRandomSymbol());
    }
    final.push(col);
  }

  const pr = [];
  for(let r=0; r<REELS; r++) pr.push(animReel(pIdx, r, final[r], r * 80));
  
  Promise.all(pr).then(() => {
    p.reelVals = final;
    p.spinning = false;
    leverUp(pIdx);
    
    const bonusCount = countBonusSymbols(final);
    
    // Mostrar suspenso si hay exactamente 2 bonus symbols
    if(bonusCount === 2) {
      showBonusSuspense();
    }
    
    if(bonusCount >= 3) {
      playSound('bonus');
      const freeSpinsEarned = 10 + (bonusCount - 3) * 2;
      p.freeSpins = freeSpinsEarned;
      p.freeSpinsTotal = freeSpinsEarned;
      p.freeSpinsWins = 0;
      hideBonusSuspense();
      showBonusNotify(freeSpinsEarned);
      shakeScreen();
      updatePlayerUI(pIdx);
      
      setTimeout(() => {
        p.autoPlaying = true;
        doFreeSpin(pIdx);
      }, 2500);
    } else if(bonusCount < 2) {
      // Ocultar suspenso si no hay suficientes estrellas
      hideBonusSuspense();
    }
    
    const result = evaluateWinAll(pIdx);
    
    if(result.totalWin > 0) {
      if(p.freeSpins > 0) {
        p.freeSpinsWins += result.totalWin;
      } else {
        p.balance += result.totalWin;
        p.wins += result.totalWin;
        showWin(pIdx, result.totalWin);
        spawnParticles();
        if(result.totalWin >= 100) {
          playSound('bigwin');
          shakeScreen();
          animateReelWinners(pIdx, result.winningPositions);
        } else {
          playSound('win');
          animateReelWinners(pIdx, result.winningPositions);
        }
      }
      highlightPaytableRows(result.winningSymbols);
    }
    
    p.history.unshift({ spin: p.spins, amount: result.totalWin - totalBet(p), isBonus: false });
    updateHistory();
    updatePlayerUI(pIdx);
    updateScoreboard();
  });
}

function doFreeSpin(pIdx) {
  const p = players[pIdx];
  if(p.freeSpins <= 0 || state !== 'playing') {
    if(p.autoPlaying) {
      p.autoPlaying = false;
      if(p.freeSpinsWins > 0) {
        p.balance += p.freeSpinsWins;
        p.wins += p.freeSpinsWins;
        showWin(pIdx, p.freeSpinsWins);
        spawnParticles();
        p.history.unshift({ spin: p.spins, amount: p.freeSpinsWins, isBonus: true });
        updateHistory();
        updatePlayerUI(pIdx);
        updateScoreboard();
      }
    }
    return;
  }
  
  p.spinning = true;
  updatePlayerUI(pIdx);

  const final = [];
  for(let r=0; r<REELS; r++) {
    const col = [];
    for(let row=0; row<ROWS; row++) {
      col.push(getRandomSymbol(true));
    }
    final.push(col);
  }

  const pr = [];
  for(let r=0; r<REELS; r++) pr.push(animReel(pIdx, r, final[r], r * 60));
  
  Promise.all(pr).then(() => {
    p.reelVals = final;
    p.spinning = false;
    leverUp(pIdx);
    
    const result = evaluateWinAll(pIdx);
    
    if(result.totalWin > 0) {
      p.freeSpinsWins += result.totalWin;
      highlightPaytableRows(result.winningSymbols);
      if(result.totalWin >= 50) {
        playSound('win');
        animateReelWinners(pIdx, result.winningPositions);
      }
    }
    
    p.history.unshift({ spin: p.spins, amount: result.totalWin, isBonus: true });
    updateHistory();
    updatePlayerUI(pIdx);
    updateScoreboard();
    
    if(p.freeSpins > 0) {
      setTimeout(() => doFreeSpin(pIdx), 500);
    } else {
      setTimeout(() => doFreeSpin(pIdx), 1500);
    }
  });
}

function animReel(pIdx, reelIdx, finalSyms, delay) {
  return new Promise(res => {
    const inner = document.getElementById(`ri-${pIdx}-${reelIdx}`);
    if(!inner) return res();
    
    const spinType = players[pIdx].spinType;
    const spinClass = spinType === 'blur' ? 'spinning-blur' : 'spinning-vertical';
    inner.classList.add(spinClass);
    playSound('spin');
    
    setTimeout(() => {
      inner.classList.remove(spinClass);
      inner.innerHTML = '';
      finalSyms.forEach((si, row) => {
        const sym = document.createElement('div');
        sym.className = 'sym';
        if(SYMBOLS[si].bonus) {
          sym.classList.add('bonus-sym');
          // Marcar como near-miss si hay exactamente 2 bonus en total
          if(bonusSuspenseEl) {
            sym.classList.add('near-miss');
          }
        }
        sym.innerHTML = SYMBOLS[si].s;
        inner.appendChild(sym);
      });
      res();
    }, 400 + reelIdx * 50);
  });
}

function evaluateWinAll(pIdx) {
  const p = players[pIdx];
  let total = 0;
  let winningSymbols = new Set();
  let winningPositions = [];
  
  const counted = new Set();
  
  for(let row=0; row<ROWS; row++) {
    const firstSym = p.reelVals[0][row];
    let consecutive = 1;
    
    for(let r=1; r<REELS; r++) {
      if(p.reelVals[r][row] === firstSym) {
        consecutive++;
      } else {
        break;
      }
    }
    
    if(consecutive >= 3) {
      const win = SYMBOLS[firstSym].p[consecutive] * p.mult;
      total += win;
      winningSymbols.add(firstSym);
      for(let r=0; r<consecutive; r++) {
        const k = `${r},${row}`;
        if(!counted.has(k)) {
          counted.add(k);
          winningPositions.push({ reel: r, row: row });
        }
      }
    }
  }
  
  for(let row=0; row<ROWS; row++) {
    const firstSym = p.reelVals[0][row];
    let consecutive = 1;
    
    for(let r=1; r<REELS; r++) {
      const nextRow = row + r;
      if(nextRow >= ROWS) break;
      if(p.reelVals[r][nextRow] === firstSym) {
        consecutive++;
      } else {
        break;
      }
    }
    
    if(consecutive >= 3) {
      const win = SYMBOLS[firstSym].p[consecutive] * p.mult;
      total += win;
      winningSymbols.add(firstSym);
      for(let r=0; r<consecutive; r++) {
        const k = `${r},${row+r}`;
        if(!counted.has(k)) {
          counted.add(k);
          winningPositions.push({ reel: r, row: row+r });
        }
      }
    }
  }
  
  for(let row=ROWS-1; row>=0; row--) {
    const firstSym = p.reelVals[0][row];
    let consecutive = 1;

    for(let r=1; r<REELS; r++) {
      const nextRow = row - r;
      if(nextRow < 0) break;
      if(p.reelVals[r][nextRow] === firstSym) {
        consecutive++;
      } else {
        break;
      }
    }

    if(consecutive >= 3) {
      const win = SYMBOLS[firstSym].p[consecutive] * p.mult;
      total += win;
      winningSymbols.add(firstSym);
      for(let r=0; r<consecutive; r++) {
        const k = `${r},${row-r}`;
        if(!counted.has(k)) {
          counted.add(k);
          winningPositions.push({ reel: r, row: row-r });
        }
      }
    }
  }

  // Línea en zigzag (V pattern): fila 2 -> fila 4 -> fila 2 -> fila 4 -> fila 2 -> fila 4
  const zigzagRows = [2, 4, 2, 4, 2, 4];
  const firstSymZig = p.reelVals[0][zigzagRows[0]];
  let consecZig = 1;
  for(let r=1; r<REELS; r++) {
    if(p.reelVals[r][zigzagRows[r]] === firstSymZig) {
      consecZig++;
    } else {
      break;
    }
  }
  if(consecZig >= 3) {
    const win = SYMBOLS[firstSymZig].p[consecZig] * p.mult;
    total += win;
    winningSymbols.add(firstSymZig);
    for(let r=0; r<consecZig; r++) {
      const k = `${r},${zigzagRows[r]}`;
      if(!counted.has(k)) {
        counted.add(k);
        winningPositions.push({ reel: r, row: zigzagRows[r] });
      }
    }
  }

  // Línea en zigzag inverso (Λ pattern): fila 0 -> fila 2 -> fila 0 -> fila 2 -> fila 0 -> fila 2
  const zigzag2Rows = [0, 2, 0, 2, 0, 2];
  const firstSymZig2 = p.reelVals[0][zigzag2Rows[0]];
  let consecZig2 = 1;
  for(let r=1; r<REELS; r++) {
    if(p.reelVals[r][zigzag2Rows[r]] === firstSymZig2) {
      consecZig2++;
    } else {
      break;
    }
  }
  if(consecZig2 >= 3) {
    const win = SYMBOLS[firstSymZig2].p[consecZig2] * p.mult;
    total += win;
    winningSymbols.add(firstSymZig2);
    for(let r=0; r<consecZig2; r++) {
      const k = `${r},${zigzag2Rows[r]}`;
      if(!counted.has(k)) {
        counted.add(k);
        winningPositions.push({ reel: r, row: zigzag2Rows[r] });
      }
    }
  }

  return { totalWin: total, winningSymbols: Array.from(winningSymbols), winningPositions: winningPositions };
}

function countConsecutive(syms) {
  if(syms.length === 0) return { symbol: undefined, count: 0 };
  const first = syms[0];
  let count = 1;
  for(let i = 1; i < syms.length; i++) {
    if(syms[i] === first) count++;
    else break;
  }
  return { symbol: first, count: count };
}

// Gamepad
let prevGPState = {};

function gameLoop() {
  const gamepads = navigator.getGamepads();
  
  for(let i=0; i<gamepads.length; i++) {
    const gp = gamepads[i];
    if(!gp) continue;
    
    const prev = prevGPState[i] || {};
    const axPressed = gp.buttons[0] && gp.buttons[0].pressed;
    const yPressed = gp.buttons[3] && gp.buttons[3].pressed;
    const startPressed = gp.buttons[9] && gp.buttons[9].pressed;
    
    if(axPressed && !prev.ax) {
      if(state === 'join') {
        tryJoinGame(i);
      } else if(state === 'playing') {
        const pIdx = gpAssignments.indexOf(i);
        if(pIdx !== -1) spin(pIdx);
      }
    }

    if(yPressed && !prev.y) {
      if(state === 'playing') {
        const pIdx = gpAssignments.indexOf(i);
        if(pIdx !== -1) cycleMult(pIdx);
      }
    }

    if(startPressed && !prev.start) {
      if(state === 'join' && nextPlayerToJoin >= numP) {
        startGame();
      }
    }

    if(state === 'menu') {
      const left = gp.buttons[14] && gp.buttons[14].pressed || (gp.axes[0] < -0.5 && !prev.axisLeft);
      const right = gp.buttons[15] && gp.buttons[15].pressed || (gp.axes[0] > 0.5 && !prev.axisRight);
      if(left && !prev.left && menuSel > 1) selectPlayers(menuSel - 1);
      if(right && !prev.right && menuSel < 4) selectPlayers(menuSel + 1);
      prev.left = left;
      prev.right = right;
      prev.axisLeft = gp.axes[0] < -0.5;
      prev.axisRight = gp.axes[0] > 0.5;
    }

    if(state === 'playing') {
      const pIdx = gpAssignments.indexOf(i);
      if(pIdx !== -1) {
        const up = gp.buttons[12] && gp.buttons[12].pressed || (gp.axes[1] < -0.5 && !prev.gpUp);
        const down = gp.buttons[13] && gp.buttons[13].pressed || (gp.axes[1] > 0.5 && !prev.gpDown);
        if(up && pIdx > 0) updateActivePanel(pIdx - 1);
        if(down && pIdx < numP - 1) updateActivePanel(pIdx + 1);
        prev.gpUp = gp.axes[1] < -0.5;
        prev.gpDown = gp.axes[1] > 0.5;
      }
    }

    prevGPState[i] = {
      ax: axPressed,
      y: yPressed,
      start: startPressed,
      left: prev.left, right: prev.right,
      axisLeft: gp.axes[0] < -0.5, axisRight: gp.axes[0] > 0.5,
      gpUp: prev.gpUp, gpDown: prev.gpDown
    };
  }

  if(state === 'playing' || state === 'menu' || state === 'join') {
    requestAnimationFrame(gameLoop);
  }
}

// Keyboard
document.addEventListener('keydown', e => {
  if(state === 'menu') {
    if(e.key === 'ArrowLeft' && menuSel > 1) selectPlayers(menuSel - 1);
    if(e.key === 'ArrowRight' && menuSel < 4) selectPlayers(menuSel + 1);
    if(e.key === 'Enter' || e.key === ' ') selectPlayers(numP);
  } else if(state === 'join') {
    if(e.key === 'Enter' || e.key === ' ') tryJoinGame(-1);
  } else if(state === 'playing') {
    if(e.key === 'Enter' || e.key === ' ') spin(0);
    if(e.key === 'Tab' || e.key === 'm' || e.key === 'M') cycleMult(0);
  }
});

window.addEventListener('gamepadconnected', e => console.log('GP connected:', e.gamepad.id));
window.addEventListener('gamepaddisconnected', e => console.log('GP disconnected:', e.gamepad.id));

document.addEventListener('click', () => initAudio(), { once: true });

document.addEventListener('click', e => {
  if(e.target.matches('button, .player-option')) {
    playSound('click');
  }
});

initMenu();
requestAnimationFrame(gameLoop);
