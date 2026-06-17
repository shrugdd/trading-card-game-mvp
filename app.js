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
  menuBtn: document.querySelector("#menuBtn"),
  phaseBtn: document.querySelector("#phaseBtn"),
  botStatusBar: document.querySelector('[data-combat-target="bot"]'),
  logToggleBtn: document.querySelector("#logToggleBtn"),
  fxLayer: document.querySelector("#fxLayer"),
  log: document.querySelector("#log"),
  stackHint: document.querySelector("#stackHint"),
  turnBadge: document.querySelector("#turnBadge"),
  phaseCallout: document.querySelector("#phaseCallout"),
  playerLife: document.querySelector("#playerLife"),
  botLife: document.querySelector("#botLife"),
  playerDeck: document.querySelector("#playerDeck"),
  botDeck: document.querySelector("#botDeck"),
  playerDeckPile: document.querySelector("#playerDeckPile"),
  botDeckPile: document.querySelector("#botDeckPile"),
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
  // menu + chrome
  mainMenu: document.querySelector("#mainMenu"),
  gameRoot: document.querySelector("#gameRoot"),
  startTutorialBtn: document.querySelector("#startTutorialBtn"),
  openPackBtn: document.querySelector("#openPackBtn"),
  tutorialBanner: document.querySelector("#tutorialBanner"),
  sideRail: document.querySelector("#sideRail"),
  sideRailClose: document.querySelector("#sideRailClose"),
  // previews
  cardPreview: document.querySelector("#cardPreview"),
  enterPreview: document.querySelector("#enterPreview"),
  // graveyards
  botGraveBtn: document.querySelector("#botGraveBtn"),
  playerGraveBtn: document.querySelector("#playerGraveBtn"),
  botGraveCount: document.querySelector("#botGraveCount"),
  playerGraveCount: document.querySelector("#playerGraveCount"),
  graveModal: document.querySelector("#graveModal"),
  graveModalTitle: document.querySelector("#graveModalTitle"),
  graveModalList: document.querySelector("#graveModalList"),
  graveModalClose: document.querySelector("#graveModalClose"),
  // audio + end overlay
  muteBtn: document.querySelector("#muteBtn"),
  endOverlay: document.querySelector("#endOverlay"),
  endCard: document.querySelector("#endOverlay .end-card"),
  endTitle: document.querySelector("#endTitle"),
  endText: document.querySelector("#endText"),
  endPlayAgainBtn: document.querySelector("#endPlayAgainBtn"),
  endMenuBtn: document.querySelector("#endMenuBtn"),
};

function sfx(name) {
  if (window.RunebornAudio) window.RunebornAudio.play(name);
}

const BOT_STEP_DELAY = 1000; // pause between individual bot actions
const BOT_TURN_GAP = 1150; // pause before handing the turn back

// Hover-zoom is a mouse affordance. Touch devices have no "off" state for it,
// so we only enable it on devices with a real hovering pointer.
const SUPPORTS_HOVER = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);

let uid = 0;
let game;
let enterPreviewTimer = null;

function makeCard(id) {
  return {
    ...cardDefs[id],
    uid: `${id}-${uid++}`,
    damage: 0,
    tempMight: 0,
    tempToughness: 0,
    canAttack: false,
    summoningSick: false,
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
    graveyard: [],
    energy: 0,
    nodePlayed: false,
  };
}

// Pull the named cards out of the (already shuffled) deck into hand.
function dealFixedHand(player, ids) {
  for (const id of ids) {
    const idx = player.deck.findIndex((card) => card.id === id);
    if (idx >= 0) player.hand.push(player.deck.splice(idx, 1)[0]);
    else player.hand.push(makeCard(id));
  }
}

function newGame(opts = {}) {
  const tutorial = opts.tutorial !== false; // tutorial is the default mode
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
    phase: "main1",
    player: buildPlayer("You", greenDeck),
    bot: buildPlayer("Bot", arcaneDeck),
    log: [],
    winner: null,
    selectedAttackerUid: null,
    lastEvent: null,
    tutorial: { mode: tutorial, active: tutorial, stepIndex: 0 },
  };

  // Fixed opening hands so the tutorial is deterministic.
  dealFixedHand(game.player, ["node", "node", "primordialGoo", "ancientBoar", "shamanOfStrength"]);
  dealFixedHand(game.bot, ["ignite", "node", "node", "prodigalSorcerer", "deathfireMage"]);

  log("Game started. You are on the play with the green deck.");
  if (tutorial) log("Tutorial active — follow the gold banner at the top.");
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
  game.log.push(message);
  if (game.log.length > 30) game.log = game.log.slice(-30);
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
  game.phase = "main1";
  const player = activePlayer();
  game.selectedAttackerUid = null;
  game.turnNumber += owner === "player" ? 1 : 0;
  player.energy = 0;
  player.nodePlayed = false;
  for (const node of player.nodes) node.exerted = false;
  for (const creature of player.battlefield) {
    creature.canAttack = true;
    creature.summoningSick = false;
    creature.tempMight = 0;
    creature.tempToughness = 0;
    creature.damage = 0;
  }
  drawCards(player, 1);
  log(player.name === "You" ? "You start your turn and draw a card." : "Bot starts its turn and draws a card.");
  checkWinner();
  render();
  if (owner === "bot" && !game.winner) {
    window.setTimeout(botTurn, BOT_TURN_GAP);
  }
}

function endTurn() {
  if (game.winner || game.turn !== "player") return;
  cleanupEndOfTurn(game.player);
  game.selectedAttackerUid = null;
  log("You end the turn.");
  render();
  window.setTimeout(() => startTurn("bot"), 600);
}

// The phase button near the hand walks the player's turn forward:
// Main Phase 1 -> Combat -> Main Phase 2 -> (pass the turn).
function advancePhase() {
  if (game.winner || game.turn !== "player") return;
  const next = game.phase === "main1" ? "combat" : game.phase === "combat" ? "main2" : "pass";
  if (game.tutorial.active && !stepAllows({ type: "advancePhase", to: next })) {
    setHint("Follow the tutorial step shown in the gold banner.");
    return;
  }
  sfx("buttonClick");
  if (next === "pass") {
    endTurn();
    return;
  }
  game.phase = next;
  if (next === "combat") {
    log("You enter your Combat phase.");
    setHint("Combat — click one of your ready creatures, then click the enemy player or an enemy creature.");
  } else {
    game.selectedAttackerUid = null;
    log("You enter Main Phase 2.");
    setHint("Main Phase 2 — play more cards, then Pass the Turn.");
  }
  maybeAdvanceTutorial();
  render();
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
  if (count) {
    log(`${player.name} exerted ${count} Node${count === 1 ? "" : "s"} for ${count} energy.`);
    sfx("nodeExert");
  }
  render();
}

function playCardFromHand(player, cardUid, targetUid = null) {
  if (game.winner) return false;
  if (player === game.player && game.phase === "combat") {
    setHint("You can only play cards during a Main Phase.");
    return false;
  }
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
    sfx("cardPlay");
    showEnterPreview(card);
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
    card.summoningSick = true;
    player.battlefield.push(card);
    log(`${player.name} cast ${card.name}.`);
    sfx("cardPlay");
    showEnterPreview(card);
    handleCreatureEntered(player, card);
    game.lastEvent = { kind: "cast", sourceUid: card.uid };
  } else if (card.id === "ignite") {
    const event = resolveIgnite(player, targetUid);
    log(`${player.name} cast Ignite.`);
    sfx("spell");
    showEnterPreview(card);
    triggerSpellCast(player);
    player.graveyard.push(card);
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
  sfx("damage");
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
    const survivors = [];
    let lost = 0;
    for (const card of player.battlefield) {
      if (card.damage < currentToughness(card)) {
        survivors.push(card);
      } else {
        card.canAttack = false;
        player.graveyard.push(card);
        lost++;
      }
    }
    player.battlefield = survivors;
    if (lost) log(`${player.name} lost ${lost} creature${lost === 1 ? "" : "s"}.`);
  }
}

function attackPlayerWithSelected() {
  if (game.winner || game.turn !== "player" || game.phase !== "combat") return;
  const attacker = game.player.battlefield.find((card) => card.uid === game.selectedAttackerUid);
  if (!attacker || attacker.canAttack !== true) {
    setHint("Select one of your ready creatures first.");
    return;
  }
  const sourceRect = getUidRect(attacker.uid);
  const targetRect = getCombatTargetRect("bot");
  game.bot.life -= currentMight(attacker);
  attacker.canAttack = false;
  sfx("attack");
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
  if (game.winner || game.turn !== "player" || game.phase !== "combat") return;
  const attacker = game.player.battlefield.find((card) => card.uid === game.selectedAttackerUid);
  const target = game.bot.battlefield.find((card) => card.uid === targetUid);
  if (!attacker || attacker.canAttack !== true || !target) return;
  const sourceRect = getUidRect(attacker.uid);
  const targetRect = getUidRect(target.uid);
  attacker.damage += currentMight(target);
  target.damage += currentMight(attacker);
  attacker.canAttack = false;
  sfx("attack");
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

function botAttackFaceSingle(attacker) {
  if (game.winner) return;
  const sourceRect = getUidRect(attacker.uid);
  const targetRect = getCombatTargetRect("player");
  game.player.life -= currentMight(attacker);
  sfx("attack");
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
  checkWinner();
}

// ---------- Bot turn, sequenced so a human can follow it ----------
function botTurn() {
  if (game.winner || game.turn !== "bot") return;
  setHint("Bot is taking its turn…");
  const opener = [() => playFirstNode(game.bot), () => exertAll(game.bot)];
  runBotActions(opener);
}

function runBotActions(queue) {
  if (game.winner) {
    finishBotTurn();
    return;
  }
  if (queue.length) {
    queue.shift()();
    render();
    window.setTimeout(() => runBotActions(queue), BOT_STEP_DELAY);
    return;
  }
  const playable = nextBotPlayable();
  if (playable) {
    playCardFromHand(game.bot, playable.uid);
    render();
    window.setTimeout(() => runBotActions([]), BOT_STEP_DELAY);
    return;
  }
  const attackers = availableAttackers(game.bot);
  if (attackers.length) {
    runBotAttacks(attackers);
    return;
  }
  finishBotTurn();
}

function runBotAttacks(attackers) {
  if (game.winner) {
    finishBotTurn();
    return;
  }
  const attacker = attackers.shift();
  if (!attacker) {
    finishBotTurn();
    return;
  }
  botAttackFaceSingle(attacker);
  render();
  window.setTimeout(() => runBotAttacks(attackers), BOT_STEP_DELAY);
}

function finishBotTurn() {
  cleanupEndOfTurn(game.bot);
  log("Bot ends the turn.");
  render();
  if (!game.winner) window.setTimeout(() => startTurn("player"), BOT_TURN_GAP);
}

function nextBotPlayable() {
  return game.bot.hand
    .filter((card) => card.type !== "Node" && card.cost <= game.bot.energy)
    .filter((card) => card.id !== "ignite" || chooseIgniteTarget(game.bot))
    // During the tutorial the bot won't burn your Boar, so the attack lesson works.
    .filter((card) => !(game.tutorial.active && card.id === "ignite"))
    .sort((a, b) => priority(b) - priority(a))[0];
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
  const had = game.winner;
  if (game.player.life <= 0 && game.bot.life <= 0) game.winner = "Draw";
  else if (game.player.life <= 0) game.winner = "Bot wins";
  else if (game.bot.life <= 0) game.winner = "You win";
  if (game.winner && !had) {
    log(`${game.winner}!`);
    sfx(game.winner === "You win" ? "win" : "lose");
  }
}

function setHint(text) {
  els.stackHint.textContent = text;
}

// ---------- Tutorial engine ----------
const TUTORIAL_STEPS = [
  {
    banner: "Step 1 — Click the highlighted Node in your hand to play it. Nodes are your energy source.",
    focus: { zone: "hand", id: "node" },
    allow: (a) => a.type === "playCard" && a.card.id === "node",
    isComplete: (g) => g.player.nodes.length >= 1,
  },
  {
    banner: "Step 2 — Click the Node on your battlefield to exert it for 1 energy.",
    focus: { zone: "playerNode" },
    allow: (a) => a.type === "exertNode",
    isComplete: (g) => g.player.energy >= 1,
  },
  {
    banner: "Step 3 — Now play Ancient Boar from your hand (it costs 1 energy). Click it.",
    focus: { zone: "hand", id: "ancientBoar" },
    allow: (a) => a.type === "playCard" && a.card.id === "ancientBoar",
    isComplete: (g) => g.player.battlefield.some((c) => c.id === "ancientBoar"),
  },
  {
    banner: "Your turn has phases. You've finished playing — click Start Next Phase to enter your Combat phase.",
    focus: { zone: "button", btn: "phaseBtn" },
    allow: (a) => a.type === "advancePhase",
    isComplete: (g) => g.phase === "combat" || g.turn === "bot" || g.turnNumber >= 2,
  },
  {
    banner: "Creatures can't attack the turn they're played — that's summoning sickness. Click Start Next Phase to move to Main Phase 2.",
    focus: { zone: "button", btn: "phaseBtn" },
    allow: (a) => a.type === "advancePhase",
    isComplete: (g) => g.phase === "main2" || g.turn === "bot" || g.turnNumber >= 2,
  },
  {
    banner: "Main Phase 2 lets you play more cards after combat. Nothing left to play — click Pass the Turn to hand off to the bot.",
    focus: { zone: "button", btn: "phaseBtn" },
    allow: (a) => a.type === "advancePhase",
    isComplete: (g) => g.turn === "bot" || g.turnNumber >= 2,
  },
  {
    banner: "Watch the bot take its turn — its actions play out slowly so you can follow what's happening.",
    focus: null,
    allow: () => false,
    isComplete: (g) => g.turn === "player" && g.turnNumber >= 2,
  },
  {
    banner: "Turn 2 — You drew a card. Now play your second Node from your hand.",
    focus: { zone: "hand", id: "node" },
    allow: (a) => a.type === "playCard" && a.card.id === "node",
    isComplete: (g) => g.player.nodes.length >= 2,
  },
  {
    banner: "Exert both of your Nodes for energy — click each one.",
    focus: { zone: "playerNode" },
    allow: (a) => a.type === "exertNode",
    isComplete: (g) => g.player.energy >= 2,
  },
  {
    banner: "Now click Start Next Phase to enter your Combat phase.",
    focus: { zone: "button", btn: "phaseBtn" },
    allow: (a) => a.type === "advancePhase",
    isComplete: (g) => g.phase === "combat",
  },
  {
    banner: "Your Ancient Boar is ready now (no longer summoning sick). Click it to select it as an attacker.",
    focus: { zone: "playerBattle", id: "ancientBoar" },
    allow: (a) => a.type === "selectAttacker",
    isComplete: (g) => !!g.selectedAttackerUid,
  },
  {
    banner: "Now click the bot's Prodigal Sorcerer to attack it. Each creature deals its power to the other — your 3/3 Boar kills the 2/2 Sorcerer and survives.",
    focus: { zone: "enemyBattle", id: "prodigalSorcerer" },
    allow: (a) => a.type === "attackCreature" && a.card && a.card.id === "prodigalSorcerer",
    isComplete: (g) => !g.bot.battlefield.some((c) => c.id === "prodigalSorcerer"),
  },
  {
    banner: "Tutorial complete! 🎉 Finish combat, play more in Main Phase 2, then Pass the Turn — or keep playing freely to reduce the bot to 0 life!",
    focus: null,
    allow: () => true,
    isComplete: () => false,
    final: true,
  },
];

function currentStep() {
  return game.tutorial.mode ? TUTORIAL_STEPS[game.tutorial.stepIndex] : null;
}

function stepAllows(action) {
  if (!game.tutorial.active) return true;
  const step = currentStep();
  return step ? step.allow(action) : true;
}

function maybeAdvanceTutorial() {
  if (!game.tutorial.active) return;
  let step = TUTORIAL_STEPS[game.tutorial.stepIndex];
  while (step && !step.final && step.isComplete(game) && game.tutorial.stepIndex < TUTORIAL_STEPS.length - 1) {
    game.tutorial.stepIndex++;
    step = TUTORIAL_STEPS[game.tutorial.stepIndex];
  }
  if (step && step.final) {
    game.tutorial.active = false;
  }
}

function renderTutorial() {
  if (!game.tutorial.mode) {
    els.tutorialBanner.hidden = true;
    return;
  }
  const step = TUTORIAL_STEPS[game.tutorial.stepIndex];
  els.tutorialBanner.hidden = false;
  els.tutorialBanner.textContent = step.banner;
}

function renderEndOverlay() {
  if (!game.winner) {
    els.endOverlay.hidden = true;
    return;
  }
  const win = game.winner === "You win";
  const draw = game.winner === "Draw";
  els.endCard.classList.toggle("win", win);
  els.endCard.classList.toggle("lose", !win && !draw);
  els.endTitle.textContent = win ? "Victory!" : draw ? "Draw" : "Defeat";
  els.endText.textContent = win
    ? "You reduced the bot to 0 life. Well played!"
    : draw
      ? "Both heroes fell at the same moment."
      : "The arcane deck got the better of you this time.";
  els.endOverlay.hidden = false;
}

// ---------- Rendering ----------
function render() {
  if (!game) return;
  // The hovered card's DOM node is recreated on every render, so its mouseleave
  // may never fire — clear any active preview to avoid it getting stuck.
  hideCardPreview();
  maybeAdvanceTutorial();

  const player = game.player;
  const bot = game.bot;
  const step = game.tutorial.active ? currentStep() : null;

  els.status.textContent = game.winner
    ? game.winner
    : game.turn !== "player"
      ? "Bot turn. The arcane deck is thinking."
      : game.phase === "combat"
        ? "Combat — click a creature, then click the enemy player or a creature."
        : game.phase === "main2"
          ? "Main Phase 2 — play more cards, then Pass the Turn."
          : "Main Phase 1 — exert Nodes for energy and play your cards.";
  renderEndOverlay();
  els.playerLife.textContent = player.life;
  els.botLife.textContent = bot.life;
  els.playerDeck.textContent = player.deck.length;
  els.botDeck.textContent = bot.deck.length;
  els.playerDeckPile.textContent = player.deck.length;
  els.botDeckPile.textContent = bot.deck.length;
  els.playerHandCount.textContent = player.hand.length;
  els.botHand.textContent = bot.hand.length;
  els.playerEnergy.textContent = player.energy;
  els.botEnergy.textContent = bot.energy;
  els.playerNodes.textContent = player.nodes.length;
  els.botNodes.textContent = bot.nodes.length;
  els.playerGraveCount.textContent = player.graveyard.length;
  els.botGraveCount.textContent = bot.graveyard.length;

  const nextPhase = game.phase === "main1" ? "combat" : game.phase === "combat" ? "main2" : "pass";
  els.phaseBtn.textContent = nextPhase === "pass" ? "Pass the Turn" : "Start Next Phase";
  els.phaseBtn.disabled = game.turn !== "player" || !!game.winner || !stepAllows({ type: "advancePhase", to: nextPhase });
  applyButtonFocus(els.phaseBtn, step && step.focus && step.focus.btn === "phaseBtn");

  // Highlight the opponent portrait as a face target during combat.
  const faceTargetable = game.turn === "player" && game.phase === "combat" && !!game.selectedAttackerUid && !game.winner;
  if (els.botStatusBar) els.botStatusBar.classList.toggle("face-targetable", faceTargetable);

  els.turnBadge.textContent = game.turn === "player" ? "Your Turn" : "Bot Turn";
  els.phaseCallout.textContent = game.winner
    ? game.winner
    : game.turn !== "player"
      ? "Resolving Bot Actions"
      : game.phase === "combat"
        ? "Combat"
        : game.phase === "main2"
          ? "Main Phase 2"
          : "Main Phase 1";

  renderHand();
  renderBattlefield(els.playerBattlefield, player.battlefield, true);
  renderBattlefield(els.botBattlefield, bot.battlefield, false);
  renderNodes(els.playerNodeRow, player.nodes, true);
  renderNodes(els.botNodeRow, bot.nodes, false);

  els.log.innerHTML = game.log.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
  els.log.scrollTop = els.log.scrollHeight;

  renderTutorial();
  flushVisualEvent();
}

function applyButtonFocus(btn, on) {
  btn.classList.toggle("btn-focus", !!on && !btn.disabled);
}

function renderHand() {
  els.playerHand.innerHTML = "";
  const step = game.tutorial.active ? currentStep() : null;
  for (const card of game.player.hand) {
    const affordable = game.turn === "player" && !game.winner && game.phase !== "combat" && (card.type === "Node" ? !game.player.nodePlayed : game.player.energy >= card.cost);
    const allowed = stepAllows({ type: "playCard", card });
    const playable = affordable && allowed;
    const el = document.createElement("article");
    el.className = `card ${card.faction} ${playable ? "playable" : ""}`;
    if (game.tutorial.active && !allowed) el.classList.add("tutorial-locked");
    if (step && step.focus && step.focus.zone === "hand" && step.focus.id === card.id) el.classList.add("tutorial-focus");
    el.dataset.uid = card.uid;
    el.innerHTML = `<button type="button" aria-label="Play ${escapeHtml(card.name)}"><img src="${card.image}" alt="${escapeHtml(card.name)} card" /></button>`;
    el.querySelector("button").addEventListener("click", () => {
      if (game.tutorial.active && !stepAllows({ type: "playCard", card })) {
        setHint("Follow the tutorial step shown in the gold banner.");
        return;
      }
      if (card.id === "ignite") {
        const target = chooseBestDamageTarget(game.bot.battlefield) || chooseBestDamageTarget(game.player.battlefield);
        playCardFromHand(game.player, card.uid, target?.uid);
      } else {
        playCardFromHand(game.player, card.uid);
      }
    });
    attachPreview(el, card);
    els.playerHand.appendChild(el);
  }
}

function renderBattlefield(container, cards, isPlayer) {
  container.innerHTML = "";
  const step = game.tutorial.active ? currentStep() : null;
  for (const card of cards) {
    const el = document.createElement("article");
    const selectedClass = game.selectedAttackerUid === card.uid ? "selected" : "";
    const readyClass = card.canAttack === true ? "ready" : "";
    const inCombat = game.turn === "player" && game.phase === "combat";
    const targetClass = !isPlayer && inCombat && game.selectedAttackerUid ? "enemy-target" : "";
    el.className = `card battle-card ${card.faction} ${card.summoningSick ? "sick" : ""} ${selectedClass} ${readyClass} ${targetClass}`;
    el.dataset.uid = card.uid;
    el.innerHTML = `
      ${card.damage ? `<div class="damage-pill">${card.damage} dmg</div>` : ""}
      <div class="art-crop"><img src="${card.image}" alt="${escapeHtml(card.name)} artwork" /></div>
      <div class="battle-body">
        <div class="name">${escapeHtml(card.name)}</div>
        <div class="stats">${currentMight(card)}/${currentToughness(card)}</div>
        <div class="rules">${escapeHtml(card.rules || (card.summoningSick ? "Summoning sick." : card.canAttack === true ? "Ready to attack." : "Already acted this turn."))}</div>
      </div>
    `;
    if (isPlayer && inCombat && card.canAttack === true) {
      if (step && step.focus && step.focus.zone === "playerBattle" && step.focus.id === card.id) el.classList.add("tutorial-focus");
      el.role = "button";
      el.tabIndex = 0;
      el.title = "Select attacker";
      el.addEventListener("click", () => {
        if (game.tutorial.active && !stepAllows({ type: "selectAttacker", card })) {
          setHint("Follow the tutorial step shown in the gold banner.");
          return;
        }
        game.selectedAttackerUid = game.selectedAttackerUid === card.uid ? null : card.uid;
        setHint(game.selectedAttackerUid ? "Click the enemy player or an enemy creature to attack." : "Click one of your ready creatures to attack with it.");
        render();
      });
    }
    if (!isPlayer && inCombat && game.selectedAttackerUid) {
      if (step && step.focus && step.focus.zone === "enemyBattle" && step.focus.id === card.id) el.classList.add("tutorial-focus");
      el.role = "button";
      el.tabIndex = 0;
      el.title = "Attack this creature";
      el.addEventListener("click", () => {
        if (game.tutorial.active && !stepAllows({ type: "attackCreature", card })) {
          setHint("Follow the tutorial step shown in the gold banner.");
          return;
        }
        attackCreatureWithSelected(card.uid);
      });
    }
    attachPreview(el, card);
    container.appendChild(el);
  }
}

function renderNodes(container, nodes, isPlayer) {
  container.innerHTML = "";
  const step = game.tutorial.active ? currentStep() : null;
  for (const node of nodes) {
    const el = document.createElement("article");
    el.className = `card node neutral ${node.exerted ? "exerted" : ""}`;
    if (isPlayer && step && step.focus && step.focus.zone === "playerNode" && !node.exerted) el.classList.add("tutorial-focus");
    el.dataset.uid = node.uid;
    el.innerHTML = `
      <button type="button" aria-label="Exert Node">
        <div class="art-crop"><img src="${node.image}" alt="Node artwork" /></div>
        <div class="mini-card">
          <div class="name">Node</div>
          <div class="rules">${node.exerted ? "Exerted" : "Ready"}</div>
        </div>
      </button>
    `;
    el.querySelector("button").addEventListener("click", () => {
      if (!isPlayer) return;
      if (game.turn !== "player" || game.winner) return;
      if (game.tutorial.active && !stepAllows({ type: "exertNode" })) {
        setHint("Follow the tutorial step shown in the gold banner.");
        return;
      }
      if (game.player.nodes.includes(node) && exertNode(game.player, node)) {
        log("You exerted Node for 1 energy.");
        sfx("nodeExert");
        render();
      }
    });
    attachPreview(el, node);
    container.appendChild(el);
  }
}

// ---------- Hover zoom preview ----------
function attachPreview(el, card) {
  if (!SUPPORTS_HOVER) return; // no hover zoom on touch devices
  el.addEventListener("mouseenter", (e) => {
    showCardPreview(card);
    positionPreview(e);
  });
  el.addEventListener("mousemove", positionPreview);
  el.addEventListener("mouseleave", hideCardPreview);
}

function showCardPreview(card) {
  els.cardPreview.innerHTML = `<img src="${card.image}" alt="${escapeHtml(card.name)} full card" />`;
  els.cardPreview.classList.add("show");
}

function hideCardPreview() {
  els.cardPreview.classList.remove("show");
}

function positionPreview(e) {
  const p = els.cardPreview;
  const w = p.offsetWidth || 280;
  const h = p.offsetHeight || 392;
  let x = e.clientX + 24;
  let y = e.clientY - h / 2;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - 24;
  if (x < 8) x = 8;
  if (y < 8) y = 8;
  if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
}

// ---------- Entering-card preview ----------
function showEnterPreview(card) {
  const el = els.enterPreview;
  el.innerHTML = `
    <div class="enter-card"><img src="${card.image}" alt="${escapeHtml(card.name)} full card" /></div>
    <div class="enter-tag">${escapeHtml(card.name)} enters play</div>
  `;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  window.clearTimeout(enterPreviewTimer);
  enterPreviewTimer = window.setTimeout(() => el.classList.remove("show"), 1450);
}

// ---------- Graveyard ----------
function openGraveyard(player) {
  els.graveModalTitle.textContent = `${player.name} Graveyard (${player.graveyard.length})`;
  if (!player.graveyard.length) {
    els.graveModalList.innerHTML = `<p class="empty">No cards in the graveyard yet.</p>`;
  } else {
    els.graveModalList.innerHTML = player.graveyard
      .map((card) => `<article class="card ${card.faction}"><img src="${card.image}" alt="${escapeHtml(card.name)}" /></article>`)
      .join("");
  }
  els.graveModal.hidden = false;
}

function closeGraveyard() {
  els.graveModal.hidden = true;
}

// ---------- Visual FX ----------
function flushVisualEvent() {
  if (!game.lastEvent) return;
  const event = game.lastEvent;
  game.lastEvent = null;
  window.requestAnimationFrame(() => {
    if (event.kind === "cast") {
      pulseCard(event.sourceUid, "pulse-cast");
    }
    if (event.kind === "spellDamage") {
      const source = document.querySelector(`[data-combat-target="${event.sourcePlayer}"]`);
      const target = document.querySelector(`[data-uid="${event.targetUid}"]`);
      if (source && target) drawArrow(source, target, "spell");
      else drawArrowBetweenRects(event.sourceRect, event.targetRect, "spell");
      pulseCard(event.targetUid, "pulse-hit");
      showFloatingNumber(target || event.targetRect, `-${event.amount}`);
    }
    if (event.kind === "attackFace") {
      const source = document.querySelector(`[data-uid="${event.sourceUid}"]`);
      const target = document.querySelector(`[data-combat-target="${event.targetPlayer}"]`);
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
  const el = document.querySelector(`[data-combat-target="${target}"]`);
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

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "fx-float";
  toast.style.setProperty("--x", `${window.innerWidth / 2}px`);
  toast.style.setProperty("--y", `${window.innerHeight / 2}px`);
  toast.style.fontSize = "22px";
  toast.textContent = text;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 900);
}

// ---------- Menu + chrome wiring ----------
function startTutorial() {
  if (window.RunebornAudio) window.RunebornAudio.resume();
  sfx("buttonClick");
  els.mainMenu.hidden = true;
  els.gameRoot.hidden = false;
  newGame({ tutorial: true });
}

function returnToMenu() {
  sfx("buttonClick");
  els.endOverlay.hidden = true;
  els.gameRoot.hidden = true;
  els.mainMenu.hidden = false;
}

function updateMuteButton() {
  const muted = !!(window.RunebornAudio && window.RunebornAudio.isMuted());
  els.muteBtn.textContent = muted ? "🔇" : "🔊";
  els.muteBtn.title = muted ? "Sound off — click to unmute" : "Sound on — click to mute";
}

els.startTutorialBtn.addEventListener("click", startTutorial);
els.openPackBtn.addEventListener("click", () => {
  sfx("buttonClick");
  showToast("Packs coming soon!");
});
els.menuBtn.addEventListener("click", returnToMenu);
els.newGameBtn.addEventListener("click", () => {
  sfx("buttonClick");
  newGame({ tutorial: true });
});
els.muteBtn.addEventListener("click", () => {
  if (window.RunebornAudio) window.RunebornAudio.toggleMute();
  updateMuteButton();
  sfx("buttonClick");
});
els.endPlayAgainBtn.addEventListener("click", () => {
  sfx("buttonClick");
  newGame({ tutorial: false });
});
els.endMenuBtn.addEventListener("click", returnToMenu);
updateMuteButton();
els.phaseBtn.addEventListener("click", advancePhase);
if (els.botStatusBar) {
  els.botStatusBar.addEventListener("click", () => {
    if (game.turn !== "player" || game.phase !== "combat" || game.winner || !game.selectedAttackerUid) return;
    if (game.tutorial.active && !stepAllows({ type: "attackFace" })) {
      setHint("Follow the tutorial step shown in the gold banner.");
      return;
    }
    attackPlayerWithSelected();
  });
}
els.logToggleBtn.addEventListener("click", () => els.sideRail.classList.toggle("open"));
els.sideRailClose.addEventListener("click", () => els.sideRail.classList.remove("open"));
els.botGraveBtn.addEventListener("click", () => openGraveyard(game.bot));
els.playerGraveBtn.addEventListener("click", () => openGraveyard(game.player));
els.graveModalClose.addEventListener("click", closeGraveyard);
els.graveModal.addEventListener("click", (e) => {
  if (e.target === els.graveModal) closeGraveyard();
});
