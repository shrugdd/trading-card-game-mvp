const cardDefs = {
  node: {
    id: "node",
    name: "Node",
    type: "Node",
    cost: 0,
    image: "node_card.png",
    faction: "neutral",
    rules: "Exert Node to create one energy. (Node cannot exert again until the start of your next turn.)",
  },
  ancientBoar: {
    id: "ancientBoar",
    name: "Ancient Boar",
    type: "Creature",
    cost: 1,
    might: 3,
    toughness: 3,
    image: "ancient_boar_card.png",
    faction: "green",
    rules: "",
  },
  primordialGoo: {
    id: "primordialGoo",
    name: "Primordial Goo",
    type: "Creature",
    cost: 1,
    might: 2,
    toughness: 2,
    image: "primordial_goo_card.png",
    faction: "green",
    rules: "Whenever a creature with more might enters your battlefield, Primordial Goo gets a +1/+1 augment.",
  },
  shamanOfStrength: {
    id: "shamanOfStrength",
    name: "Shaman of Strength",
    type: "Creature",
    cost: 2,
    might: 4,
    toughness: 4,
    image: "shaman_of_strength_card.png",
    faction: "green",
    rules: "",
  },
  prodigalSorcerer: {
    id: "prodigalSorcerer",
    name: "Prodigal Sorcerer",
    type: "Creature",
    cost: 1,
    might: 2,
    toughness: 2,
    image: "prodigal_sorcerer_card.png",
    faction: "arcane",
    rules: "When you cast a spell, Prodigal Sorcerer gets a +1/+1 augment until end of turn.",
  },
  ignite: {
    id: "ignite",
    name: "Ignite",
    type: "Spell",
    cost: 1,
    image: "ignite_card.png",
    faction: "arcane",
    rules: "Target creature takes 3 damage.",
  },
  deathfireMage: {
    id: "deathfireMage",
    name: "Deathfire Mage",
    type: "Creature",
    cost: 2,
    might: 3,
    toughness: 3,
    image: "deathfire_mage_card.png",
    faction: "arcane",
    rules: "Your spells deal an extra point of damage while Deathfire Mage is on the battlefield.",
  },
};

const els = {
  status: document.querySelector("#status"),
  newGameBtn: document.querySelector("#newGameBtn"),
  exertAllBtn: document.querySelector("#exertAllBtn"),
  attackBtn: document.querySelector("#attackBtn"),
  endTurnBtn: document.querySelector("#endTurnBtn"),
  fxLayer: document.querySelector("#fxLayer"),
  log: document.querySelector("#log"),
  stackHint: document.querySelector("#stackHint"),
  turnBadge: document.querySelector("#turnBadge"),
  phaseCallout: document.querySelector("#phaseCallout"),
  playerLife: document.querySelector("#playerLife"),
  botLife: document.querySelector("#botLife"),
  playerDeck: document.querySelector("#playerDeck"),
  botDeck: document.querySelector("#botDeck"),
  playerHandCount: document.querySelector("#playerHandCount"),
  botHand: document.querySelector("#botHand"),
  playerEnergy: document.querySelector("#playerEnergy"),
  botEnergy: document.querySelector("#botEnergy"),
  playerNodes: document.querySelector("#playerNodes"),
  botNodes: document.querySelector("#botNodes"),
  playerHand: document.querySelector("#playerHand"),
  playerBattlefield: document.querySelector("#playerBattlefield"),
  botBattlefield: document.querySelector("#botBattlefield"),
  playerNodeRow: document.querySelector("#playerNodeRow"),
  botNodeRow: document.querySelector("#botNodeRow"),
};

let uid = 0;
let game;

function makeCard(id) {
  return {
    ...cardDefs[id],
    uid: `${id}-${uid++}`,
    damage: 0,
    tempMight: 0,
    tempToughness: 0,
    canAttack: false,
    exerted: false,
  };
}

function makeDeck(ids) {
  return shuffle(ids.map(makeCard));
}

function shuffle(cards) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPlayer(name, deckIds) {
  return {
    name,
    life: 30,
    deck: makeDeck(deckIds),
    hand: [],
    battlefield: [],
    nodes: [],
    energy: 0,
    nodePlayed: false,
  };
}

function newGame() {
  uid = 0;
  const greenDeck = [
    ...Array(17).fill("node"),
    ...Array(8).fill("ancientBoar"),
    ...Array(8).fill("primordialGoo"),
    ...Array(7).fill("shamanOfStrength"),
  ];
  const arcaneDeck = [
    ...Array(17).fill("node"),
    ...Array(8).fill("prodigalSorcerer"),
    ...Array(8).fill("ignite"),
    ...Array(7).fill("deathfireMage"),
  ];

  game = {
    turn: "player",
    turnNumber: 1,
    phase: "main",
    player: buildPlayer("You", greenDeck),
    bot: buildPlayer("Bot", arcaneDeck),
    log: [],
    winner: null,
    selectedAttackerUid: null,
    lastEvent: null,
  };
  drawCards(game.player, 5);
  drawCards(game.bot, 5);
  log("Game started. You are on the play with the green deck.");
  render();
}

function activePlayer() {
  return game.turn === "player" ? game.player : game.bot;
}

function defendingPlayer() {
  return game.turn === "player" ? game.bot : game.player;
}

function drawCards(player, count = 1) {
  for (let i = 0; i < count; i++) {
    if (!player.deck.length) {
      player.life -= 1;
      log(`${player.name} tried to draw from an empty deck and lost 1 life.`);
      continue;
    }
    player.hand.push(player.deck.pop());
  }
}

function log(message) {
  game.log.unshift(message);
  game.log = game.log.slice(0, 18);
}

function currentMight(card) {
  return (card.might || 0) + card.tempMight;
}

function currentToughness(card) {
  return (card.toughness || 0) + card.tempToughness;
}

function availableAttackers(player) {
  return player.battlefield.filter((card) => card.type === "Creature" && card.canAttack);
}

function damageSpellBonus(player) {
  return player.battlefield.some((card) => card.id === "deathfireMage") ? 1 : 0;
}

function startTurn(owner) {
  game.turn = owner;
  game.phase = "main";
  const player = activePlayer();
  game.selectedAttackerUid = null;
  game.turnNumber += owner === "player" ? 1 : 0;
  player.energy = 0;
  player.nodePlayed = false;
  for (const node of player.nodes) node.exerted = false;
  for (const creature of player.battlefield) {
    creature.canAttack = true;
    creature.tempMight = 0;
    creature.tempToughness = 0;
    creature.damage = 0;
  }
  drawCards(player, 1);
  log(player.name === "You" ? "You start your turn and draw a card." : "Bot starts its turn and draws a card.");
  checkWinner();
  render();
  if (owner === "bot" && !game.winner) {
    window.setTimeout(botTurn, 650);
  }
}

function endTurn() {
  if (game.winner || game.turn !== "player") return;
  cleanupEndOfTurn(game.player);
  game.selectedAttackerUid = null;
  log("You end the turn.");
  render();
  window.setTimeout(() => startTurn("bot"), 450);
}

function cleanupEndOfTurn(player) {
  player.energy = 0;
  for (const creature of player.battlefield) {
    creature.tempMight = 0;
    creature.tempToughness = 0;
    creature.damage = 0;
  }
}

function exertNode(player, node) {
  if (node.exerted) return false;
  node.exerted = true;
  player.energy += 1;
  return true;
}

function exertAll(player) {
  let count = 0;
  for (const node of player.nodes) {
    if (exertNode(player, node)) count++;
  }
  if (count) log(`${player.name} exerted ${count} Node${count === 1 ? "" : "s"} for ${count} energy.`);
  render();
}

function playCardFromHand(player, cardUid, targetUid = null) {
  if (game.winner) return false;
  const idx = player.hand.findIndex((card) => card.uid === cardUid);
  if (idx < 0) return false;
  const card = player.hand[idx];

  if (card.type === "Node") {
    if (player.nodePlayed) {
      setHint("You can only play one Node each turn.");
      return false;
    }
    player.hand.splice(idx, 1);
    player.nodes.push(card);
    player.nodePlayed = true;
    log(`${player.name} played Node.`);
    render();
    pulseCard(card.uid, "pulse-cast");
    return true;
  }

  if (player.energy < card.cost) {
    setHint(`${card.name} costs ${card.cost} energy.`);
    return false;
  }

  if (card.type === "Spell" && card.id === "ignite" && !chooseIgniteTarget(player, targetUid)) {
    setHint("Ignite needs a creature target.");
    return false;
  }

  player.energy -= card.cost;
  player.hand.splice(idx, 1);

  if (card.type === "Creature") {
    card.canAttack = false;
    player.battlefield.push(card);
    log(`${player.name} cast ${card.name}.`);
    handleCreatureEntered(player, card);
    game.lastEvent = { kind: "cast", sourceUid: card.uid };
  } else if (card.id === "ignite") {
    const event = resolveIgnite(player, targetUid);
    log(`${player.name} cast Ignite.`);
    triggerSpellCast(player);
    game.lastEvent = event;
  }

  checkStateBasedActions();
  checkWinner();
  render();
  return true;
}

function handleCreatureEntered(player, entered) {
  for (const creature of player.battlefield) {
    if (creature.id === "primordialGoo" && creature.uid !== entered.uid && currentMight(entered) > currentMight(creature)) {
      creature.might += 1;
      creature.toughness += 1;
      log(`${creature.name} gains a +1/+1 augment.`);
    }
  }
}

function triggerSpellCast(player) {
  for (const creature of player.battlefield) {
    if (creature.id === "prodigalSorcerer") {
      creature.tempMight += 1;
      creature.tempToughness += 1;
      log(`${creature.name} gains +1/+1 until end of turn.`);
    }
  }
}

function chooseIgniteTarget(player, targetUid) {
  const enemy = player === game.player ? game.bot : game.player;
  const allTargets = [...enemy.battlefield, ...player.battlefield];
  if (targetUid) return allTargets.some((card) => card.uid === targetUid);
  return allTargets.length > 0;
}

function resolveIgnite(player, targetUid = null) {
  const enemy = player === game.player ? game.bot : game.player;
  const candidates = [...enemy.battlefield, ...player.battlefield];
  const target = targetUid ? candidates.find((card) => card.uid === targetUid) : chooseBestDamageTarget(enemy.battlefield) || chooseBestDamageTarget(player.battlefield);
  if (!target) return null;
  const sourceRect = getCombatTargetRect(player === game.player ? "player" : "bot");
  const targetRect = getUidRect(target.uid);
  const damage = 3 + damageSpellBonus(player);
  target.damage += damage;
  log(`Ignite deals ${damage} damage to ${target.name}.`);
  return {
    kind: "spellDamage",
    sourcePlayer: player === game.player ? "player" : "bot",
    targetUid: target.uid,
    sourceRect,
    targetRect,
    amount: damage,
  };
}

function chooseBestDamageTarget(creatures) {
  if (!creatures.length) return null;
  return [...creatures].sort((a, b) => {
    const aKill = 3 >= currentToughness(a) - a.damage ? 1 : 0;
    const bKill = 3 >= currentToughness(b) - b.damage ? 1 : 0;
    return bKill - aKill || currentMight(b) - currentMight(a);
  })[0];
}

function checkStateBasedActions() {
  for (const player of [game.player, game.bot]) {
    const before = player.battlefield.length;
    player.battlefield = player.battlefield.filter((card) => card.damage < currentToughness(card));
    const lost = before - player.battlefield.length;
    if (lost) log(`${player.name} lost ${lost} creature${lost === 1 ? "" : "s"}.`);
  }
}

function attackPlayerWithSelected() {
  if (game.winner || game.turn !== "player") return;
  const attacker = game.player.battlefield.find((card) => card.uid === game.selectedAttackerUid);
  if (!attacker || attacker.canAttack !== true) {
    setHint("Select one of your ready creatures first.");
    return;
  }
  const sourceRect = getUidRect(attacker.uid);
  const targetRect = getCombatTargetRect("bot");
  game.bot.life -= currentMight(attacker);
  attacker.canAttack = false;
  log(`${attacker.name} attacks the bot for ${currentMight(attacker)}.`);
  game.lastEvent = {
    kind: "attackFace",
    sourceUid: attacker.uid,
    targetPlayer: "bot",
    sourceRect,
    targetRect,
    amount: currentMight(attacker),
  };
  game.selectedAttackerUid = null;
  checkWinner();
  render();
}

function attackCreatureWithSelected(targetUid) {
  if (game.winner || game.turn !== "player") return;
  const attacker = game.player.battlefield.find((card) => card.uid === game.selectedAttackerUid);
  const target = game.bot.battlefield.find((card) => card.uid === targetUid);
  if (!attacker || attacker.canAttack !== true || !target) return;
  const sourceRect = getUidRect(attacker.uid);
  const targetRect = getUidRect(target.uid);
  attacker.damage += currentMight(target);
  target.damage += currentMight(attacker);
  attacker.canAttack = false;
  log(`${attacker.name} attacks ${target.name}.`);
  game.lastEvent = {
    kind: "attackCreature",
    sourceUid: attacker.uid,
    targetUid: target.uid,
    sourceRect,
    targetRect,
    amount: currentMight(attacker),
  };
  game.selectedAttackerUid = null;
  checkStateBasedActions();
  checkWinner();
  render();
}

function botAttackFace() {
  if (game.winner) return;
  const attackers = availableAttackers(game.bot);
  if (!attackers.length) {
    return;
  }
  for (const attacker of attackers) {
    const sourceRect = getUidRect(attacker.uid);
    const targetRect = getCombatTargetRect("player");
    game.player.life -= currentMight(attacker);
    log(`${attacker.name} attacks you for ${currentMight(attacker)}.`);
    game.lastEvent = {
      kind: "attackFace",
      sourceUid: attacker.uid,
      targetPlayer: "player",
      sourceRect,
      targetRect,
      amount: currentMight(attacker),
    };
    attacker.canAttack = false;
  }
  checkWinner();
  render();
}

function botTurn() {
  if (game.winner || game.turn !== "bot") return;
  const bot = game.bot;
  playFirstNode(bot);
  exertAll(bot);

  let played = true;
  while (played) {
    played = false;
    const playable = bot.hand
      .filter((card) => card.type !== "Node" && card.cost <= bot.energy)
      .filter((card) => card.id !== "ignite" || chooseIgniteTarget(bot))
      .sort((a, b) => priority(b) - priority(a))[0];
    if (playable) {
      played = playCardFromHand(bot, playable.uid);
    }
  }

  botAttackFace();
  cleanupEndOfTurn(bot);
  log("Bot ends the turn.");
  render();
  if (!game.winner) window.setTimeout(() => startTurn("player"), 550);
}

function priority(card) {
  if (card.id === "ignite") return 20;
  if (card.id === "deathfireMage") return 12;
  if (card.id === "prodigalSorcerer") return 10;
  return card.cost;
}

function playFirstNode(player) {
  const node = player.hand.find((card) => card.type === "Node");
  if (node && !player.nodePlayed) playCardFromHand(player, node.uid);
}

function checkWinner() {
  if (game.player.life <= 0 && game.bot.life <= 0) game.winner = "Draw";
  else if (game.player.life <= 0) game.winner = "Bot wins";
  else if (game.bot.life <= 0) game.winner = "You win";
  if (game.winner) log(`${game.winner}!`);
}

function setHint(text) {
  els.stackHint.textContent = text;
}

function render() {
  const player = game.player;
  const bot = game.bot;
  els.status.textContent = game.winner
    ? game.winner
    : game.turn === "player"
      ? "Your turn. Build energy, play creatures, cast spells, then attack."
      : "Bot turn. The arcane deck is thinking.";
  els.playerLife.textContent = player.life;
  els.botLife.textContent = bot.life;
  els.playerDeck.textContent = player.deck.length;
  els.botDeck.textContent = bot.deck.length;
  els.playerHandCount.textContent = player.hand.length;
  els.botHand.textContent = bot.hand.length;
  els.playerEnergy.textContent = player.energy;
  els.botEnergy.textContent = bot.energy;
  els.playerNodes.textContent = player.nodes.length;
  els.botNodes.textContent = bot.nodes.length;
  els.exertAllBtn.disabled = game.turn !== "player" || !!game.winner || !player.nodes.some((node) => !node.exerted);
  els.attackBtn.disabled = game.turn !== "player" || !!game.winner || !game.selectedAttackerUid;
  els.endTurnBtn.disabled = game.turn !== "player" || !!game.winner;
  els.turnBadge.textContent = game.turn === "player" ? "Your Turn" : "Bot Turn";
  els.phaseCallout.textContent = game.winner ? game.winner : game.turn === "player" ? "Main Phase" : "Resolving Bot Actions";

  renderHand();
  renderBattlefield(els.playerBattlefield, player.battlefield, true);
  renderBattlefield(els.botBattlefield, bot.battlefield, false);
  renderNodes(els.playerNodeRow, player.nodes);
  renderNodes(els.botNodeRow, bot.nodes);
  els.log.innerHTML = game.log.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
  flushVisualEvent();
}

function renderHand() {
  els.playerHand.innerHTML = "";
  for (const card of game.player.hand) {
    const playable = game.turn === "player" && !game.winner && (card.type === "Node" ? !game.player.nodePlayed : game.player.energy >= card.cost);
    const el = document.createElement("article");
    el.className = `card ${card.faction} ${playable ? "playable" : ""}`;
    el.dataset.uid = card.uid;
    el.innerHTML = `<button type="button" aria-label="Play ${escapeHtml(card.name)}"><img src="${card.image}" alt="${escapeHtml(card.name)} card" /></button>`;
    el.querySelector("button").addEventListener("click", () => {
      if (card.id === "ignite") {
        const target = chooseBestDamageTarget(game.bot.battlefield) || chooseBestDamageTarget(game.player.battlefield);
        playCardFromHand(game.player, card.uid, target?.uid);
      } else {
        playCardFromHand(game.player, card.uid);
      }
    });
    els.playerHand.appendChild(el);
  }
}

function renderBattlefield(container, cards, isPlayer) {
  container.innerHTML = "";
  for (const card of cards) {
    const el = document.createElement("article");
    const selected = game.selectedAttackerUid === card.uid ? "playable" : "";
    const selectedClass = game.selectedAttackerUid === card.uid ? "selected" : "";
    const readyClass = card.canAttack === true ? "ready" : "";
    const targetClass = !isPlayer && game.turn === "player" && game.selectedAttackerUid ? "enemy-target" : "";
    el.className = `card battle-card ${card.faction} ${card.canAttack === false ? "sick" : ""} ${selected} ${selectedClass} ${readyClass} ${targetClass}`;
    el.dataset.uid = card.uid;
    el.innerHTML = `
      ${card.damage ? `<div class="damage-pill">${card.damage} dmg</div>` : ""}
      <div class="art-crop"><img src="${card.image}" alt="${escapeHtml(card.name)} artwork" /></div>
      <div class="battle-body">
        <div class="name">${escapeHtml(card.name)}</div>
        <div class="stats">${currentMight(card)}/${currentToughness(card)}</div>
        <div class="rules">${escapeHtml(card.rules || (card.canAttack === true ? "Ready to attack." : "Preparing."))}</div>
      </div>
    `;
    if (isPlayer && game.turn === "player" && card.canAttack === true) {
      el.role = "button";
      el.tabIndex = 0;
      el.title = "Select attacker";
      el.addEventListener("click", () => {
        game.selectedAttackerUid = game.selectedAttackerUid === card.uid ? null : card.uid;
        setHint(game.selectedAttackerUid ? "Choose Attack Player or click an enemy creature." : "Click a card in your hand to play it. Exert Nodes for energy.");
        render();
      });
    }
    if (!isPlayer && game.turn === "player" && game.selectedAttackerUid) {
      el.role = "button";
      el.tabIndex = 0;
      el.title = "Attack this creature";
      el.addEventListener("click", () => attackCreatureWithSelected(card.uid));
    }
    container.appendChild(el);
  }
}

function renderNodes(container, nodes) {
  container.innerHTML = "";
  for (const node of nodes) {
    const el = document.createElement("article");
    el.className = `card node neutral ${node.exerted ? "exerted" : ""}`;
    el.dataset.uid = node.uid;
    el.innerHTML = `
      <button type="button" aria-label="Exert Node">
        <div class="mini-card">
          <div class="name">Node</div>
          <div class="rules">${node.exerted ? "Exerted" : "Ready"}</div>
        </div>
      </button>
    `;
    el.querySelector("button").addEventListener("click", () => {
      if (game.turn === "player" && game.player.nodes.includes(node) && exertNode(game.player, node)) {
        log("You exerted Node for 1 energy.");
        render();
      }
    });
    container.appendChild(el);
  }
}

function flushVisualEvent() {
  if (!game.lastEvent) return;
  const event = game.lastEvent;
  game.lastEvent = null;
  window.requestAnimationFrame(() => {
    if (event.kind === "cast") {
      pulseCard(event.sourceUid, "pulse-cast");
    }
    if (event.kind === "spellDamage") {
      const source = document.querySelector(`[data-combat-target="${event.sourcePlayer}"] header`);
      const target = document.querySelector(`[data-uid="${event.targetUid}"]`);
      if (source && target) drawArrow(source, target, "spell");
      else drawArrowBetweenRects(event.sourceRect, event.targetRect, "spell");
      pulseCard(event.targetUid, "pulse-hit");
      showFloatingNumber(target || event.targetRect, `-${event.amount}`);
    }
    if (event.kind === "attackFace") {
      const source = document.querySelector(`[data-uid="${event.sourceUid}"]`);
      const target = document.querySelector(`[data-combat-target="${event.targetPlayer}"] header`);
      if (source && target) drawArrow(source, target, "attack");
      else drawArrowBetweenRects(event.sourceRect, event.targetRect, "attack");
      showFloatingNumber(target || event.targetRect, `-${event.amount}`);
    }
    if (event.kind === "attackCreature") {
      const source = document.querySelector(`[data-uid="${event.sourceUid}"]`);
      const target = document.querySelector(`[data-uid="${event.targetUid}"]`);
      if (source && target) drawArrow(source, target, "attack");
      else drawArrowBetweenRects(event.sourceRect, event.targetRect, "attack");
      pulseCard(event.sourceUid, "pulse-hit");
      pulseCard(event.targetUid, "pulse-hit");
      showFloatingNumber(target || event.targetRect, `-${event.amount}`);
    }
  });
}

function centerOf(element) {
  if (element && typeof element.left === "number") return centerOfRect(element);
  const rect = element.getBoundingClientRect();
  return centerOfRect(rect);
}

function centerOfRect(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getUidRect(uid) {
  const el = document.querySelector(`[data-uid="${uid}"]`);
  return el ? rectSnapshot(el) : null;
}

function getCombatTargetRect(target) {
  const el = document.querySelector(`[data-combat-target="${target}"] header`);
  return el ? rectSnapshot(el) : null;
}

function rectSnapshot(element) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function drawArrow(fromEl, toEl, kind) {
  if (!fromEl || !toEl) return;
  const from = centerOf(fromEl);
  const to = centerOf(toEl);
  drawArrowBetweenPoints(from, to, kind);
}

function drawArrowBetweenRects(fromRect, toRect, kind) {
  if (!fromRect || !toRect) return;
  drawArrowBetweenPoints(centerOfRect(fromRect), centerOfRect(toRect), kind);
}

function drawArrowBetweenPoints(from, to, kind) {
  const midY = (from.y + to.y) / 2;
  const curve = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", curve);
  path.setAttribute("class", `fx-arrow ${kind === "spell" ? "spell" : ""}`);
  els.fxLayer.appendChild(path);
  showBurst(to.x, to.y);
  window.setTimeout(() => path.remove(), 850);
}

function showBurst(x, y) {
  const burst = document.createElement("div");
  burst.className = "fx-burst";
  burst.style.setProperty("--x", `${x}px`);
  burst.style.setProperty("--y", `${y}px`);
  document.body.appendChild(burst);
  window.setTimeout(() => burst.remove(), 820);
}

function showFloatingNumber(element, text) {
  if (!element) return;
  const pos = centerOf(element);
  const floater = document.createElement("div");
  floater.className = "fx-float";
  floater.textContent = text;
  floater.style.setProperty("--x", `${pos.x}px`);
  floater.style.setProperty("--y", `${pos.y}px`);
  document.body.appendChild(floater);
  window.setTimeout(() => floater.remove(), 900);
}

function pulseCard(uid, className) {
  window.requestAnimationFrame(() => {
    const el = document.querySelector(`[data-uid="${uid}"]`);
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), 760);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.newGameBtn.addEventListener("click", newGame);
els.exertAllBtn.addEventListener("click", () => exertAll(game.player));
els.attackBtn.addEventListener("click", attackPlayerWithSelected);
els.endTurnBtn.addEventListener("click", endTurn);

newGame();
