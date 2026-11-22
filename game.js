'use strict';

/* VEILBOUND: The Eternal Eclipse
   A small, self-contained first playable version. */

const FACTIONS = {
  court: { name: 'Crimson Court', leader: 'Seraphine, Queen of Thorns', style: 'crimson' },
  coven: { name: 'Thorn Coven', leader: 'Morganna, the Hexmother', style: 'thorn' }
};

const CARD_SETS = {
  court: [
    { name: 'Bloodbound Initiate', cost: 1, attack: 2, health: 1, ability: 'Both leaders lose 1 Vitality.', effect: 'bloodPrice'image: 'images/cards/bloodbound-initiate.webp' },
    { name: 'Crimson Acolyte', cost: 2, attack: 2, health: 2, ability: 'Restore 2 Vitality.', effect: 'heal' },
    { name: 'Nightveil Stalker', cost: 2, attack: 3, health: 1, ability: 'A swift hunter of the eclipse.' },
    { name: 'Sanguine Duelist', cost: 3, attack: 3, health: 3, ability: 'A disciplined blade in the Queen’s service.' },
    { name: 'Bloodletter Noble', cost: 4, attack: 4, health: 3, ability: 'Deal 2 damage to the enemy leader.', effect: 'strike' },
    { name: 'Thorn-Crowned Guard', cost: 4, attack: 3, health: 5, ability: 'A stalwart defender of the Court.' },
    { name: 'Veloria, Crimson Assassin', cost: 5, attack: 5, health: 3, ability: 'Damage the weakest enemy creature.', effect: 'bolt' },
    { name: 'Nocturne Matriarch', cost: 6, attack: 5, health: 6, ability: 'Restore 3 Vitality.', effect: 'greatHeal' },
    { name: 'Lord of the Red Veil', cost: 7, attack: 7, health: 6, ability: 'A legendary terror beneath the blood moon.' },
    { name: 'Eclipse of Blood', cost: 3, type: 'spell', attack: 0, health: 0, ability: 'Deal 3 damage to the enemy leader.' }
  ],
  coven: [
    { name: 'Briarling Familiar', cost: 1, attack: 1, health: 2, ability: 'A spirit tangled in living thorns.' },
    { name: 'Thornweaver Apprentice', cost: 2, attack: 2, health: 2, ability: 'Restore 2 Vitality.', effect: 'heal' },
    { name: 'Whisper, Four-Eyed Cat', cost: 2, attack: 1, health: 3, ability: 'A watchful familiar that sees the unseen.' },
    { name: 'Hexwood Guardian', cost: 3, attack: 2, health: 5, ability: 'Roots turn aside attackers.' },
    { name: 'Moonlit Hexer', cost: 3, attack: 3, health: 2, ability: 'Damage the weakest enemy creature.', effect: 'bolt' },
    { name: 'Briarwitch', cost: 4, attack: 4, health: 4, ability: 'Deal 2 damage to the enemy leader.', effect: 'strike' },
    { name: 'Elder of the Black Grove', cost: 5, attack: 4, health: 6, ability: 'The ancient grove answers her call.' },
    { name: 'Morganna’s Thornbeast', cost: 6, attack: 6, health: 5, ability: 'A monstrous familiar bound by dark magic.' },
    { name: 'The Hexmother', cost: 7, attack: 7, health: 7, ability: 'Morganna’s will made flesh.' },
    { name: 'Withering Curse', cost: 3, type: 'spell', attack: 0, health: 0, ability: 'Deal 3 damage to the enemy leader.' }
  ]
};

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
let game = null;
let chosenFaction = 'court';
let selectedAttacker = null;
let aiTimer = null;

function shuffled(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeDeck(faction) {
  return shuffled(CARD_SETS[faction].flatMap((card) =>
    Array.from({ length: 4 }, () => ({
      ...card,
      id: Math.random().toString(36).slice(2),
      damage: 0,
      ready: false
    }))
  ));
}

function showMenu() {
  clearTimeout(aiTimer);
  game = null;
  selectedAttacker = null;
  app.innerHTML = `
    <section id="menu-screen" class="screen active">
      <div class="title-panel">
        <p class="eyebrow">A GOTHIC FANTASY CARD GAME</p>
        <h1>VEILBOUND</h1>
        <p class="subtitle">THE ETERNAL ECLIPSE</p>
        <p>The world is lost beneath the Veil. Choose who will claim it.</p>
        <button id="play-button" class="gold-button" type="button">PLAY</button>
      </div>
    </section>
    <section id="faction-screen" class="screen">
      <div class="screen-heading">
        <p class="eyebrow">CHOOSE YOUR FACTION</p>
        <h2>Whose power will you wield?</h2>
      </div>
      <div class="faction-grid">
        <button class="faction-card crimson" data-faction="court" type="button">
          <span class="faction-symbol">♛</span>
          <strong>CRIMSON COURT</strong>
          <small>Seraphine, Queen of Thorns</small>
        </button>
        <button class="faction-card thorn" data-faction="coven" type="button">
          <span class="faction-symbol">✦</span>
          <strong>THORN COVEN</strong>
          <small>Morganna, the Hexmother</small>
        </button>
      </div>
      <button id="back-button" class="silver-button" type="button" style="margin-top:24px">BACK</button>
    </section>`;
  $('#play-button').addEventListener('click', showFactionSelect);
  $('#back-button').addEventListener('click', showMenu);
  app.querySelectorAll('[data-faction]').forEach((button) => {
    button.addEventListener('click', () => startGame(button.dataset.faction));
  });
}

function showFactionSelect() {
  $('#menu-screen').classList.remove('active');
  $('#faction-screen').classList.add('active');
}

function startGame(faction) {
  clearTimeout(aiTimer);
  chosenFaction = faction;
  selectedAttacker = null;
  const enemyFaction = faction === 'court' ? 'coven' : 'court';
  game = {
    players: [
      { faction, vitality: 30, essence: 0, maxEssence: 0, deck: makeDeck(faction), hand: [], board: [] },
      { faction: enemyFaction, vitality: 30, essence: 0, maxEssence: 0, deck: makeDeck(enemyFaction), hand: [], board: [] }
    ],
    active: 0,
    turn: 0,
    over: false,
    message: 'The eternal eclipse begins. Your turn.'
  };
  for (let i = 0; i < 5; i++) drawCard(0);
  beginTurn(0);
  renderBattle();
}

function drawCard(playerIndex) {
  const player = game.players[playerIndex];
  if (player.deck.length) player.hand.push(player.deck.pop());
}

function beginTurn(playerIndex) {
  const player = game.players[playerIndex];
  game.turn += 1;
  player.maxEssence = Math.min(10, player.maxEssence + 1);
  player.essence = player.maxEssence;
  player.board.forEach((card) => { card.ready = true; });
  if (game.turn > 1) drawCard(playerIndex);
  game.message = playerIndex === 0
    ? 'Your turn. Play a card or attack.'
    : `${FACTIONS[player.faction].name} takes its turn…`;
}

function playCard(cardId) {
  if (!game || game.over || game.active !== 0) return;
  const player = game.players[0];
  const index = player.hand.findIndex((card) => card.id === cardId);
  if (index < 0) return;
  const card = player.hand[index];
  if (card.cost > player.essence) {
    game.message = 'Not enough Essence to play that card.';
    renderBattle();
    return;
  }
  if (card.type !== 'spell' && player.board.length >= 7) {
    game.message = 'Your battlefield is full.';
    renderBattle();
    return;
  }
  player.essence -= card.cost;
  player.hand.splice(index, 1);
  if (card.type === 'spell') {
    game.players[1].vitality -= 3;
  } else {
    card.ready = false;
    player.board.push(card);
    resolveSummon(card, 0);
  }
  removeDefeated();
  checkVictory();
  if (!game.over) {
    game.message = `${card.name} ${card.type === 'spell' ? 'is cast' : 'joins the battlefield'}.`;
  }
  renderBattle();
}

function resolveSummon(card, ownerIndex) {
  const owner = game.players[ownerIndex];
  const rival = game.players[1 - ownerIndex];
  if (card.effect === 'heal') owner.vitality = Math.min(30, owner.vitality + 2);
  if (card.effect === 'greatHeal') owner.vitality = Math.min(30, owner.vitality + 3);
  if (card.effect === 'strike') rival.vitality -= 2;
  if (card.effect === 'bloodPrice') {
    owner.vitality -= 1;
    rival.vitality -= 1;
  }
  if (card.effect === 'bolt' && rival.board.length) {
    const target = rival.board.slice().sort((a, b) =>
      (a.health - a.damage) - (b.health - b.damage)
    )[0];
    target.damage += 2;
  }
}

function attack(targetId = null, face = false) {
  if (!game || game.over || game.active !== 0 || !selectedAttacker) return;
  const attacker = game.players[0].board.find((card) => card.id === selectedAttacker);
  if (!attacker || !attacker.ready) {
    selectedAttacker = null;
    renderBattle();
    return;
  }
  const enemies = game.players[1].board;
  if (face && enemies.length) {
    game.message = 'Defeat the opposing creatures before attacking their leader.';
    selectedAttacker = null;
    renderBattle();
    return;
  }
  if (face) {
    game.players[1].vitality -= attacker.attack;
  } else {
    const defender = enemies.find((card) => card.id === targetId);
    if (!defender) return;
    defender.damage += attacker.attack;
    attacker.damage += defender.attack;
  }
  attacker.ready = false;
  selectedAttacker = null;
  removeDefeated();
  checkVictory();
  if (!game.over) {
    game.message = face
      ? `${attacker.name} strikes the enemy leader!`
      : `${attacker.name} clashes with an enemy creature.`;
  }
  renderBattle();
}

function removeDefeated() {
  game.players.forEach((player) => {
    player.board = player.board.filter((card) => card.damage < card.health);
  });
}

function checkVictory() {
  const [human, enemy] = game.players;
  if (human.vitality <= 0 || enemy.vitality <= 0) {
    game.over = true;
    game.winner = human.vitality > 0 ? 0 : enemy.vitality > 0 ? 1 : -1;
  }
}

function endTurn() {
  if (!game || game.over || game.active !== 0) return;
  selectedAttacker = null;
  game.active = 1;
  beginTurn(1);
  renderBattle();
  aiTimer = setTimeout(runAI, 700);
}

function runAI() {
  if (!game || game.over) return;
  const ai = game.players[1];
  let played = true;
  while (played && ai.board.length < 7 && !game.over) {
    played = false;
    const choices = ai.hand.filter((card) => card.cost <= ai.essence).sort((a, b) => {
      const aScore = (a.type === 'spell' ? 0 : 10) + a.cost;
      const bScore = (b.type === 'spell' ? 0 : 10) + b.cost;
      return bScore - aScore;
    });
    if (choices.length) {
      const card = choices[0];
      ai.hand.splice(ai.hand.indexOf(card), 1);
      ai.essence -= card.cost;
      if (card.type === 'spell') {
        game.players[0].vitality -= 3;
      } else {
        card.ready = false;
        ai.board.push(card);
        resolveSummon(card, 1);
      }
      removeDefeated();
      checkVictory();
      played = true;
    }
  }
  if (!game.over) {
    for (const attacker of ai.board.filter((card) => card.ready)) {
      if (game.players[0].board.length) {
        const target = game.players[0].board
          .slice()
          .sort((a, b) => (a.health - a.damage) - (b.health - b.damage))[0];
        target.damage += attacker.attack;
        attacker.damage += target.attack;
      } else {
        game.players[0].vitality -= attacker.attack;
      }
      attacker.ready = false;
      removeDefeated();
      checkVictory();
      if (game.over) break;
    }
  }
  if (game.over) {
    renderBattle();
    return;
  }
  game.active = 0;
  beginTurn(0);
  renderBattle();
}

function cardMarkup(card, zone, ownerIndex) {
  const factionClass = FACTIONS[game.players[ownerIndex].faction].style;
  const health = card.health ? Math.max(0, card.health - card.damage) : '';
  const canPlay = zone === 'hand' && ownerIndex === 0 &&
    game.players[0].essence >= card.cost && game.active === 0;
  const isSelected = selectedAttacker === card.id;
  const tag = zone === 'hand' ? 'button' : 'div';
  const classes = [
    'card',
    zone === 'field' ? 'creature' : '',
    factionClass,
    zone === 'hand' && !canPlay ? 'unplayable' : '',
    isSelected ? 'selected' : '',
    zone === 'field' && card.ready ? 'ready' : ''
  ].filter(Boolean).join(' ');
  const actionAttributes = zone === 'hand'
    ? `data-play="${card.id}" aria-label="Play ${card.name}, cost ${card.cost}"`
    : `data-card="${card.id}" data-owner="${ownerIndex}"`;

  return `<${tag} class="${classes}" ${actionAttributes} ${zone === 'hand' ? 'type="button"' : ''}>
    <span class="card-cost">${card.cost}</span>
    <strong class="card-name">${card.name}</strong>
 <div class="card-portrait">
  ${card.image 
    ? `<img src="${card.image}" alt="Artwork for ${card.name}" loading="lazy">`
    : '<span class="portrait-placeholder">✦</span>'}
</div>
    <div class="card-text">${card.ability}</div>
    ${card.attack ? `<div class="card-stats"><span>${card.attack}</span><span>${health}</span></div>` : ''}
  </${tag}>`;
}

function renderBattle() {
  if (!game) return;
  const human = game.players[0];
  const enemy = game.players[1];
  const winnerMarkup = game.over ? `
    <div class="game-over-panel">
      <p class="eyebrow">THE ECLIPSE HAS SPOKEN</p>
      <h2>${game.winner === 0 ? 'VICTORY' : game.winner === 1 ? 'DEFEAT' : 'DRAW'}</h2>
      <p>${game.winner === 0 ? 'The Veil answers to you.' : 'The eclipse claims this battle. Rise and fight again.'}</p>
      <button id="restart-button" class="gold-button" type="button">PLAY AGAIN</button>
      <button id="menu-button" class="silver-button" type="button">MAIN MENU</button>
    </div>` : '';

  app.innerHTML = `<section id="battle-screen" class="screen active">
    <header class="battle-header">
      <div class="player-stat">
        <strong>${FACTIONS[enemy.faction].name} · COMPUTER</strong>
        <b>♥ ${Math.max(0, enemy.vitality)} Vitality</b>
        <span>Deck: ${enemy.deck.length}</span>
      </div>
      <div class="turn-panel">
        <span>TURN ${Math.max(1, Math.ceil(game.turn / 2))}</span>
        <strong>${game.active === 0 ? `Essence ${human.essence}/${human.maxEssence}` : 'Opponent’s turn'}</strong>
      </div>
      <div class="player-stat right">
        <strong>${FACTIONS[human.faction].name} · YOU</strong>
        <b>♥ ${Math.max(0, human.vitality)} Vitality</b>
        <span>Deck: ${human.deck.length}</span>
      </div>
    </header>
    <div id="battle-message" role="status" aria-live="polite">${game.message}</div>
    <main class="battlefield">
      <section class="side enemy-side">
        <h3>${FACTIONS[enemy.faction].leader}</h3>
        <button class="silver-button" id="enemy-leader" type="button">
          ATTACK LEADER · ${Math.max(0, enemy.vitality)} ♥
        </button>
        <div class="field-row">${enemy.board.map((card) => cardMarkup(card, 'field', 1)).join('')}</div>
      </section>
      <div class="divider">✦ THE VEIL ✦</div>
      <section class="side player-side">
        <h3>${FACTIONS[human.faction].leader}</h3>
        <div class="field-row">${human.board.map((card) => cardMarkup(card, 'field', 0)).join('')}</div>
      </section>
    </main>
    <section class="hand-area">
      <div class="hand-header">
        <strong>Your hand (${human.hand.length}) · 40-card starter deck</strong>
        <button class="gold-button" id="end-turn" type="button"
          ${game.active !== 0 || game.over ? 'disabled' : ''}>END TURN</button>
      </div>
      <div class="hand">
        ${human.hand.map((card) => cardMarkup(card, 'hand', 0)).join('') || '<p>Your hand is empty.</p>'}
      </div>
    </section>
    ${winnerMarkup}
  </section>`;

  app.querySelectorAll('[data-play]').forEach((button) => {
    button.addEventListener('click', () => playCard(button.dataset.play));
  });
  app.querySelectorAll('[data-card]').forEach((cardElement) => {
    cardElement.addEventListener('click', () => {
      const id = cardElement.dataset.card;
      const owner = Number(cardElement.dataset.owner);
      if (owner === 0 && game.active === 0 && !game.over) {
        const card = human.board.find((item) => item.id === id);
        if (card && card.ready) {
          selectedAttacker = selectedAttacker === id ? null : id;
          game.message = selectedAttacker
            ? 'Choose an enemy creature or attack the enemy leader.'
            : 'Attacker deselected.';
          renderBattle();
        }
      } else if (owner === 1 && selectedAttacker) {
        attack(id, false);
      }
    });
  });
  $('#enemy-leader').addEventListener('click', () => attack(null, true));
  $('#end-turn').addEventListener('click', endTurn);
  if (game.over) {
    $('#restart-button').addEventListener('click', () => startGame(chosenFaction));
    $('#menu-button').addEventListener('click', showMenu);
  }
}

showMenu();
