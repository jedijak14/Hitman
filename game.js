(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const app = $('#app');
  const canvas = $('#worldCanvas');
  // The full-screen canvas is owned by the Three.js WebGL renderer (game3d.js).
  const miniCanvas = $('#minimapCanvas');
  const miniCtx = miniCanvas.getContext('2d', { willReadFrequently: true });

  const WORLD = { width: 2200, height: 1400 };
  const BUILDING = { x: 470, y: 145, w: 1080, h: 700 };
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const rand = (min, max) => min + Math.random() * (max - min);

  const contracts = [
    {
      id: 'silent-coast',
      title: 'THE SILENT COAST',
      shortTitle: 'SILENT COAST',
      city: 'MIAMI, FLORIDA',
      venue: 'KRONSTADT INNOVATION SUMMIT',
      hudVenue: 'KRONSTADT SUMMIT',
      day: 'DAY 01',
      theme: 'coast',
      description: 'A private summit. A public spectacle. Two people who know too much.',
      story: 'A private summit has drawn the architects of a covert weapons program to Miami. The press sees a product launch. We see a meeting of people who should never have met.',
      quote: '“Two targets. One clean exit. The rest is up to you.”',
      opportunity: 'The prototype demo has a weakness. Find the right access and make it look like an accident.',
      intelName: 'the black-site memo',
      sabotageName: 'the prototype thermal core',
      targetOne: { name: 'NORA VALE', role: 'DIRECTOR, KRONSTADT R&D', callSign: 'Nora Vale' },
      targetTwo: { name: 'MAREK ROOK', role: 'SUMMIT SECURITY DIRECTOR', callSign: 'Marek Rook' },
      targetOneStart: { x: 1005, y: 325 },
      targetTwoStart: { x: 1400, y: 560 },
      primaryRoute: [
        { x: 1015, y: 335, wait: 7 }, { x: 1150, y: 335, wait: 8 },
        { x: 1150, y: 510, wait: 5 }, { x: 1035, y: 515, wait: 8 },
        { x: 1090, y: 405, wait: 7 }
      ]
    },
    {
      id: 'glasshouse',
      title: 'THE GLASSHOUSE',
      shortTitle: 'GLASSHOUSE',
      city: 'SAPIENZA, ITALY',
      venue: 'VILLA CARUSO · PRIVATE WINE ESTATE',
      hudVenue: 'VILLA CARUSO',
      day: 'DAY 02',
      theme: 'villa',
      description: 'A family fortune. A cellar full of secrets. Two guests who will not be missed.',
      story: 'The Caruso estate is hosting a private auction for a collection that officially does not exist. Its owner and the broker arranging the sale both plan to disappear before dawn.',
      quote: '“The wine is old. The ledger is new. Bring me both.”',
      opportunity: 'An old press still runs beneath the villa. The cellar ledger may tell you how to turn it into an accident.',
      intelName: 'the estate ledger',
      sabotageName: 'the cellar wine press',
      targetOne: { name: 'ELENA CARUSO', role: 'ESTATE OWNER & COLLECTOR', callSign: 'Elena Caruso' },
      targetTwo: { name: 'MATTEO VALLI', role: 'AUCTION BROKER', callSign: 'Matteo Valli' },
      targetOneStart: { x: 1015, y: 335 },
      targetTwoStart: { x: 1400, y: 560 },
      primaryRoute: [
        { x: 1000, y: 350, wait: 8 }, { x: 1150, y: 350, wait: 7 },
        { x: 1160, y: 510, wait: 6 }, { x: 1040, y: 520, wait: 8 },
        { x: 1085, y: 405, wait: 7 }
      ]
    },
    {
      id: 'last-transmission',
      title: 'LAST TRANSMISSION',
      shortTitle: 'LAST SIGNAL',
      city: 'BERLIN, GERMANY',
      venue: 'THE HALCYON · UNDERGROUND EXCHANGE',
      hudVenue: 'THE HALCYON',
      day: 'DAY 03',
      theme: 'night',
      description: 'A basement club. A dead drop in motion. The final link in a dangerous chain.',
      story: 'The Halcyon is a members-only exchange where private security contracts change hands after midnight. Tonight, the buyer and the seller are both on site—and both are on our list.',
      quote: '“When the music stops, make sure they do too.”',
      opportunity: 'The stage-control rack is on a private circuit. Find the access key and the light show can cover your exit.',
      intelName: 'the encrypted server log',
      sabotageName: 'the stage-control rig',
      targetOne: { name: 'NIKOLAI VARGA', role: 'PRIVATE SECURITY BROKER', callSign: 'Nikolai Varga' },
      targetTwo: { name: 'JUNO PARK', role: 'SIGNAL INTELLIGENCE LEAD', callSign: 'Juno Park' },
      targetOneStart: { x: 1015, y: 335 },
      targetTwoStart: { x: 1400, y: 560 },
      primaryRoute: [
        { x: 1000, y: 340, wait: 7 }, { x: 1150, y: 340, wait: 7 },
        { x: 1150, y: 510, wait: 6 }, { x: 1035, y: 515, wait: 7 },
        { x: 1085, y: 405, wait: 9 }
      ]
    }
  ];

  const themes = {
    coast: {
      ground: '#788980', grass: '#587365', paving: '#b6b8af', tile: '#c2c1b8', interior: '#a7a59b',
      wall: '#424b4a', trim: '#e0d8c7', accent: '#3a9aa4', water: '#267c8a', waterLight: '#72b9c2',
      carpet: '#66787a', plant: '#466a53', glow: '#95d9d1', sign: '#db4a42'
    },
    villa: {
      ground: '#61765d', grass: '#49694d', paving: '#ad9c80', tile: '#c6b699', interior: '#ab9374',
      wall: '#514339', trim: '#dfc8a0', accent: '#a15c41', water: '#337887', waterLight: '#84c1c1',
      carpet: '#8e5d44', plant: '#3d6847', glow: '#e1bd75', sign: '#9d4837'
    },
    night: {
      ground: '#333d3d', grass: '#293f3b', paving: '#52585a', tile: '#676260', interior: '#34393c',
      wall: '#161e22', trim: '#838582', accent: '#9063c7', water: '#172d3a', waterLight: '#56418d',
      carpet: '#34334c', plant: '#35534b', glow: '#9e78ed', sign: '#d24955'
    }
  };

  const WALLS = [
    { x: 470, y: 145, w: 1080, h: 19 },
    { x: 470, y: 145, w: 19, h: 700 },
    { x: 1531, y: 145, w: 19, h: 700 },
    { x: 470, y: 826, w: 372, h: 19 },
    { x: 1050, y: 826, w: 500, h: 19 },
    // west service wing and kitchen doors
    { x: 755, y: 145, w: 17, h: 255 },
    { x: 755, y: 444, w: 17, h: 57 },
    { x: 755, y: 501, w: 17, h: 123 },
    { x: 755, y: 688, w: 17, h: 157 },
    { x: 470, y: 438, w: 147, h: 16 },
    { x: 675, y: 438, w: 97, h: 16 },
    // archive and secure server wing
    { x: 1295, y: 164, w: 17, h: 84 },
    { x: 1295, y: 320, w: 17, h: 112 },
    { x: 1295, y: 475, w: 17, h: 115 },
    { x: 1295, y: 658, w: 17, h: 187 },
    { x: 1312, y: 435, w: 218, h: 16 },
    { x: 1312, y: 463, w: 218, h: 14 }
  ];

  const PROPS = [
    { id: 'staff-locker', type: 'outfit', x: 350, y: 885, role: 'event-staff', label: 'SERVICE LOCKER', prompt: 'Take event staff disguise' },
    { id: 'tech-closet', type: 'outfit', x: 607, y: 726, role: 'technician', requiredRole: 'event-staff', label: 'TECH CLOSET', prompt: 'Take technician disguise' },
    { id: 'security-closet', type: 'outfit', x: 700, y: 570, role: 'security', requiredRole: 'event-staff', label: 'SECURITY CLOSET', prompt: 'Take security disguise' },
    { id: 'intel', type: 'intel', x: 1414, y: 255, label: 'INTELLIGENCE TERMINAL' },
    { id: 'sabotage', type: 'sabotage', x: 1400, y: 600, label: 'SERVICE CONTROL' },
    { id: 'prototype', type: 'prototype', x: 1115, y: 405, label: 'DEMO DISPLAY' },
    { id: 'poison', type: 'poison', x: 614, y: 665, label: 'SERVICE CUPBOARD' },
    { id: 'tray', type: 'tray', x: 1035, y: 515, label: 'TASTING TABLE' },
    { id: 'sink', type: 'sink', x: 684, y: 511, label: 'KITCHEN SINK' },
    { id: 'fuse-box', type: 'fuse', x: 1438, y: 767, label: 'FUSE CONTROL' },
    { id: 'fire-alarm', type: 'fire-alarm', x: 816, y: 244, label: 'FIRE ALARM' },
    { id: 'soundboard', type: 'soundboard', x: 1215, y: 739, label: 'AV CONTROL' },
    { id: 'power-strip', type: 'power-strip', x: 1262, y: 760, label: 'STAGE POWER STRIP' },

    { id: 'hide-crate', type: 'hide', x: 438, y: 780, label: 'DELIVERY CRATE', w: 56, h: 43 },
    { id: 'hide-closet', type: 'hide', x: 707, y: 772, label: 'LINEN CLOSET', w: 38, h: 54 },
    { id: 'hide-bin', type: 'hide', x: 1640, y: 1000, label: 'STORAGE BIN', w: 55, h: 42 },
    { id: 'blend', type: 'blend', x: 920, y: 740, label: 'BLEND WITH THE CROWD' },
    { id: 'radio', type: 'radio', x: 1392, y: 747, label: 'SECURITY RADIO' },
    { id: 'exit', type: 'exit', x: 1864, y: 1150, label: 'MARINA EXTRACTION' }
  ];

  const CROWD_COUNT = 1120;
  const CROWD_ZONES = [
    { x: 790, y: 232, w: 470, h: 490, weight: 0.40 },
    { x: 50, y: 305, w: 355, h: 405, weight: 0.19 },
    { x: 1605, y: 478, w: 345, h: 375, weight: 0.20 },
    { x: 80, y: 910, w: 1180, h: 245, weight: 0.21 }
  ];
  const SAFE_ROOMS = [
    { id: 'north-suite', x: 620, y: 240 },
    { id: 'archive-lock', x: 1450, y: 226 },
    { id: 'service-vault', x: 645, y: 754 },
    { id: 'west-office', x: 700, y: 245 }
  ];
  const NAV_CELL = 32;
  const BT_STATUS = Object.freeze({ FAILURE: 0, SUCCESS: 1, RUNNING: 2 });

  let view = { width: 0, height: 0, dpr: 1, zoom: 1 };
  let camera = { x: 1080, y: 610 };
  let mode = 'menu';
  let selectedContract = contracts[0];
  let activeContract = contracts[0];
  let player;
  let npcs = [];
  let baseNpcCount = 0;
  let crowd = null;
  let crowdTick = 0;
  let mission = null;
  let keys = new Set();
  let pressed = new Set();
  let mouse = { x: 0, y: 0, worldX: 1080, worldY: 610, hasMoved: false };
  let currentPromptKey = '';
  let toastId = 0;
  let previousTime = 0;
  let animationTime = 0;
  let soundEnabled = true;
  let audioContext = null;
  let bodyDragOffset = 20;
  let completedContracts = loadProgress();

  function loadProgress() {
    try {
      const value = JSON.parse(localStorage.getItem('silentCoastProgress') || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  function saveProgress() {
    try { localStorage.setItem('silentCoastProgress', JSON.stringify(completedContracts)); } catch { /* local storage may be disabled */ }
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioContext) audioContext = new AudioContextClass();
      if (audioContext.state === 'suspended') audioContext.resume();
      return audioContext;
    } catch { return null; }
  }
  function sfx(kind = 'ui') {
    const audio = ensureAudio();
    if (!audio) return;
    const specs = {
      ui: [440, 0.045, 'sine', 0.024],
      confirm: [620, 0.08, 'triangle', 0.035],
      alert: [170, 0.22, 'sawtooth', 0.032],
      takedown: [105, 0.09, 'triangle', 0.026],
      coin: [880, 0.13, 'sine', 0.025],
      shot: [125, 0.12, 'square', 0.022],
      whisper: [310, 0.18, 'sine', 0.012],
      success: [740, 0.18, 'sine', 0.032]
    };
    const [frequency, duration, type, volume] = specs[kind] || specs.ui;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    if (kind === 'alert' || kind === 'shot') oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.58), audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function outfitLabel(role) {
    return ({
      guest: 'SUMMIT GUEST',
      'event-staff': 'EVENT STAFF',
      technician: 'FACILITY TECH',
      security: 'SECURITY DETAIL',
      executive: 'EXECUTIVE SUIT'
    })[role] || 'CIVILIAN';
  }
  function outfitIcon(role) {
    return ({ guest: 'G', 'event-staff': 'S', technician: 'T', security: '◆', executive: 'E' })[role] || 'G';
  }
  function outfitAccess(role) {
    return ({
      guest: 'PUBLIC AREAS',
      'event-staff': 'PUBLIC · EVENT FLOOR · SERVICE',
      technician: 'PUBLIC · SERVICE · SECURE WING',
      security: 'PUBLIC · ALL RESTRICTED AREAS',
      executive: 'PUBLIC · EVENT FLOOR'
    })[role] || 'PUBLIC AREAS';
  }
  function roleColor(role) {
    return ({
      guest: '#d7d2c1',
      'event-staff': '#477d77',
      technician: '#b66e3e',
      security: '#293133',
      executive: '#74675b'
    })[role] || '#b5b1a6';
  }
  function canAccess(role, region) {
    const access = {
      guest: ['public', 'marina'],
      'event-staff': ['public', 'marina', 'building', 'service'],
      technician: ['public', 'marina', 'building', 'service', 'secure'],
      security: ['public', 'marina', 'building', 'service', 'secure', 'vip'],
      executive: ['public', 'marina', 'building']
    };
    return (access[role] || access.guest).includes(region);
  }

  function btCondition(name, test) {
    return { name, tick: (context) => test(context) ? BT_STATUS.SUCCESS : BT_STATUS.FAILURE };
  }
  function btAction(name, run) {
    return { name, tick(context) { context.npc.behaviorLabel = name; return run(context); } };
  }
  function btSequence(...nodes) {
    return { name: 'Sequence', children: nodes, tick(context) {
      for (const node of nodes) {
        const result = node.tick(context);
        if (result !== BT_STATUS.SUCCESS) return result;
      }
      return BT_STATUS.SUCCESS;
    } };
  }
  function btSelector(...nodes) {
    return { name: 'Priority Selector', children: nodes, tick(context) {
      for (const node of nodes) {
        const result = node.tick(context);
        if (result !== BT_STATUS.FAILURE) return result;
      }
      return BT_STATUS.FAILURE;
    } };
  }
  function setIntent(intent, modeName = intent) {
    return btAction(modeName, ({ npc }) => {
      npc.intent = intent;
      return BT_STATUS.RUNNING;
    });
  }
  function createBehaviorTree(category) {
    const always = btCondition('Always', () => true);
    if (category === 'guard') {
      return btSelector(
        btSequence(btCondition('Visual threat contact', ({ npc }) => Boolean(npc.knowledge.threatVisible)), setIntent('combat', 'Engage visible threat')),
        btSequence(btCondition('Protectee evacuating', ({ npc, mission: state }) => Boolean(state.evacuating && npc.protectedTargetId)), setIntent('escort', 'Protective escort')),
        btSequence(btCondition('Known threat / radio alert', ({ npc, mission: state }) => Boolean(npc.alarmed || state.alarm)), setIntent('combat', 'Armed response')),
        btSequence(btCondition('Body requires inspection', ({ npc }) => Boolean(npc.bodyCheck)), setIntent('investigate-body', 'Check body')),
        btSequence(btCondition('Body report received', ({ npc }) => Boolean(npc.incomingBodyReport)), setIntent('investigate-report', 'Respond to witness report')),
        btSequence(btCondition('Repair task assigned', ({ npc }) => Boolean(npc.task)), setIntent('task', 'Respond to disturbance')),
        btSequence(btCondition('Assigned search perimeter', ({ npc }) => Boolean(npc.searchId)), setIntent('search', 'Sweep search sector')),
        btSequence(btCondition('Sound contact', ({ npc }) => Boolean(npc.knowledge.soundTarget)), setIntent('investigate-sound', 'Investigate sound')),
        btSequence(btCondition('Suspicious contact', ({ npc }) => npc.suspicion > 0.15), setIntent('inspect', 'Challenge suspicious person')),
        btSequence(always, setIntent('patrol', 'Resume patrol'))
      );
    }
    if (category === 'target') {
      return btSelector(
        btSequence(btCondition('Evacuation order', ({ npc }) => Boolean(npc.evacuating)), setIntent('evacuate', 'Evacuate to safe room')),
        btSequence(btCondition('Story opportunity override', ({ npc }) => Boolean(npc.overridePoint)), setIntent('scripted', 'Follow opportunity cue')),
        btSequence(btCondition('Threat seen', ({ npc }) => Boolean(npc.knowledge.threatVisible)), setIntent('evacuate', 'Escape immediate threat')),
        btSequence(always, setIntent('schedule', 'Follow target schedule'))
      );
    }
    return btSelector(
      btSequence(btCondition('Immediate danger', ({ npc }) => npc.panicTimer > 0), setIntent('flee', 'Flee from danger')),
      btSequence(btCondition('Incident to report', ({ npc }) => Boolean(npc.pendingReport)), setIntent('report', 'Report incident to security')),
      btSequence(btCondition('Repair task assigned', ({ npc }) => Boolean(npc.task)), setIntent('task', 'Correct maintenance fault')),
      btSequence(btCondition('Sound contact', ({ npc }) => Boolean(npc.knowledge.soundTarget)), setIntent('investigate-sound', 'Investigate nearby sound')),
      btSequence(btCondition('Cowering', ({ npc }) => npc.cowering), setIntent('cower', 'Take cover and stay low')),
      btSequence(always, setIntent('patrol', 'Return to civilian routine'))
    );
  }

  function makePlayer(x, y) {
    return {
      x, y, radius: 11, faceX: 1, faceY: 0, speed: 128, walkCycle: 0,
      disguise: 'guest', crouched: false, blending: false, dragging: null,
      selectedItem: 'wire', ammo: 8, coins: 3, poison: false, weaponVisibleTimer: 0,
      footsteps: 0, dragSoundTimer: 0, health: 100, wasMoving: false
    };
  }

  function makeNpc(data) {
    const role = data.role || 'guest';
    const category = data.category || (data.target ? 'target' : role === 'security' ? 'guard' : 'civilian');
    const sharedKnowledge = {
      lastSeenPlayer: null, lastSeenAt: -Infinity, lastHeard: null,
      heardEvents: new Set(), soundTarget: null, soundMemory: [],
      observedBodies: new Set(), knownThreats: new Map(), threatVisible: false
    };
    const knowledge = category === 'guard'
      ? { ...sharedKnowledge, radioReports: [], confirmedBodies: new Set(), searchCases: new Set(), patrolSector: data.sector || 'venue' }
      : category === 'target'
        ? { ...sharedKnowledge, routeNotes: [], evacuationOrder: false }
        : { ...sharedKnowledge, witnessReports: 0, panicPoint: null, reportsSent: 0, familiarGuards: new Set() };
    return {
      id: data.id, name: data.name || '', title: data.title || '', role, category,
      x: data.x, y: data.y, radius: data.radius || (data.promotedFromCrowd ? 4.5 : 10), color: roleColor(role),
      target: Boolean(data.target), targetKey: data.targetKey || '', route: data.route || [],
      routeIndex: 0, wait: data.wait || rand(0.4, 1.5), speed: data.speed || 34,
      facing: data.facing || 0, mode: 'patrol', intent: 'patrol', behaviorLabel: 'Resume patrol',
      behaviorTree: createBehaviorTree(category), knowledge, suspicion: 0, investigatePoint: null,
      investigateTimer: 0, searchTimer: 0, caughtTimer: 0, down: false, dead: false,
      hidden: false, evidenceState: 'exposed', disguiseTaken: false, discovered: false, alertCall: 0,
      hearing: data.hearing || (category === 'guard' ? 220 : 155),
      visionRange: data.visionRange || (category === 'guard' ? 265 : category === 'target' ? 195 : 165),
      fov: data.fov || (category === 'guard' ? 1.42 : category === 'target' ? 1.48 : 1.72),
      isGuard: category === 'guard', enforcer: Boolean(data.enforcer), primary: Boolean(data.primary), alarmed: false,
      weapon: category === 'guard' ? { kind: 'pistol', drawn: false, ammo: 12, reloadTimer: 0, fireCooldown: rand(.1, .8) } : null,
      combatState: 'holstered', incomingBodyReport: null, bodyCheck: null, searchId: null,
      searchIndex: 0, searchStepTimer: 0, protectedTargetId: null, escortSlot: 0,
      task: null, panicTimer: 0, cowering: false, fleePoint: null, pendingReport: null,
      reportGuardId: null, reportPoint: null, evacuationPoint: null, evacuationRoom: null,
      evacuating: false, evacuationTimer: 0, overridePoint: null, overrideEvent: null,
      navPath: [], navIndex: 0, navGoal: null, navReplanTimer: 0, stuckTimer: 0,
      poisonTimer: 0, bodyReported: false, bodyDiscovered: false, checkedBody: false,
      crowdAgentIndex: data.crowdAgentIndex ?? -1, promotedFromCrowd: Boolean(data.promotedFromCrowd),
      promotedAt: 0, lastActionAt: 0, damageCooldown: 0
    };
  }

  function createNPCs(contract) {
    const primary = makeNpc({
      id: 'target-primary', name: contract.targetOne.callSign, title: contract.targetOne.role,
      role: 'executive', x: contract.targetOneStart.x, y: contract.targetOneStart.y,
      target: true, targetKey: 'primary', primary: true, speed: 31,
      route: contract.primaryRoute.map((point) => ({ ...point }))
    });
    const secondary = makeNpc({
      id: 'target-secondary', name: contract.targetTwo.callSign, title: contract.targetTwo.role,
      role: 'security', x: contract.targetTwoStart.x, y: contract.targetTwoStart.y,
      target: true, targetKey: 'secondary', speed: 29,
      route: [{ x: 1400, y: 555, wait: 6 }, { x: 1390, y: 625, wait: 6 }, { x: 1260, y: 625, wait: 7 }, { x: 1190, y: 700, wait: 8 }, { x: 1260, y: 625, wait: 6 }, { x: 1390, y: 625, wait: 6 }]
    });
    const cast = [
      primary, secondary,
      makeNpc({ id: 'guard-west', name: 'Security', role: 'security', x: 830, y: 300, route: [{ x: 830, y: 300, wait: 2 }, { x: 930, y: 300, wait: 2 }, { x: 930, y: 430, wait: 2 }, { x: 830, y: 430, wait: 2 }], speed: 37 }),
      makeNpc({ id: 'guard-hall', name: 'Security', role: 'security', enforcer: true, x: 1190, y: 670, route: [{ x: 1190, y: 670, wait: 2 }, { x: 1240, y: 560, wait: 3 }, { x: 1190, y: 460, wait: 2 }], speed: 39 }),
      makeNpc({ id: 'guard-dock', name: 'Security', role: 'security', x: 975, y: 875, route: [{ x: 845, y: 875, wait: 2 }, { x: 1080, y: 875, wait: 2 }], speed: 42 }),
      makeNpc({ id: 'guard-archive', name: 'Security', role: 'security', enforcer: true, x: 1415, y: 365, route: [{ x: 1415, y: 365, wait: 3 }, { x: 1490, y: 365, wait: 3 }, { x: 1490, y: 235, wait: 3 }], speed: 34 }),
      makeNpc({ id: 'tech-east', name: 'Facilities', role: 'technician', x: 1380, y: 720, route: [{ x: 1380, y: 720, wait: 3 }, { x: 1460, y: 720, wait: 3 }, { x: 1460, y: 520, wait: 3 }], speed: 27 }),
      makeNpc({ id: 'tech-west', name: 'Facilities', role: 'technician', x: 590, y: 560, route: [{ x: 590, y: 560, wait: 3 }, { x: 690, y: 560, wait: 3 }, { x: 690, y: 700, wait: 3 }], speed: 29 }),
      makeNpc({ id: 'staff-west', name: 'Catering', role: 'event-staff', x: 700, y: 745, route: [{ x: 700, y: 745, wait: 3 }, { x: 590, y: 745, wait: 3 }], speed: 25 }),
      makeNpc({ id: 'staff-hall', name: 'Catering', role: 'event-staff', x: 1035, y: 650, route: [{ x: 1035, y: 650, wait: 3 }, { x: 1120, y: 650, wait: 2 }, { x: 1120, y: 575, wait: 3 }], speed: 24 }),
      makeNpc({ id: 'guest-patio', name: 'Guest', role: 'guest', x: 1650, y: 700, route: [{ x: 1650, y: 700, wait: 4 }, { x: 1780, y: 700, wait: 5 }, { x: 1760, y: 820, wait: 4 }], speed: 22, visionRange: 140, hearing: 120 }),
      makeNpc({ id: 'guest-hall', name: 'Guest', role: 'guest', x: 1110, y: 750, route: [{ x: 1110, y: 750, wait: 4 }, { x: 1210, y: 750, wait: 4 }, { x: 1210, y: 600, wait: 4 }], speed: 23, visionRange: 145 }),
      makeNpc({ id: 'guest-plaza', name: 'Guest', role: 'guest', x: 260, y: 585, route: [{ x: 260, y: 585, wait: 4 }, { x: 380, y: 590, wait: 4 }, { x: 370, y: 680, wait: 4 }], speed: 20, visionRange: 135, hearing: 105 }),
      makeNpc({ id: 'guest-walk', name: 'Guest', role: 'guest', x: 1585, y: 940, route: [{ x: 1585, y: 940, wait: 4 }, { x: 1780, y: 940, wait: 5 }, { x: 1720, y: 1070, wait: 3 }], speed: 21, visionRange: 140 })
    ];
    return cast;
  }

  function createCrowd() {
    const population = {
      x: new Float32Array(CROWD_COUNT), y: new Float32Array(CROWD_COUNT),
      destinationX: new Float32Array(CROWD_COUNT), destinationY: new Float32Array(CROWD_COUNT),
      speed: new Float32Array(CROWD_COUNT), phase: new Float32Array(CROWD_COUNT),
      zone: new Uint8Array(CROWD_COUNT), palette: new Uint8Array(CROWD_COUNT),
      promoted: new Uint8Array(CROWD_COUNT)
    };
    for (let i = 0; i < CROWD_COUNT; i += 1) {
      let roll = Math.random();
      let zoneIndex = 0;
      while (zoneIndex < CROWD_ZONES.length - 1 && roll > CROWD_ZONES[zoneIndex].weight) {
        roll -= CROWD_ZONES[zoneIndex].weight;
        zoneIndex += 1;
      }
      const zone = CROWD_ZONES[zoneIndex];
      let x = zone.x + zone.w * .5;
      let y = zone.y + zone.h * .5;
      for (let attempt = 0; attempt < 18; attempt += 1) {
        x = zone.x + rand(8, zone.w - 8);
        y = zone.y + rand(8, zone.h - 8);
        if (!collidesWall(x, y, 3)) break;
      }
      population.x[i] = x;
      population.y[i] = y;
      population.zone[i] = zoneIndex;
      population.palette[i] = i % 4;
      population.speed[i] = rand(5, 13);
      population.phase[i] = rand(0, TAU);
      population.destinationX[i] = clamp(x + rand(-34, 34), zone.x + 8, zone.x + zone.w - 8);
      population.destinationY[i] = clamp(y + rand(-34, 34), zone.y + 8, zone.y + zone.h - 8);
    }
    crowdTick = 0;
    return population;
  }

  function crowdFleeGoal(index, x, y, origin = null) {
    const useCrowd = index >= 0 && crowd;
    const point = useCrowd ? { x: crowd.x[index], y: crowd.y[index] } : origin || { x, y };
    let zone = useCrowd ? CROWD_ZONES[crowd.zone[index]] : CROWD_ZONES.find((item) => point.x >= item.x && point.x <= item.x + item.w && point.y >= item.y && point.y <= item.y + item.h);
    zone ||= { x: 24, y: 45, w: WORLD.width - 48, h: WORLD.height - 90 };
    let dx = point.x - x;
    let dy = point.y - y;
    const length = Math.hypot(dx, dy) || 1;
    dx /= length; dy /= length;
    const distanceAway = rand(130, 240);
    let goal = {
      x: clamp(point.x + dx * distanceAway, zone.x + 12, zone.x + zone.w - 12),
      y: clamp(point.y + dy * distanceAway, zone.y + 12, zone.y + zone.h - 12)
    };
    if (collidesWall(goal.x, goal.y, 8)) goal = { x: zone.x + zone.w * .5, y: zone.y + zone.h * .5 };
    return goal;
  }

  function promoteCrowdAround(x, y, radius, kind, detail = null, requested = 18) {
    if (!mission || !crowd) return 0;
    const active = npcs.filter((npc) => npc.promotedFromCrowd && !npc.hidden && !npc.down && !npc.dead).length;
    const count = Math.min(requested, Math.max(0, 48 - active));
    if (!count) return 0;
    const candidates = [];
    for (let i = 0; i < CROWD_COUNT; i += 1) {
      if (crowd.promoted[i]) continue;
      const d = Math.hypot(crowd.x[i] - x, crowd.y[i] - y);
      if (d < radius) candidates.push({ index: i, distance: d });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    let promoted = 0;
    for (const entry of candidates.slice(0, count)) {
      const i = entry.index;
      crowd.promoted[i] = 1;
      const npc = makeNpc({
        id: `crowd-${i}`, name: 'Guest', role: 'guest', category: 'civilian',
        x: crowd.x[i], y: crowd.y[i], speed: 44, hearing: 190, visionRange: 148,
        radius: 5.5, promotedFromCrowd: true, crowdAgentIndex: i
      });
      npc.promotedAt = mission.elapsed;
      npc.lastKnownGroupZone = crowd.zone[i];
      if (kind === 'body-report' || kind === 'body-seen') {
        const roll = (i % 10) / 10;
        if (roll < .48) {
          npc.pendingReport = { point: { x, y }, bodyId: detail?.id || null, type: 'body', createdAt: mission.elapsed };
          npc.reportPoint = { x, y };
          const guard = nearestGuard(npc);
          npc.reportGuardId = guard?.id || null;
          npc.intent = 'report';
          npc.mode = 'report';
        } else if (roll < .88) {
          npc.panicTimer = 6;
          npc.fleePoint = crowdFleeGoal(i, x, y);
          npc.intent = 'flee';
          npc.mode = 'flee';
        } else {
          npc.cowering = true;
          npc.panicTimer = 5;
          npc.intent = 'cower';
          npc.mode = 'cower';
        }
      } else if (kind === 'fire-alarm' || kind === 'gunshot' || kind === 'impact') {
        const roll = (i % 7) / 7;
        if (roll < .67) {
          npc.panicTimer = 7;
          npc.fleePoint = crowdFleeGoal(i, x, y);
          npc.intent = 'flee';
          npc.mode = 'flee';
        } else if (roll < .85) {
          npc.cowering = true;
          npc.panicTimer = 5;
          npc.intent = 'cower';
          npc.mode = 'cower';
        } else {
          npc.knowledge.soundTarget = { x, y, kind, createdAt: mission.elapsed };
          npc.intent = 'investigate-sound';
          npc.mode = 'investigate';
        }
      } else {
        npc.knowledge.soundTarget = { x, y, kind, createdAt: mission.elapsed };
        npc.intent = 'investigate-sound';
        npc.mode = 'investigate';
      }
      npcs.push(npc);
      promoted += 1;
    }
    if (promoted) mission.promotedCrowdTotal += promoted;
    return promoted;
  }

  function updateCrowd(dt) {
    if (!crowd || mode !== 'playing') return;
    crowdTick += dt;
    if (crowdTick < .1) return;
    const step = Math.min(.3, crowdTick);
    crowdTick = 0;
    for (let i = 0; i < CROWD_COUNT; i += 1) {
      if (crowd.promoted[i]) continue;
      const zone = CROWD_ZONES[crowd.zone[i]];
      let dx = crowd.destinationX[i] - crowd.x[i];
      let dy = crowd.destinationY[i] - crowd.y[i];
      let d = Math.hypot(dx, dy);
      if (d < 4 || collidesWall(crowd.destinationX[i], crowd.destinationY[i], 3)) {
        crowd.destinationX[i] = clamp(crowd.x[i] + rand(-42, 42), zone.x + 8, zone.x + zone.w - 8);
        crowd.destinationY[i] = clamp(crowd.y[i] + rand(-42, 42), zone.y + 8, zone.y + zone.h - 8);
        continue;
      }
      const amount = Math.min(d, crowd.speed[i] * step);
      crowd.x[i] += (dx / d) * amount;
      crowd.y[i] += (dy / d) * amount;
      if (collidesWall(crowd.x[i], crowd.y[i], 3)) {
        crowd.x[i] -= (dx / d) * amount;
        crowd.y[i] -= (dy / d) * amount;
        crowd.destinationX[i] = clamp(crowd.x[i] + rand(-48, 48), zone.x + 8, zone.x + zone.w - 8);
        crowd.destinationY[i] = clamp(crowd.y[i] + rand(-48, 48), zone.y + 8, zone.y + zone.h - 8);
      }
      crowd.phase[i] += step * (crowd.speed[i] / 7);
      if (Math.random() < step * .16) {
        crowd.destinationX[i] = clamp(crowd.x[i] + rand(-48, 48), zone.x + 8, zone.x + zone.w - 8);
        crowd.destinationY[i] = clamp(crowd.y[i] + rand(-48, 48), zone.y + 8, zone.y + zone.h - 8);
      }
    }
  }

  function initMenuScene(contract = selectedContract) {
    activeContract = contract;
    mission = null;
    player = makePlayer(1035, 840);
    npcs = createNPCs(contract);
    baseNpcCount = npcs.length;
    crowd = createCrowd();
    camera = { x: 1060, y: 620 };
    setCameraZoom();
  }

  function beginMission(contract = selectedContract) {
    activeContract = contract;
    selectedContract = contract;
    mission = {
      elapsed: 0, suspicion: 0, alarm: false, alarmTimer: 0, alarmReason: '',
      intelFound: false, sabotage: false, hasPoison: false, poisonedTray: false,
      targets: { primary: false, secondary: false }, extracted: false, failed: false,
      bodyDiscoveries: 0, civilianCasualties: 0, scoreBonus: 0, noiseEvents: [],
      globalAlertCooldown: 0, captureTimer: 0, activeEffectTimer: 0, soundSuppressed: false,
      usedOutfits: new Set(), effects: [], coinsOnGround: [], enteredVenue: false,
      suspicionLevels: Object.create(null), compromisedDisguises: new Set(), suspicionKey: '',
      searches: [], nextSearchId: 1, nextSoundId: 1, promotedCrowdTotal: 0,
      lastCrowdPromotion: -10, worldEvents: { sinkOverflow: false, fuseFault: false, powerFault: false, lightsOut: false, fireAlarm: false },
      worldEventTimer: 0, taskIds: 1, evacuating: false, evacuationReason: '',
      combatLastHit: 0, lockdowns: new Map(), bodyReports: [], lastSuspicionCall: -10, suppression: 0,
      alertOrigin: null
    };
    player = makePlayer(315, 890);
    player.health = 100;
    npcs = createNPCs(contract);
    baseNpcCount = npcs.length;
    crowd = createCrowd();
    keys.clear();
    pressed.clear();
    currentPromptKey = '';
    $('#minimapWrap').classList.remove('expanded');
    updateContractUI(contract);
    updateHudStatic();
    renderObjectives();
    setMode('playing');
    showToast('CONTRACT LIVE', `${contract.title} · Two targets. Find an exit.`, 'good');
    sfx('confirm');
    requestAnimationFrame(() => { updateContextPrompt(); });
  }

  function setCameraZoom() {
    view.zoom = clamp(Math.min(view.width / 1470, view.height / 820), 0.64, 1.02);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    view.width = Math.max(1, rect.width);
    view.height = Math.max(1, rect.height);
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (window.SilentCoast3D) window.SilentCoast3D.resize(view.width, view.height, view.dpr);
    setCameraZoom();
    resizeMiniMap();
  }
  function resizeMiniMap() {
    const rect = miniCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (rect.width > 0 && rect.height > 0) {
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (miniCanvas.width !== width || miniCanvas.height !== height) {
        miniCanvas.width = width;
        miniCanvas.height = height;
      }
    }
  }
  window.addEventListener('resize', resize);

  function setMode(next) {
    mode = next;
    app.dataset.state = next;
    $('#titleScreen').hidden = next !== 'menu';
    $('#briefingScreen').hidden = next !== 'briefing';
    $('#pauseScreen').hidden = next !== 'paused';
    $('#endScreen').hidden = next !== 'ended';
    $('#manualScreen').hidden = next !== 'manual';
    $('#gameHud').hidden = !['playing', 'paused'].includes(next);
    if (next === 'paused') {
      $('#pauseMissionName').textContent = activeContract.title;
      $('#pauseDisguise').textContent = outfitLabel(player.disguise);
    }
    if (next === 'playing') {
      keys.clear();
      pressed.clear();
    }
  }

  function updateContractUI(contract) {
    $('#topMissionLabel').textContent = contract.city;
    $('#titleLocation').textContent = contract.city;
    $('#titleHeading').innerHTML = contract.title.replace(/ (?!.* )/, '<br />');
    $('#titleCode').textContent = `${String(Math.max(0, contracts.indexOf(contract)) + 1).padStart(2, '0')} / ${String(contracts.length).padStart(2, '0')}`;
    $('#titleDescription').textContent = contract.description;
    $('#titleVenue').textContent = contract.venue;
    $('#briefingLocation').textContent = contract.city;
    $('#briefingHeading').textContent = contract.title;
    $('#briefingVenue').textContent = `${contract.venue} · ${contract.day}`;
    $('#briefingStory').textContent = contract.story;
    $('#briefingQuote').textContent = contract.quote;
    $('#briefingOpportunity').textContent = contract.opportunity;
    $('#targetOneName').textContent = contract.targetOne.name;
    $('#targetOneRole').textContent = contract.targetOne.role;
    $('#targetTwoName').textContent = contract.targetTwo.name;
    $('#targetTwoRole').textContent = contract.targetTwo.role;
  }

  function renderContractPicker() {
    const picker = $('#contractPicker');
    picker.innerHTML = '';
    contracts.forEach((contract, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'contract-choice';
      button.setAttribute('aria-pressed', String(contract.id === selectedContract.id));
      const done = completedContracts.includes(contract.id);
      button.innerHTML = `<span>${String(index + 1).padStart(2, '0')} · ${done ? 'COMPLETE' : contract.city}</span><b>${contract.shortTitle}</b>`;
      button.addEventListener('click', () => {
        selectedContract = contract;
        activeContract = contract;
        renderContractPicker();
        updateContractUI(contract);
        initMenuScene(contract);
        sfx('ui');
      });
      picker.append(button);
    });
  }

  function updateHudStatic() {
    if (!mission) return;
    $('#missionCode').textContent = `${String(contracts.indexOf(activeContract) + 1).padStart(2, '0')} / 03`;
    $('#hudMissionTitle').textContent = activeContract.title;
    $('#hudLocation').textContent = `${activeContract.hudVenue} · ${activeContract.city}`;
    $('#disguiseName').textContent = outfitLabel(player.disguise);
    $('#disguiseIcon').textContent = outfitIcon(player.disguise);
    $('#disguiseAccess').textContent = outfitAccess(player.disguise);
    $('#weaponName').textContent = ({ wire: 'FIBER WIRE', pistol: 'SILENCED PISTOL', coin: 'COIN' })[player.selectedItem];
    $('#ammoCount').textContent = player.selectedItem === 'pistol' ? `× ${player.ammo}` : player.selectedItem === 'coin' ? `× ${player.coins}` : '';
    $('#pauseMissionName').textContent = activeContract.title;
    $('#pauseDisguise').textContent = outfitLabel(player.disguise);
    document.querySelectorAll('.weapon-slot').forEach((slot) => slot.classList.toggle('selected', Number(slot.dataset.slot) === ({ wire: 1, pistol: 2, coin: 3 })[player.selectedItem]));
    $('#storyHintButton').innerHTML = `<span>◈</span> ${mission.intelFound ? 'OPPORTUNITY REVEALED' : 'STORY OPPORTUNITY'} <i>↗</i>`;
  }

  function objectiveData() {
    if (!mission) return [];
    return [
      { id: 'primary', text: `Eliminate ${activeContract.targetOne.callSign}`, done: mission.targets.primary, optional: false },
      { id: 'secondary', text: `Eliminate ${activeContract.targetTwo.callSign}`, done: mission.targets.secondary, optional: false },
      { id: 'intel', text: `Recover ${activeContract.intelName}`, done: mission.intelFound, optional: true },
      { id: 'disguise', text: 'Acquire a more useful disguise', done: player.disguise !== 'guest', optional: true },
      { id: 'extract', text: mission.targets.primary && mission.targets.secondary ? 'Reach the marina extraction' : 'Leave the area after the contract', done: mission.extracted, optional: false }
    ];
  }
  function renderObjectives() {
    if (!mission) return;
    const list = $('#objectiveList');
    list.innerHTML = '';
    objectiveData().forEach((objective) => {
      const li = document.createElement('li');
      li.dataset.objective = objective.id;
      li.classList.toggle('is-complete', objective.done);
      li.classList.toggle('is-optional', objective.optional);
      const check = document.createElement('span');
      check.className = 'objective-check';
      check.textContent = '✓';
      const text = document.createElement('span');
      text.textContent = objective.text;
      li.append(check, text);
      if (objective.optional) {
        const optional = document.createElement('small');
        optional.className = 'optional-mark';
        optional.textContent = 'OPTIONAL';
        li.append(optional);
      }
      list.append(li);
    });
  }

  function showToast(title, text, kind = '') {
    if (mode === 'menu' || mode === 'briefing' || mode === 'manual') return;
    const stack = $('#toastStack');
    const toast = document.createElement('div');
    toast.className = `toast ${kind ? `is-${kind}` : ''}`;
    const heading = document.createElement('b');
    heading.textContent = title;
    const copy = document.createElement('span');
    copy.textContent = text;
    toast.append(heading, copy);
    stack.append(toast);
    const id = ++toastId;
    window.setTimeout(() => {
      toast.style.transition = 'opacity .25s, transform .25s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-5px)';
      window.setTimeout(() => toast.remove(), 300);
    }, 3800);
    if (kind === 'alert') sfx('alert');
    else if (kind === 'good') sfx('confirm');
    else sfx('ui');
    return id;
  }

  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }
  function getRegion(x, y) {
    if (x > 1760 && y > 1050) return 'marina';
    if (x > 1550 && x < 1980 && y > 470 && y < 830) return 'vip';
    if (x >= 1307 && x <= 1532 && y >= 164 && y <= 826) return 'secure';
    if (x >= 490 && x <= 755 && y >= 500 && y <= 825) return 'service';
    if (pointInRect(x, y, BUILDING)) return 'building';
    return 'public';
  }
  function regionLabel(region) {
    return ({
      public: 'PUBLIC PLAZA', marina: 'MARINA WALK', vip: 'PRIVATE TERRACE',
      secure: 'SECURITY WING', service: 'SERVICE CORRIDOR', building: 'SUMMIT FLOOR'
    })[region] || 'PUBLIC PLAZA';
  }
  function isTrespassing(x = player.x, y = player.y) {
    return !canAccess(player.disguise, getRegion(x, y));
  }

  function collidesCircleRect(x, y, radius, rect) {
    const closestX = clamp(x, rect.x, rect.x + rect.w);
    const closestY = clamp(y, rect.y, rect.y + rect.h);
    return Math.hypot(x - closestX, y - closestY) < radius;
  }
  function collidesWall(x, y, radius) {
    if (x < radius || y < radius || x > WORLD.width - radius || y > WORLD.height - radius) return true;
    for (const wall of WALLS) {
      if (x + radius < wall.x || x - radius > wall.x + wall.w || y + radius < wall.y || y - radius > wall.y + wall.h) continue;
      if (collidesCircleRect(x, y, radius, wall)) return true;
    }
    return false;
  }
  function lineBlocked(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    for (const wall of WALLS) {
      let tMin = 0;
      let tMax = 1;
      const p = [-dx, dx, -dy, dy];
      const q = [x1 - wall.x, wall.x + wall.w - x1, y1 - wall.y, wall.y + wall.h - y1];
      let hit = true;
      for (let i = 0; i < 4; i += 1) {
        if (Math.abs(p[i]) < 0.00001) {
          if (q[i] < 0) { hit = false; break; }
        } else {
          const r = q[i] / p[i];
          if (p[i] < 0) tMin = Math.max(tMin, r);
          else tMax = Math.min(tMax, r);
          if (tMin > tMax) { hit = false; break; }
        }
      }
      if (hit && tMax > 0.035 && tMin < 0.965) return true;
    }
    return false;
  }
  function moveActor(actor, dx, dy, radius = actor.radius) {
    const nx = actor.x + dx;
    if (!collidesWall(nx, actor.y, radius)) actor.x = nx;
    const ny = actor.y + dy;
    if (!collidesWall(actor.x, ny, radius)) actor.y = ny;
  }

  class MinHeap {
    constructor() { this.items = []; }
    push(item) {
      const items = this.items; items.push(item);
      let i = items.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (items[parent].score <= item.score) break;
        items[i] = items[parent]; i = parent;
      }
      items[i] = item;
    }
    pop() {
      const items = this.items;
      if (!items.length) return null;
      const root = items[0];
      const last = items.pop();
      if (items.length) {
        let i = 0;
        while (true) {
          const left = i * 2 + 1, right = left + 1;
          if (left >= items.length) break;
          let child = right < items.length && items[right].score < items[left].score ? right : left;
          if (items[child].score >= last.score) break;
          items[i] = items[child]; i = child;
        }
        items[i] = last;
      }
      return root;
    }
    get length() { return this.items.length; }
  }
  const NAV_COLS = Math.ceil(WORLD.width / NAV_CELL);
  const NAV_ROWS = Math.ceil(WORLD.height / NAV_CELL);
  const NAV_SIZE = NAV_COLS * NAV_ROWS;
  let navWalkable = null;
  function cellId(column, row) { return row * NAV_COLS + column; }
  function cellCenter(id) {
    const column = id % NAV_COLS;
    const row = Math.floor(id / NAV_COLS);
    return { x: Math.min(WORLD.width - 1, column * NAV_CELL + NAV_CELL / 2), y: Math.min(WORLD.height - 1, row * NAV_CELL + NAV_CELL / 2) };
  }
  function buildNavGrid() {
    if (navWalkable) return navWalkable;
    navWalkable = new Uint8Array(NAV_SIZE);
    for (let row = 0; row < NAV_ROWS; row += 1) {
      for (let column = 0; column < NAV_COLS; column += 1) {
        const center = cellCenter(cellId(column, row));
        navWalkable[cellId(column, row)] = collidesWall(center.x, center.y, 9) ? 0 : 1;
      }
    }
    return navWalkable;
  }
  function nearestWalkableCell(column, row, grid) {
    column = clamp(column, 0, NAV_COLS - 1); row = clamp(row, 0, NAV_ROWS - 1);
    let id = cellId(column, row);
    if (grid[id]) return id;
    for (let radius = 1; radius < 9; radius += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
          if (Math.max(Math.abs(x), Math.abs(y)) !== radius) continue;
          const cx = column + x, cy = row + y;
          if (cx < 0 || cx >= NAV_COLS || cy < 0 || cy >= NAV_ROWS) continue;
          id = cellId(cx, cy);
          if (grid[id]) return id;
        }
      }
    }
    return cellId(column, row);
  }
  function findPath(from, to) {
    const grid = buildNavGrid();
    let startColumn = Math.floor(from.x / NAV_CELL), startRow = Math.floor(from.y / NAV_CELL);
    let endColumn = Math.floor(to.x / NAV_CELL), endRow = Math.floor(to.y / NAV_CELL);
    const start = nearestWalkableCell(startColumn, startRow, grid);
    const end = nearestWalkableCell(endColumn, endRow, grid);
    endColumn = end % NAV_COLS;
    endRow = Math.floor(end / NAV_COLS);
    if (start === end) return [to];
    const cost = new Float32Array(NAV_SIZE); cost.fill(Infinity); cost[start] = 0;
    const cameFrom = new Int32Array(NAV_SIZE); cameFrom.fill(-1);
    const closed = new Uint8Array(NAV_SIZE);
    const open = new MinHeap();
    const heuristic = (id) => {
      const c = id % NAV_COLS, r = Math.floor(id / NAV_COLS);
      const dx = Math.abs(c - endColumn), dy = Math.abs(r - endRow);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    open.push({ id: start, score: heuristic(start) });
    const directions = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];
    let found = false;
    let expanded = 0;
    while (open.length && expanded < NAV_SIZE * 2) {
      const entry = open.pop();
      const id = entry.id;
      if (closed[id]) continue;
      if (id === end) { found = true; break; }
      closed[id] = 1; expanded += 1;
      const c = id % NAV_COLS, r = Math.floor(id / NAV_COLS);
      for (const [dx, dy, stepCost] of directions) {
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nc >= NAV_COLS || nr < 0 || nr >= NAV_ROWS) continue;
        const next = cellId(nc, nr);
        if (!grid[next] || closed[next]) continue;
        if (dx && dy && (!grid[cellId(c + dx, r)] || !grid[cellId(c, r + dy)])) continue;
        const nextCost = cost[id] + stepCost;
        if (nextCost >= cost[next]) continue;
        cost[next] = nextCost; cameFrom[next] = id;
        open.push({ id: next, score: nextCost + heuristic(next) });
      }
    }
    if (!found) return lineBlocked(from.x, from.y, to.x, to.y) ? [] : [to];
    const route = [];
    let cursor = end;
    while (cursor !== start && cursor >= 0) {
      route.push(cellCenter(cursor));
      cursor = cameFrom[cursor];
    }
    route.reverse();
    const last = route[route.length - 1] || from;
    if (distance(last, to) > 8 && !lineBlocked(last.x, last.y, to.x, to.y)) route.push(to);
    return route;
  }
  function navigateNPCTo(npc, goal, speed, dt) {
    if (!goal) return false;
    const goalCellX = Math.floor(goal.x / NAV_CELL), goalCellY = Math.floor(goal.y / NAV_CELL);
    const oldGoal = npc.navGoal;
    if (!oldGoal || Math.floor(oldGoal.x / NAV_CELL) !== goalCellX || Math.floor(oldGoal.y / NAV_CELL) !== goalCellY || npc.navReplanTimer <= 0) {
      npc.navGoal = { x: goal.x, y: goal.y };
      npc.navPath = findPath(npc, goal);
      npc.navIndex = 0;
      npc.navReplanTimer = .8;
    } else npc.navReplanTimer -= dt;
    while (npc.navIndex < npc.navPath.length && distance(npc, npc.navPath[npc.navIndex]) < 13) npc.navIndex += 1;
    const waypoint = npc.navPath[npc.navIndex] || goal;
    const before = { x: npc.x, y: npc.y };
    const reached = moveNPCTo(npc, waypoint.x, waypoint.y, speed, dt);
    if (distance(before, npc) < Math.min(1, speed * dt * .12) && distance(npc, waypoint) > 16) {
      npc.stuckTimer += dt;
      if (npc.stuckTimer > .5) npc.navReplanTimer = 0;
    } else npc.stuckTimer = 0;
    return reached && npc.navIndex >= npc.navPath.length - 1 && distance(npc, goal) < 23;
  }
  function nearestGuard(point, omit = null) {
    let best = null, bestDistance = Infinity;
    for (const npc of npcs) {
      if (npc === omit || !npc.isGuard || npc.dead || npc.down || npc.hidden) continue;
      const d = distance(npc, point);
      if (d < bestDistance) { best = npc; bestDistance = d; }
    }
    return best;
  }

  function disguiseIdentityKey(region = getRegion(player.x, player.y), role = player.disguise) {
    return `${region}|${role}`;
  }
  function setCurrentSuspicion(value) {
    if (!mission) return;
    const key = disguiseIdentityKey();
    mission.suspicionLevels[key] = clamp(value, 0, 100);
    mission.suspicion = mission.suspicionLevels[key];
  }
  function setSuspicionUI() {
    if (!mission) return;
    const region = getRegion(player.x, player.y);
    const key = disguiseIdentityKey(region, player.disguise);
    const value = mission.suspicionLevels[key] || 0;
    mission.suspicion = value;
    const unauthorized = isTrespassing();
    const compromised = mission.compromisedDisguises.has(key);
    const label = $('#regionName');
    label.textContent = regionLabel(region);
    label.classList.toggle('is-trespassing', unauthorized || compromised);
    $('#regionAccess').textContent = compromised ? 'DISGUISE BLOWN' : unauthorized ? 'TRESPASSING' : 'CLEAR';
    $('#disguiseName').textContent = outfitLabel(player.disguise);
    $('#disguiseIcon').textContent = outfitIcon(player.disguise);
    $('#disguiseAccess').textContent = outfitAccess(player.disguise);
    const disguisePanel = $('.disguise-panel');
    disguisePanel.classList.toggle('is-trespassing', unauthorized || compromised);
    disguisePanel.classList.toggle('is-suspicious', value > 18 && !mission.alarm);
    $('#disguiseState').textContent = compromised ? 'DISGUISE BLOWN IN THIS AREA' : unauthorized ? 'OUT OF PLACE' : mission.alarm ? 'IDENTITY COMPROMISED' : value > 18 ? 'UNDER OBSERVATION' : 'UNRECOGNISED';
    $('#suspicionFill').style.width = `${clamp(value, 0, 100)}%`;
    $('#centralSuspicionFill').style.width = `${clamp(value, 0, 100)}%`;
    $('#centralSuspicion').textContent = `${Math.round(clamp(value, 0, 100))}%`;
    $('#suspicionZone').textContent = `${regionLabel(region)} · ${outfitLabel(player.disguise)}`;
    $('#healthFill').style.width = `${clamp(player.health, 0, 100)}%`;
    $('#healthValue').textContent = `${Math.round(clamp(player.health, 0, 100))}%`;
    const alert = $('#alertPanel');
    let level = 'unseen';
    let status = 'UNSEEN';
    let detail = 'NO ONE IS LOOKING';
    const activeSearch = mission.searches.some((search) => search.life > 0);
    if (mission.alarm || compromised) {
      level = 'compromised';
      status = compromised ? 'DISGUISE BLOWN' : 'COMPROMISED';
      detail = mission.alarm ? 'SECURITY IS RESPONDING' : 'ENFORCERS KNOW THIS IDENTITY';
    } else if (activeSearch) {
      level = 'searching';
      status = 'SEARCHING';
      detail = 'SECURITY IS CHECKING THE AREA';
    } else if (value > 26) {
      level = 'suspicious';
      status = 'SUSPICIOUS';
      detail = unauthorized ? 'TRESPASSING DETECTED' : 'SOMEONE IS WATCHING';
    } else if (value > 4) {
      level = 'suspicious';
      status = 'EXPOSED';
      detail = 'STAY OUT OF SIGHT';
    }
    alert.dataset.alert = level;
    $('#alertStatus').textContent = status;
    $('#alertSubstatus').textContent = detail;
  }

  function closestNpc(maxDistance = 60, filter = () => true) {
    let nearest = null;
    let best = maxDistance;
    for (const npc of npcs) {
      if (npc.hidden || !filter(npc)) continue;
      const d = distance(player, npc);
      if (d < best) { best = d; nearest = npc; }
    }
    return nearest ? { npc: nearest, distance: best } : null;
  }
  function closestBody(maxDistance = 60) {
    return closestNpc(maxDistance, (npc) => (npc.down || npc.dead) && !npc.hidden);
  }
  function closestLiveNpc(maxDistance = 52) {
    return closestNpc(maxDistance, (npc) => !npc.down && !npc.dead);
  }
  function propDistance(prop, point = player) {
    if (prop.type === 'hide') return Math.hypot(point.x - prop.x, point.y - prop.y);
    return Math.hypot(point.x - prop.x, point.y - prop.y);
  }
  function closestProp(maxDistance = 62, filter = () => true) {
    let nearest = null;
    let best = maxDistance;
    for (const prop of PROPS) {
      if (!filter(prop)) continue;
      const d = propDistance(prop);
      if (d < best) { nearest = prop; best = d; }
    }
    return nearest ? { prop: nearest, distance: best } : null;
  }
  function usableProp(prop) {
    if (prop.type === 'outfit' && mission.usedOutfits?.has(prop.id)) return false;
    if (prop.type === 'intel' && mission.intelFound) return false;
    if (prop.type === 'poison' && mission.hasPoison) return false;
    if (prop.type === 'sabotage' && mission.sabotage) return false;
    if (prop.type === 'radio' && !mission.alarm) return false;
    if (prop.type === 'sink' && mission.worldEvents.sinkOverflow) return false;
    if (prop.type === 'fuse' && mission.worldEvents.fuseFault) return false;
    if (prop.type === 'power-strip' && mission.worldEvents.powerFault) return false;
    if (prop.type === 'fire-alarm' && mission.worldEvents.fireAlarm) return false;
    if (prop.type === 'soundboard' && mission.worldEvents.avCooldown > 0) return false;
    if (prop.type === 'exit' && mission.extracted) return false;
    if (prop.type === 'blend' && player.blending) return true;
    return true;
  }

  function updateContextPrompt() {
    const prompt = $('#contextPrompt');
    if (!mission || !['playing', 'paused'].includes(mode)) {
      prompt.classList.add('is-hidden');
      return;
    }
    if (mode === 'paused') return;
    let key = 'E';
    let heading = 'INTERACT';
    let detail = 'Approach a person or object';
    if (player.dragging) {
      key = 'G'; heading = 'DROP BODY'; detail = 'Release the body';
      const prop = closestProp(72, (item) => item.type === 'hide');
      if (prop) { key = 'H'; heading = 'HIDE BODY'; detail = `Place in ${prop.prop.label.toLowerCase()}`; }
    } else {
      const body = closestBody(55);
      const live = closestLiveNpc(48);
      const prop = closestProp(58, usableProp);
      if (body && (!live || body.distance < live.distance + 5)) {
        key = 'E'; heading = body.npc.disguiseTaken ? 'SEARCH BODY' : 'TAKE DISGUISE'; detail = body.npc.target ? 'Target outfit · evidence remains' : `${outfitLabel(body.npc.role)} · change clothes`;
        const hide = closestProp(72, (item) => item.type === 'hide');
        if (hide && hide.distance < body.distance + 35) { key = 'H'; heading = 'HIDE BODY'; detail = `Conceal in ${hide.prop.label.toLowerCase()}`; }
      } else if (live) {
        key = 'Q'; heading = live.npc.target ? 'ELIMINATE TARGET' : 'SUBDUE'; detail = live.npc.target ? live.npc.name : `${outfitLabel(live.npc.role)} · non-lethal takedown`;
      } else if (prop) {
        key = 'E';
        const p = prop.prop;
        if (p.type === 'outfit') { heading = 'CHANGE DISGUISE'; detail = `${p.prompt}${p.requiredRole && player.disguise !== p.requiredRole ? ' · staff access required' : ''}`; }
        else if (p.type === 'intel') { heading = 'RETRIEVE INTEL'; detail = `Access ${activeContract.intelName}`; }
        else if (p.type === 'sabotage') { heading = 'SABOTAGE'; detail = `Tamper with ${activeContract.sabotageName}`; }
        else if (p.type === 'poison') { heading = 'TAKE POISON'; detail = 'A small dose. No questions.'; }
        else if (p.type === 'tray') { heading = mission.hasPoison ? 'POISON THE SERVICE' : 'INSPECT SERVICE'; detail = mission.hasPoison ? 'Prepare an unattended drink' : 'You need a poison dose first'; }
        else if (p.type === 'sink') { heading = 'DISRUPT THE SINK'; detail = 'Flood the kitchen and draw facilities staff'; }
        else if (p.type === 'fuse') { heading = 'TRIP THE BREAKER'; detail = 'Cut the lights; facilities will respond'; }
        else if (p.type === 'power-strip') { heading = 'SABOTAGE POWER'; detail = 'Create a stage fault and lure a technician'; }
        else if (p.type === 'fire-alarm') { heading = 'TRIGGER FIRE ALARM'; detail = 'Force an evacuation and security response'; }
        else if (p.type === 'soundboard') { heading = 'CUE A DISTRACTION'; detail = 'Send a loud audio cue through the venue'; }
        else if (p.type === 'blend') { heading = player.blending ? 'STOP BLENDING IN' : 'BLEND IN'; detail = player.blending ? 'Step out of the crowd' : 'Lose attention in the crowd'; }
        else if (p.type === 'radio') { heading = 'SILENCE THE RADIO'; detail = 'Reset the security response'; }
        else if (p.type === 'exit') { heading = 'EXTRACT'; detail = mission.targets.primary && mission.targets.secondary ? 'Leave the area' : 'Both targets must be eliminated'; }
      } else {
        const hide = closestProp(55, (item) => item.type === 'hide');
        if (hide) { key = 'H'; heading = 'HIDE BODY'; detail = 'Move a body close to this container'; }
        else if (player.blending) { key = 'E'; heading = 'STOP BLENDING IN'; detail = 'Move or interact to leave the crowd'; }
      }
    }
    const promptKey = `${key}|${heading}|${detail}`;
    if (promptKey !== currentPromptKey) {
      $('#contextPrompt .context-key').textContent = key;
      $('#contextPrompt .context-copy b').textContent = heading;
      $('#contextPrompt .context-copy small').textContent = detail;
      currentPromptKey = promptKey;
    }
    prompt.classList.remove('is-hidden');
  }

  function interact() {
    if (!mission || mode !== 'playing') return;
    const body = closestBody(52);
    if (body) {
      takeDisguise(body.npc);
      return;
    }
    const found = closestProp(62, usableProp);
    if (!found) {
      if (player.blending) { player.blending = false; showToast('BLENDING STOPPED', 'You step back into the flow of the room.'); }
      return;
    }
    const prop = found.prop;
    if (prop.type === 'outfit') {
      if (prop.requiredRole && player.disguise !== prop.requiredRole) {
        showToast('ACCESS DENIED', `The ${prop.label.toLowerCase()} is for event staff only.`);
        return;
      }
      mission.usedOutfits.add(prop.id);
      changeDisguise(prop.role, `You found a clean ${outfitLabel(prop.role).toLowerCase()} in the ${prop.label.toLowerCase()}.`);
    } else if (prop.type === 'intel') {
      if (!['security', 'technician'].includes(player.disguise)) {
        showToast('ACCESS DENIED', 'This terminal needs a security or facilities credential.', 'alert');
        return;
      }
      mission.intelFound = true;
      mission.scoreBonus += 500;
      renderObjectives();
      updateHudStatic();
      showToast('INTELLIGENCE RECOVERED', `The file confirms the opportunity: ${activeContract.opportunity}`, 'good');
      sfx('success');
    } else if (prop.type === 'sabotage') {
      if (player.disguise !== 'technician' && player.disguise !== 'security') {
        showToast('WRONG UNIFORM', 'Only facilities staff can access this control panel.', 'alert');
        return;
      }
      if (!mission.intelFound) {
        showToast('NO SAFE WINDOW', `Recover ${activeContract.intelName} first to learn the correct sequence.`);
        return;
      }
      mission.sabotage = true;
      const target = npcs.find((npc) => npc.primary && !npc.dead && !npc.down);
      if (target) injectTargetEvent(target, 'sabotage-check', { x: 1115, y: 405 });
      mission.scoreBonus += 900;
      showToast('OPPORTUNITY SET', `The ${activeContract.sabotageName} is compromised. Wait for ${activeContract.targetOne.callSign} to inspect it.`, 'good');
      sfx('success');
    } else if (prop.type === 'poison') {
      if (!canAccess(player.disguise, 'service')) {
        showToast('ACCESS DENIED', 'The service cupboard requires an event, facilities, or security uniform.', 'alert');
        return;
      }
      mission.hasPoison = true;
      player.poison = true;
      showToast('POISON ACQUIRED', 'A measured dose is ready. Find an unattended serving table.', 'good');
    } else if (prop.type === 'tray') {
      if (!canAccess(player.disguise, 'building')) {
        showToast('ACCESS DENIED', 'The service table is restricted to venue staff.', 'alert');
        return;
      }
      if (!mission.hasPoison) {
        showToast('NOTHING TO PREPARE', 'You need a poison dose from the service cupboard.');
        return;
      }
      if (mission.poisonedTray) {
        showToast('ALREADY PREPARED', 'The drink is waiting for the right guest.');
        return;
      }
      mission.poisonedTray = true;
      mission.hasPoison = false;
      player.poison = false;
      const target = npcs.find((npc) => npc.primary && !npc.dead && !npc.down);
      if (target) injectTargetEvent(target, 'poison-check', { x: 1035, y: 515 });
      mission.scoreBonus += 450;
      showToast('OPPORTUNITY SET', 'The service is prepared. Wait for your target to take the bait.', 'good');
    } else if (prop.type === 'sink') {
      if (!canAccess(player.disguise, 'service')) {
        showToast('ACCESS DENIED', 'The kitchen is restricted to venue and facilities staff.', 'alert');
        return;
      }
      mission.worldEvents.sinkOverflow = true;
      mission.worldEvents.sinkNoiseTimer = 0;
      makeNoise(prop.x, prop.y, 260, 'water', prop.id);
      assignWorldTask('repair-sink', prop);
      mission.scoreBonus += 175;
      showToast('WATER DISRUPTION', 'The sink is overflowing. A facilities technician has been dispatched.', 'good');
    } else if (prop.type === 'fuse') {
      if (!['technician', 'security'].includes(player.disguise)) {
        showToast('ACCESS DENIED', 'Only facilities or security can reach the breaker controls.', 'alert');
        return;
      }
      mission.worldEvents.fuseFault = true;
      mission.worldEvents.lightsOut = true;
      mission.worldEvents.fuseNoiseTimer = 0;
      makeNoise(prop.x, prop.y, 320, 'fuse', prop.id);
      assignWorldTask('repair-fuse', prop);
      mission.scoreBonus += 225;
      showToast('LIGHTS OUT', 'The breaker tripped. Facilities is moving to restore power.', 'good');
    } else if (prop.type === 'power-strip') {
      if (!['technician', 'security'].includes(player.disguise)) {
        showToast('ACCESS DENIED', 'The stage power controls require facilities or security access.', 'alert');
        return;
      }
      mission.worldEvents.powerFault = true;
      mission.worldEvents.powerNoiseTimer = 0;
      makeNoise(prop.x, prop.y, 235, 'fuse', prop.id);
      assignWorldTask('repair-power', prop);
      mission.scoreBonus += 175;
      showToast('STAGE POWER FAULT', 'The stage lights are flickering. A technician is on the way.', 'good');
    } else if (prop.type === 'fire-alarm') {
      mission.worldEvents.fireAlarm = true;
      mission.worldEvents.fireAlarmTimer = 14;
      makeNoise(prop.x, prop.y, 760, 'fire-alarm', prop.id);
      raiseAlarm('Fire alarm triggered', { x: prop.x, y: prop.y, visual: false });
      showToast('EVACUATION IN PROGRESS', 'A fire alarm has triggered a building-wide response.', 'alert');
      sfx('alert');
    } else if (prop.type === 'soundboard') {
      if (!canAccess(player.disguise, 'building')) {
        showToast('ACCESS DENIED', 'The AV console is restricted to venue staff.', 'alert');
        return;
      }
      mission.worldEvents.avCooldown = 21;
      makeNoise(prop.x, prop.y, 620, 'soundboard', prop.id);
      mission.scoreBonus += 140;
      showToast('AUDIO DISTRACTION', 'A loud cue is echoing through the venue. Nearby staff are investigating.', 'good');
    } else if (prop.type === 'blend') {
      player.blending = !player.blending;
      if (player.blending) showToast('BLENDING IN', 'Stay still in the crowd to let suspicion fall.', 'good');
      else showToast('BLENDING STOPPED', 'You step out of the crowd.');
    } else if (prop.type === 'radio') {
      if (player.disguise !== 'security' && player.disguise !== 'technician') {
        showToast('ACCESS DENIED', 'A security or facilities uniform is required.', 'alert');
        return;
      }
      mission.alarm = false;
      mission.alarmTimer = 0;
      mission.alertOrigin = null;
      setCurrentSuspicion(Math.min(mission.suspicionLevels[disguiseIdentityKey()] || 0, 22));
      npcs.forEach((npc) => {
        if (npc.isGuard && !npc.down && !npc.dead) {
          npc.alarmed = false;
          npc.knowledge.threatVisible = false;
          npc.weapon.drawn = Boolean(npc.searchId || npc.protectedTargetId);
          if (npc.mode === 'combat' && !npc.searchId && !npc.protectedTargetId) {
            npc.mode = 'investigate-sound';
            npc.intent = 'investigate-sound';
            npc.knowledge.soundTarget = { x: player.x - 130, y: player.y - 70, kind: 'radio-clear', createdAt: mission.elapsed };
            npc.navGoal = null;
          }
        }
      });
      showToast('CHANNEL CLEARED', 'Security is back on routine. Do not give them another reason.', 'good');
    } else if (prop.type === 'exit') {
      if (mission.targets.primary && mission.targets.secondary) {
        mission.extracted = true;
        finishMission(true);
      } else {
        const left = [!mission.targets.primary && activeContract.targetOne.callSign, !mission.targets.secondary && activeContract.targetTwo.callSign].filter(Boolean);
        showToast('EXTRACTION LOCKED', `${left.join(' and ')} ${left.length === 1 ? 'is' : 'are'} still active.`, 'alert');
      }
    }
    renderObjectives();
    updateHudStatic();
    updateContextPrompt();
  }

  function changeDisguise(role, message = '') {
    player.disguise = role;
    player.blending = false;
    player.weaponVisibleTimer = 0;
    mission.suspicion = mission.suspicionLevels[disguiseIdentityKey()] || 0;
    mission.scoreBonus += 250;
    if (mission.intelFound && role === 'security') {
      const target = npcs.find((npc) => npc.primary && !npc.dead && !npc.down);
      if (target && !target.overridePoint && !target.evacuating) injectTargetEvent(target, 'security-meeting', { x: 1084, y: 542 });
    }
    showToast('DISGUISE ACQUIRED', message || `You are now dressed as ${outfitLabel(role).toLowerCase()}.`, 'good');
    renderObjectives();
    updateHudStatic();
    setSuspicionUI();
  }

  function takeDisguise(npc) {
    if (!npc || npc.hidden || !(npc.down || npc.dead)) return;
    if (npc.disguiseTaken) {
      showToast('NO NEW DISGUISE', 'That outfit has already been taken.');
      return;
    }
    npc.disguiseTaken = true;
    changeDisguise(npc.role, `You took the ${outfitLabel(npc.role).toLowerCase()} from the body.`);
  }

  function nearestHideProp(point, maxDistance = 90) {
    let nearest = null;
    let best = maxDistance;
    for (const prop of PROPS) {
      if (prop.type !== 'hide') continue;
      const d = Math.hypot(point.x - prop.x, point.y - prop.y);
      if (d < best) { nearest = prop; best = d; }
    }
    return nearest ? { prop: nearest, distance: best } : null;
  }
  function dragBody() {
    if (player.dragging) {
      const body = npcs.find((npc) => npc.id === player.dragging);
      if (body) {
        body.x = player.x - player.faceX * bodyDragOffset;
        body.y = player.y - player.faceY * bodyDragOffset;
      }
      player.dragging = null;
      showToast('BODY DROPPED', 'Move it out of sight or hide it in a container.');
      return;
    }
    const found = closestBody(61);
    if (!found) { showToast('NO BODY IN REACH', 'Get closer before trying to move someone.'); return; }
    player.dragging = found.npc.id;
    showToast('BODY IN TOW', 'Move slowly. Press G again to release, or H beside a container to hide it.');
  }
  function hideBody() {
    let body;
    if (player.dragging) body = npcs.find((npc) => npc.id === player.dragging);
    else body = closestBody(68)?.npc;
    if (!body) { showToast('NO BODY IN REACH', 'There is no one close enough to hide.'); return; }
    const hidingPlace = nearestHideProp(body, 86);
    if (!hidingPlace) {
      showToast('NO CONTAINER NEARBY', 'Drag the body close to a crate, closet, or storage bin first.');
      return;
    }
    body.hidden = true;
    body.evidenceState = 'hidden';
    body.discovered = false;
    if (player.dragging === body.id) player.dragging = null;
    mission.scoreBonus += 300;
    showToast('BODY HIDDEN', `${hidingPlace.prop.label.toLowerCase()} secured. No one will find them there.`, 'good');
  }

  function doTakedown() {
    if (!mission || mode !== 'playing') return;
    const found = closestLiveNpc(47);
    if (!found) {
      showToast('OUT OF REACH', 'Get behind your target or move closer.');
      return;
    }
    const npc = found.npc;
    const witness = npcs.find((other) => other !== npc && !other.down && !other.dead && !other.hidden && distance(other, player) < 175 && canNpcSeePlayer(other));
    if (witness) {
      setCurrentSuspicion(Math.max(mission.suspicionLevels[disguiseIdentityKey()] || 0, 44));
      if (npc.target || npc.isGuard) raiseAlarm('A takedown was witnessed', { x: player.x, y: player.y, visual: true });
      else showToast('WITNESS ALERT', 'Someone saw the takedown. Get out of sight.', 'alert');
    }
    npc.down = !npc.target;
    npc.dead = Boolean(npc.target);
    npc.evidenceState = 'exposed';
    npc.mode = 'down';
    npc.investigatePoint = null;
    npc.suspicion = 0;
    player.blending = false;
    mission.scoreBonus += npc.target ? 700 : 180;
    if (npc.target) {
      onTargetEliminated(npc, 'silent takedown');
    } else {
      showToast('TARGET SUBDUED', `${npc.title || outfitLabel(npc.role)} is unconscious. Hide the body and take the disguise.`, 'good');
      makeNoise(npc.x, npc.y, 60, 'takedown');
      sfx('takedown');
    }
    updateContextPrompt();
  }

  function onTargetEliminated(npc, method) {
    if (!mission || !npc.targetKey) return;
    mission.targets[npc.targetKey] = true;
    npc.dead = true;
    npc.down = false;
    npc.mode = 'down';
    if (npc.primary) { npc.overridePoint = null; npc.overrideEvent = null; }
    npc.evidenceState = 'exposed';
    for (const guard of npcs) {
      if (guard.protectedTargetId === npc.id) { guard.protectedTargetId = null; guard.navGoal = null; }
    }
    const name = npc.name || 'Target';
    showToast('TARGET ELIMINATED', `${name} · ${method}. Leave the area when ready.`, 'good');
    sfx('success');
    const witness = npcs.find((other) => other !== npc && !other.down && !other.dead && distance(other, npc) < 100 && canNpcSeePoint(other, npc.x, npc.y));
    if (witness) raiseAlarm('The target was found by a witness', { x: npc.x, y: npc.y, visual: true });
    if (!npcs.some((other) => other.target && !other.dead && !other.down)) mission.evacuating = false;
    renderObjectives();
    updateHudStatic();
  }

  function useEquippedItem() {
    if (!mission || mode !== 'playing') return;
    if (player.selectedItem === 'wire') {
      const found = closestLiveNpc(42);
      if (found) doTakedown();
      else showToast('FIBER WIRE READY', 'Get close to a person before using it.');
    } else if (player.selectedItem === 'pistol') {
      firePistol();
    } else if (player.selectedItem === 'coin') {
      throwCoin();
    }
  }

  function firePistol() {
    if (player.ammo <= 0) { showToast('EMPTY', 'No rounds remain in the magazine.'); return; }
    const angle = mouse.hasMoved ? Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x) : Math.atan2(player.faceY, player.faceX);
    player.faceX = Math.cos(angle); player.faceY = Math.sin(angle);
    player.weaponVisibleTimer = 3.1;
    player.ammo -= 1;
    mission.scoreBonus -= 100;
    const range = 530;
    let victim = null;
    let best = range;
    for (const npc of npcs) {
      if (npc.hidden || npc.down || npc.dead) continue;
      const dx = npc.x - player.x;
      const dy = npc.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > range || d >= best) continue;
      const difference = Math.abs(angleDelta(Math.atan2(dy, dx), angle));
      if (difference < 0.16 && !lineBlocked(player.x, player.y, npc.x, npc.y)) { victim = npc; best = d; }
    }
    const end = victim ? { x: victim.x, y: victim.y } : { x: player.x + player.faceX * range, y: player.y + player.faceY * range };
    mission.effects = mission.effects || [];
    mission.effects.push({ type: 'shot', x1: player.x, y1: player.y, x2: end.x, y2: end.y, life: 0.14, max: 0.14 });
    makeNoise(player.x, player.y, 560, 'gunshot');
    sfx('shot');
    if (victim) {
      if (victim.target) onTargetEliminated(victim, 'silenced pistol');
      else {
        victim.dead = true;
        victim.down = false;
        victim.mode = 'down';
        mission.civilianCasualties += victim.role === 'guest' || victim.role === 'event-staff' ? 1 : 0;
        showToast('WITNESS ALERT', 'A shot was heard. Security is moving in.', 'alert');
      }
    } else {
      showToast('SHOT FIRED', 'The sound will carry. Move before security arrives.', 'alert');
    }
    setCurrentSuspicion(Math.max(mission.suspicionLevels[disguiseIdentityKey()] || 0, 78));
    raiseAlarm(victim?.target ? 'Gunshot reported' : 'A weapon was discharged', { x: player.x, y: player.y, visual: false });
  }

  function throwCoin() {
    if (player.coins <= 0) { showToast('NO COINS LEFT', 'Try another way to distract the room.'); return; }
    player.coins -= 1;
    const angle = mouse.hasMoved ? Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x) : Math.atan2(player.faceY, player.faceX);
    const length = mouse.hasMoved ? Math.min(260, distance(player, { x: mouse.worldX, y: mouse.worldY })) : 190;
    const coin = { x: player.x + Math.cos(angle) * length, y: player.y + Math.sin(angle) * length };
    mission.coinsOnGround = mission.coinsOnGround || [];
    mission.coinsOnGround.push({ ...coin, life: 25 });
    makeNoise(coin.x, coin.y, 230, 'coin');
    sfx('coin');
    showToast('DISTRACTION', 'The coin landed. Someone may come to investigate.');
    updateHudStatic();
  }

  function angleDelta(a, b) {
    let d = (a - b + Math.PI) % TAU;
    if (d < 0) d += TAU;
    return d - Math.PI;
  }
  function lightLevelAt(x, y) {
    const isNight = activeContract.theme === 'night';
    const indoors = pointInRect(x, y, BUILDING);
    let light = isNight ? (indoors ? .48 : .24) : activeContract.theme === 'villa' ? (indoors ? .74 : .9) : (indoors ? .82 : .96);
    const lamps = [
      { x: 1115, y: 405, radius: 260, power: .72 },
      { x: 1414, y: 255, radius: 185, power: .56 },
      { x: 282, y: 555, radius: 115, power: .42 },
      { x: 920, y: 740, radius: 135, power: .25 }
    ];
    for (const lamp of lamps) {
      const d = Math.hypot(x - lamp.x, y - lamp.y);
      if (d < lamp.radius) light = Math.max(light, lamp.power * (1 - d / lamp.radius) + (isNight ? .12 : .42));
    }
    if (mission?.worldEvents?.lightsOut && indoors) light *= .34;
    if (mission?.worldEvents?.powerFault && Math.hypot(x - 1262, y - 760) < 175) light *= .58 + .2 * Math.sin(animationTime * 13);
    return clamp(light, .12, 1);
  }

  function canNpcSeePoint(npc, x, y, rangeScale = .72) {
    if (npc.hidden || npc.down || npc.dead) return false;
    const dx = x - npc.x;
    const dy = y - npc.y;
    const d = Math.hypot(dx, dy);
    const light = lightLevelAt(x, y);
    const range = npc.visionRange * rangeScale * (.58 + light * .52);
    if (d > range || d < 4) return d < 4;
    if (Math.abs(angleDelta(Math.atan2(dy, dx), npc.facing)) > npc.fov / 2) return false;
    return !lineBlocked(npc.x, npc.y, x, y);
  }

  function canNpcSeePlayer(npc) {
    if (!mission || player.blending || npc.hidden || npc.down || npc.dead) return false;
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const d = Math.hypot(dx, dy);
    const light = lightLevelAt(player.x, player.y);
    let visibility = .58 + light * .52;
    if (player.crouched) visibility *= .62;
    if (player.wasMoving && (keys.has('ShiftLeft') || keys.has('ShiftRight'))) visibility *= 1.13;
    if (player.weaponVisibleTimer > 0) visibility *= 1.14;
    if (player.dragging) visibility *= 1.42;
    if (d > npc.visionRange * visibility) return false;
    if (d < 25) return !lineBlocked(npc.x, npc.y, player.x, player.y);
    if (Math.abs(angleDelta(Math.atan2(dy, dx), npc.facing)) > npc.fov / 2) return false;
    return !lineBlocked(npc.x, npc.y, player.x, player.y);
  }

  function suspiciousCue(npc) {
    const region = getRegion(player.x, player.y);
    const d = distance(npc, player);
    const burned = mission.compromisedDisguises.has(disguiseIdentityKey(region, player.disguise));
    if (burned) return { suspicious: true, rate: 52, reason: 'A burned disguise was recognized' };
    if (isTrespassing()) return { suspicious: true, rate: npc.enforcer ? 30 : 20, reason: 'Trespassing in a restricted area' };
    if (player.weaponVisibleTimer > 0) return { suspicious: true, rate: 39, reason: 'A weapon was seen' };
    if (player.dragging) return { suspicious: true, rate: 25, reason: 'A body is being moved in the open' };
    if (npc.enforcer && player.disguise !== 'guest' && d < 145) return { suspicious: true, rate: 35, reason: 'An enforcer recognized the disguise' };
    if ((keys.has('ShiftLeft') || keys.has('ShiftRight')) && d < 88) return { suspicious: true, rate: 13, reason: 'Running drew attention' };
    return { suspicious: false, rate: 0, reason: '' };
  }

  function beginEvacuation(reason) {
    if (!mission || mission.evacuating) return;
    mission.evacuating = true;
    mission.evacuationReason = reason;
    const targets = npcs.filter((npc) => npc.target && !npc.dead && !npc.down);
    for (const target of targets) {
      let chosen = null;
      let chosenPath = null;
      let bestCost = Infinity;
      for (const room of SAFE_ROOMS) {
        const route = findPath(target, room);
        const cost = route.length ? route.length + distance(route[route.length - 1], room) / NAV_CELL : Infinity;
        if (cost < bestCost) { chosen = room; chosenPath = route; bestCost = cost; }
      }
      if (chosen) {
        target.evacuating = true;
        target.atSafeRoom = false;
        target.evacuationRoom = chosen.id;
        target.evacuationPoint = { x: chosen.x, y: chosen.y };
        target.navGoal = null;
        target.knowledge.evacuationOrder = true;
        target.knowledge.routeNotes.push({ kind: 'evacuate', room: chosen.id, at: mission.elapsed });
      }
    }
    const anchor = mission.alertOrigin || player;
    const targetDistance = (guard) => targets.length ? Math.min(...targets.map((target) => distance(guard, target))) : distance(guard, anchor);
    const protectors = npcs.filter((npc) => npc.isGuard && !npc.dead && !npc.down && !npc.target)
      .sort((a, b) => targetDistance(a) - targetDistance(b));
    let cursor = 0;
    for (const target of targets) {
      for (let slot = 0; slot < 2 && cursor < protectors.length; slot += 1) {
        const guard = protectors[cursor++];
        guard.protectedTargetId = target.id;
        guard.escortSlot = slot;
        guard.alarmed = Boolean(mission.alarm);
        guard.weapon.drawn = true;
        guard.combatState = 'perimeter';
        guard.navGoal = null;
      }
    }
    for (const guard of protectors.slice(cursor)) {
      if (!mission.alarm) continue;
      guard.alarmed = true;
      guard.weapon.drawn = true;
    }
  }

  function raiseAlarm(reason, origin = null) {
    if (!mission) return;
    const first = !mission.alarm;
    mission.alarm = true;
    mission.alarmTimer = Math.max(mission.alarmTimer, 18);
    mission.alarmReason = reason;
    setCurrentSuspicion(Math.max(mission.suspicionLevels[disguiseIdentityKey()] || 0, 68));
    if (origin) mission.alertOrigin = { x: origin.x, y: origin.y, visual: Boolean(origin.visual), at: mission.elapsed };
    if (first && mode === 'playing') showToast('SECURITY ALERT', reason, 'alert');
    beginEvacuation(reason);
    for (const npc of npcs) {
      if (!npc.isGuard || npc.down || npc.dead || npc.hidden) continue;
      npc.alarmed = true;
      npc.weapon.drawn = true;
      npc.combatState = 'alert';
      if (origin?.visual) {
        npc.knowledge.lastSeenPlayer = { x: origin.x, y: origin.y, at: mission.elapsed, region: getRegion(origin.x, origin.y) };
        npc.knowledge.threatVisible = true;
      } else if (origin) {
        npc.knowledge.soundTarget = { x: origin.x, y: origin.y, kind: 'alarm', createdAt: mission.elapsed };
      }
      if (!npc.protectedTargetId) npc.navGoal = null;
    }
    if (origin && mission.elapsed - mission.lastCrowdPromotion > 1.1) {
      mission.lastCrowdPromotion = mission.elapsed;
      promoteCrowdAround(origin.x, origin.y, reason.toLowerCase().includes('fire') ? 540 : 300, reason.toLowerCase().includes('fire') ? 'fire-alarm' : 'gunshot', null, 20);
    }
  }

  function makeNoise(x, y, radius, kind, source = 'world') {
    if (!mission) return null;
    const id = mission.nextSoundId++;
    const maxLife = ({ footstep: .8, drag: 1.45, takedown: 1.15, coin: 3.2, gunshot: 2.5, 'guard-shot': 1.8, water: 3.5, fuse: 2.8, soundboard: 4.2, 'fire-alarm': 5.5, impact: 2.1, radio: 1.4 })[kind] || 1.5;
    const event = { id, x, y, radius, maxRadius: radius, kind, source, age: 0, life: maxLife, maxLife, priority: kind === 'gunshot' || kind === 'fire-alarm' ? 5 : kind === 'coin' || kind === 'soundboard' ? 2 : 1 };
    mission.noiseEvents.push(event);
    if (['gunshot', 'impact', 'fire-alarm', 'soundboard', 'water', 'fuse'].includes(kind) && mission.elapsed - mission.lastCrowdPromotion > 1.1) {
      mission.lastCrowdPromotion = mission.elapsed;
      promoteCrowdAround(x, y, Math.min(radius, 420), kind, null, kind === 'fire-alarm' ? 22 : 14);
    } else if (kind === 'coin') {
      promoteCrowdAround(x, y, Math.min(radius, 220), kind, null, 8);
    }
    return event;
  }

  function hearNearbySounds(npc) {
    if (!mission || !mission.noiseEvents.length) return;
    const candidates = [];
    for (const event of mission.noiseEvents) {
      if (npc.knowledge.heardEvents.has(event.id)) continue;
      const d = Math.hypot(npc.x - event.x, npc.y - event.y);
      const obstruction = lineBlocked(npc.x, npc.y, event.x, event.y) ? .58 : 1;
      const effectiveRadius = Math.min(event.radius, npc.hearing) * obstruction;
      if (d > effectiveRadius) continue;
      npc.knowledge.heardEvents.add(event.id);
      candidates.push({ event, distance: d, score: d / Math.max(1, effectiveRadius) - event.priority * .045 });
    }
    if (!candidates.length) return;
    candidates.sort((a, b) => a.score - b.score);
    const heard = candidates[0].event;
    const memory = { x: heard.x, y: heard.y, kind: heard.kind, at: mission.elapsed, id: heard.id };
    npc.knowledge.lastHeard = memory;
    npc.knowledge.soundMemory.push(memory);
    if (npc.knowledge.soundMemory.length > 8) npc.knowledge.soundMemory.shift();
    const combatSound = ['gunshot', 'guard-shot', 'impact', 'fire-alarm'].includes(heard.kind);
    if (npc.isGuard) {
      if (!npc.knowledge.soundTarget || npc.mode !== 'combat') npc.knowledge.soundTarget = { x: heard.x, y: heard.y, kind: heard.kind, createdAt: mission.elapsed };
      if (heard.kind === 'gunshot' || heard.kind === 'impact') npc.investigateTimer = Math.max(npc.investigateTimer, 2.5);
    } else if (npc.category === 'civilian' && combatSound) {
      const shouldReport = heard.kind === 'fire-alarm' || Math.random() < .29;
      if (shouldReport) {
        npc.pendingReport = { point: { x: heard.x, y: heard.y }, bodyId: null, type: heard.kind, createdAt: mission.elapsed };
        npc.reportPoint = { x: heard.x, y: heard.y };
        npc.reportGuardId = nearestGuard(npc)?.id || null;
        npc.panicTimer = 0;
      } else {
        npc.panicTimer = Math.max(npc.panicTimer, 5);
        npc.fleePoint = crowdFleeGoal(npc.crowdAgentIndex, heard.x, heard.y, npc);
      }
    } else {
      npc.knowledge.soundTarget = { x: heard.x, y: heard.y, kind: heard.kind, createdAt: mission.elapsed, id: heard.id };
    }
  }

  function assignWorldTask(kind, point, options = {}) {
    if (!mission) return null;
    const eligible = npcs.filter((npc) => !npc.dead && !npc.down && !npc.hidden && !npc.task && !npc.target &&
      (npc.role === 'technician' || (options.allowGuard && npc.isGuard)));
    eligible.sort((a, b) => distance(a, point) - distance(b, point));
    const worker = eligible[0];
    if (!worker) return null;
    const duration = kind === 'repair-sink' ? 2.2 : kind === 'repair-power' ? 2.5 : 1.8;
    worker.task = { id: mission.taskIds++, kind, point: { x: point.x, y: point.y }, work: 0, duration };
    worker.navGoal = null;
    worker.knowledge.soundTarget = null;
    worker.mode = 'respond-task';
    return worker;
  }

  function updateWorldEvents(dt) {
    if (!mission) return;
    const events = mission.worldEvents;
    if (events.sinkOverflow) {
      events.sinkNoiseTimer = (events.sinkNoiseTimer || 0) + dt;
      if (events.sinkNoiseTimer > 2.2) {
        events.sinkNoiseTimer = 0;
        makeNoise(684, 511, 245, 'water', 'faulty-sink');
      }
    }
    if (events.powerFault) {
      events.powerNoiseTimer = (events.powerNoiseTimer || 0) + dt;
      if (events.powerNoiseTimer > 3.1) {
        events.powerNoiseTimer = 0;
        makeNoise(1262, 760, 165, 'fuse', 'stage-power-strip');
      }
    }
    if (events.fireAlarm) {
      events.fireAlarmTimer = (events.fireAlarmTimer || 0) - dt;
      if (events.fireAlarmTimer <= 0) {
        events.fireAlarm = false;
        showToast('FIRE ALARM RESET', 'The evacuation signal has stopped. Security is still sweeping the venue.');
      }
    }
    if (events.avCooldown > 0) events.avCooldown = Math.max(0, events.avCooldown - dt);
    for (const search of mission.searches) search.life -= dt;
    mission.searches = mission.searches.filter((search) => search.life > 0);
  }

  function startLocalSearch(point, reason, bodyId = null) {
    if (!mission) return null;
    const region = getRegion(point.x, point.y);
    const existing = mission.searches.find((search) => search.life > 0 && search.region === region && distance(search, point) < 130);
    if (existing) {
      existing.life = Math.max(existing.life, 24);
      return existing;
    }
    const search = {
      id: mission.nextSearchId++, x: point.x, y: point.y, radius: 190, life: 24,
      region, reason, bodyId, startedAt: mission.elapsed, confirmed: true
    };
    mission.searches.push(search);
    mission.lockdowns.set(region, search.id);
    const guards = npcs.filter((npc) => npc.isGuard && !npc.down && !npc.dead && !npc.hidden)
      .sort((a, b) => distance(a, point) - distance(b, point));
    for (const guard of guards.slice(0, 3)) {
      guard.searchId = search.id;
      guard.searchIndex = 0;
      guard.searchStepTimer = 0;
      guard.weapon.drawn = true;
      guard.combatState = 'searching';
      guard.navGoal = null;
      guard.alarmed = false;
      guard.mode = 'search';
    }
    if (distance(player, point) < 570) showToast('LOCAL LOCKDOWN', `Security is sweeping the ${regionLabel(region).toLowerCase()}. Stay clear of the search radius.`, 'alert');
    return search;
  }

  function startBodyCheck(guard, report) {
    if (!guard || !report) return;
    guard.bodyCheck = { bodyId: report.bodyId || null, point: { x: report.point.x, y: report.point.y }, elapsed: 0 };
    guard.incomingBodyReport = null;
    guard.navGoal = null;
    guard.weapon.drawn = true;
    guard.combatState = 'checking';
    guard.mode = 'investigate-body';
  }

  function reportBodyDiscovery(witness, body) {
    if (!mission || !body || body.hidden || body.discovered) return;
    body.discovered = true;
    body.evidenceState = 'exposed';
    body.discoveredBy = witness.id;
    sfx('whisper');
    mission.bodyDiscoveries += 1;
    witness.knowledge.observedBodies.add(body.id);
    promoteCrowdAround(body.x, body.y, 255, 'body-seen', body, 20);
    if (witness.isGuard) {
      startBodyCheck(witness, { bodyId: body.id, point: { x: body.x, y: body.y } });
      return;
    }
    if (witness.category === 'target') {
      raiseAlarm('A target discovered an exposed body', { x: body.x, y: body.y, visual: false });
      return;
    }
    if (witness.category === 'civilian') {
      const guard = nearestGuard(witness);
      if (guard) {
        witness.pendingReport = { point: { x: body.x, y: body.y }, bodyId: body.id, type: 'body', createdAt: mission.elapsed };
        witness.reportPoint = { x: body.x, y: body.y };
        witness.reportGuardId = guard.id;
        witness.panicTimer = 0;
        witness.navGoal = null;
        witness.mode = 'report';
        witness.knowledge.witnessReports += 1;
        if (distance(player, witness) < 450) showToast('WITNESS', 'A civilian is running to security with the body location.', 'alert');
      } else {
        witness.panicTimer = 6;
        witness.fleePoint = { x: clamp(witness.x + 180, 40, WORLD.width - 40), y: clamp(witness.y + 150, 80, WORLD.height - 60) };
      }
    }
  }


  function injectTargetEvent(target, event, point) {
    if (!target || target.dead || target.down) return;
    target.overridePoint = { x: point.x, y: point.y };
    target.overrideEvent = event;
    target.overrideStartedAt = mission.elapsed;
    target.directiveElapsed = 0;
    target.navGoal = null;
    target.knowledge.routeNotes.push({ kind: event, point: { ...point }, at: mission.elapsed });
  }

  function chooseSafeRoom(target) {
    let chosen = null;
    let best = Infinity;
    for (const room of SAFE_ROOMS) {
      const route = findPath(target, room);
      if (!route.length && lineBlocked(target.x, target.y, room.x, room.y)) continue;
      const cost = route.length * NAV_CELL + distance(route[route.length - 1] || target, room);
      if (cost < best) { best = cost; chosen = room; }
    }
    return chosen;
  }

  function moveNPCTo(npc, targetX, targetY, speed, dt) {
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    npc.facing = Math.atan2(dy, dx);
    const amount = Math.min(d, speed * dt);
    const beforeX = npc.x, beforeY = npc.y;
    moveActor(npc, (dx / d) * amount, (dy / d) * amount, npc.radius);
    const moved = Math.hypot(npc.x - beforeX, npc.y - beforeY);
    if (moved < amount * .12) npc.stuckTimer += dt;
    else npc.stuckTimer = 0;
    return distance(npc, { x: targetX, y: targetY }) <= Math.max(3, amount * .28);
  }

  function getTargetById(id) { return npcs.find((npc) => npc.id === id && !npc.dead && !npc.down && !npc.hidden); }
  function patrolNPC(npc, dt) {
    if (npc.wait > 0) { npc.wait -= dt; return; }
    if (!npc.route.length) return;
    const point = npc.route[npc.routeIndex % npc.route.length];
    const arrived = moveNPCTo(npc, point.x, point.y, npc.speed, dt);
    if (arrived || distance(npc, point) < 8) {
      npc.x = point.x; npc.y = point.y;
      npc.wait = point.wait || 3;
      npc.routeIndex = (npc.routeIndex + 1) % npc.route.length;
    }
  }

  function updateBodyCheck(npc, dt) {
    if (!npc.bodyCheck) return;
    const body = npc.bodyCheck.bodyId ? npcs.find((item) => item.id === npc.bodyCheck.bodyId) : null;
    if (body?.hidden) { npc.bodyCheck = null; npc.combatState = 'searching'; return; }
    const point = npc.bodyCheck.point;
    const arrived = navigateNPCTo(npc, point, 58, dt);
    if (arrived || distance(npc, point) < 28) {
      npc.bodyCheck.elapsed += dt;
      npc.combatState = 'checking-vitals';
      npc.facing = Math.atan2(point.y - npc.y, point.x - npc.x);
      if (npc.bodyCheck.elapsed >= 1.45) {
        if (body) { body.vitalsChecked = true; body.checkedAt = mission.elapsed; }
        const bodyId = npc.bodyCheck.bodyId;
        npc.knowledge.confirmedBodies.add(bodyId || `unknown-${Math.round(point.x)}-${Math.round(point.y)}`);
        npc.bodyCheck = null;
        npc.weapon.drawn = true;
        npc.combatState = 'searching';
        startLocalSearch(point, 'body-confirmed', bodyId);
      }
    }
  }

  function updateCivilianReport(npc, dt) {
    if (!npc.pendingReport) return;
    let guard = npcs.find((item) => item.id === npc.reportGuardId && item.isGuard && !item.dead && !item.down);
    if (!guard) {
      guard = nearestGuard(npc);
      npc.reportGuardId = guard?.id || null;
    }
    if (!guard) {
      npc.pendingReport = null; npc.panicTimer = 6;
      return;
    }
    const arrived = navigateNPCTo(npc, guard, 65, dt);
    if (distance(npc, guard) > 34 && !arrived) return;
    const report = { ...npc.pendingReport, point: { ...npc.pendingReport.point } };
    guard.knowledge.radioReports.push({ ...report, from: npc.id });
    if (report.bodyId) guard.knowledge.confirmedBodies.add(report.bodyId);
    npc.pendingReport = null;
    npc.reportGuardId = null;
    npc.panicTimer = 5;
    const body = report.bodyId ? npcs.find((item) => item.id === report.bodyId) : null;
    npc.fleePoint = body ? crowdFleeGoal(npc.crowdAgentIndex, body.x, body.y, npc) : { x: npc.x + 120, y: npc.y + 80 };
    if (report.type === 'body' && report.bodyId) {
      guard.incomingBodyReport = report;
      startBodyCheck(guard, report);
    } else {
      guard.incomingBodyReport = null;
      guard.knowledge.soundTarget = { ...report.point, kind: `report-${report.type || 'incident'}`, createdAt: mission.elapsed };
      startLocalSearch(report.point, 'civilian-report', null);
    }
    if (distance(player, guard) < 480) showToast('SECURITY REPORT RECEIVED', 'A witness passed the location to a guard. Search teams are converging.', 'alert');
  }

  function nearestLiveTarget(npc) {
    const targets = npcs.filter((item) => item.target && !item.dead && !item.down && !item.hidden);
    targets.sort((a, b) => distance(npc, a) - distance(npc, b));
    return targets[0] || null;
  }

  function updateGuardCombat(npc, dt) {
    npc.weapon.drawn = true;
    npc.weapon.fireCooldown = Math.max(0, npc.weapon.fireCooldown - dt);
    if (npc.weapon.reloadTimer > 0) {
      npc.weapon.reloadTimer -= dt;
      npc.combatState = 'reloading';
      if (npc.weapon.reloadTimer <= 0) { npc.weapon.ammo = 12; npc.combatState = 'searching'; }
      return;
    }
    const sees = canNpcSeePlayer(npc);
    if (sees) {
      npc.knowledge.lastSeenPlayer = { x: player.x, y: player.y, at: mission.elapsed, region: getRegion(player.x, player.y) };
      npc.knowledge.threatVisible = true;
      const d = distance(npc, player);
      npc.facing = Math.atan2(player.y - npc.y, player.x - npc.x);
      npc.combatState = 'aiming';
      if (d < 380 && npc.weapon.fireCooldown <= 0 && npc.weapon.ammo > 0) {
        npc.weapon.ammo -= 1;
        npc.weapon.fireCooldown = 1.05 + Math.random() * .5;
        npc.combatState = 'firing';
        mission.effects.push({ type: 'guardShot', x1: npc.x, y1: npc.y, x2: player.x, y2: player.y, life: .16, max: .16 });
        makeNoise(npc.x, npc.y, 380, 'guard-shot', npc.id);
        if (mission.elapsed - mission.combatLastHit > .75) {
          mission.combatLastHit = mission.elapsed;
          player.health = Math.max(0, player.health - 12);
          mission.suppression = Math.min(100, (mission.suppression || 0) + 18);
          if (player.health <= 0) { finishMission(false); return; }
        }
      }
      if (d < 32) {
        npc.caughtTimer += dt;
        if (npc.caughtTimer > 2.15) finishMission(false);
      } else npc.caughtTimer = Math.max(0, npc.caughtTimer - dt * 1.2);
      return;
    }
    npc.knowledge.threatVisible = false;
    npc.combatState = 'searching';
    const last = npc.knowledge.lastSeenPlayer || mission.alertOrigin;
    if (last && mission.elapsed - (last.at || 0) < 18) {
      npc.searchTimer = Math.max(npc.searchTimer, 1.2);
      navigateNPCTo(npc, last, 76, dt);
    } else if (npc.searchId) {
      npc.intent = 'search';
    } else {
      npc.combatState = 'patrol-ready';
    }
    if (npc.weapon.ammo <= 0) { npc.weapon.reloadTimer = 1.75; npc.combatState = 'reloading'; }
  }

  function updateNPCMovement(npc, dt) {
    switch (npc.intent) {
      case 'task': {
        if (!npc.task) { npc.intent = 'patrol'; break; }
        const arrived = navigateNPCTo(npc, npc.task.point, npc.role === 'technician' ? 40 : 54, dt);
        if (arrived || distance(npc, npc.task.point) < 26) {
          npc.task.work += dt;
          npc.mode = 'repairing';
          if (npc.task.work >= npc.task.duration) {
            const task = npc.task;
            if (task.kind === 'repair-sink') mission.worldEvents.sinkOverflow = false;
            if (task.kind === 'repair-fuse') { mission.worldEvents.fuseFault = false; mission.worldEvents.lightsOut = false; }
            if (task.kind === 'repair-power') mission.worldEvents.powerFault = false;
            npc.task = null; npc.navGoal = null; npc.mode = 'patrol'; npc.combatState = 'holstered';
            if (distance(player, npc) < 500) {
              const message = task.kind === 'repair-sink' ? 'The kitchen sink was shut off.' : task.kind === 'repair-power' ? 'The stage power strip was isolated and secured.' : 'The service breaker was reset; the lights are back online.';
              showToast('FACILITIES RESPONSE', message, 'good');
            }
          }
        }
        break;
      }
      case 'evacuate': {
        if (!npc.evacuationPoint) { npc.evacuating = false; break; }
        const arrived = navigateNPCTo(npc, npc.evacuationPoint, npc.speed + 28, dt);
        npc.mode = 'evacuate';
        if (arrived || distance(npc, npc.evacuationPoint) < 24) {
          npc.x = npc.evacuationPoint.x; npc.y = npc.evacuationPoint.y;
          npc.atSafeRoom = true;
          if (!npc.evacuationTimer) npc.evacuationTimer = mission.elapsed + 7;
          if (!mission.alarm && mission.elapsed > npc.evacuationTimer) {
            npc.evacuating = false; npc.atSafeRoom = false; npc.evacuationTimer = 0; npc.navGoal = null;
          }
        }
        break;
      }
      case 'escort': {
        const target = getTargetById(npc.protectedTargetId);
        if (!target || !mission.evacuating) { npc.protectedTargetId = null; npc.weapon.drawn = false; npc.intent = 'patrol'; break; }
        const angle = Math.atan2(target.y - npc.y, target.x - npc.x) + (npc.escortSlot === 0 ? Math.PI * .72 : -Math.PI * .72);
        const guardPoint = { x: target.x + Math.cos(angle) * 54, y: target.y + Math.sin(angle) * 54 };
        navigateNPCTo(npc, guardPoint, 63, dt);
        npc.mode = 'escort'; npc.weapon.drawn = true; npc.combatState = 'perimeter';
        break;
      }
      case 'combat':
        npc.mode = 'combat';
        updateGuardCombat(npc, dt);
        break;
      case 'investigate-body':
        npc.mode = 'investigate-body';
        updateBodyCheck(npc, dt);
        break;
      case 'investigate-report':
        npc.mode = 'investigate-report';
        if (npc.incomingBodyReport) startBodyCheck(npc, npc.incomingBodyReport);
        else if (npc.knowledge.soundTarget) navigateNPCTo(npc, npc.knowledge.soundTarget, 54, dt);
        break;
      case 'search': {
        const search = mission.searches.find((item) => item.id === npc.searchId && item.life > 0);
        if (!search) { npc.searchId = null; npc.weapon.drawn = false; npc.mode = 'patrol'; break; }
        npc.mode = 'search'; npc.weapon.drawn = true; npc.combatState = 'searching';
        const pattern = [
          { x: search.x, y: search.y }, { x: search.x - 80, y: search.y - 54 },
          { x: search.x + 76, y: search.y - 72 }, { x: search.x + 88, y: search.y + 54 },
          { x: search.x - 68, y: search.y + 74 }, { x: search.x, y: search.y }
        ];
        const point = pattern[npc.searchIndex % pattern.length];
        if (navigateNPCTo(npc, point, 55, dt) || distance(npc, point) < 22) {
          npc.searchStepTimer += dt;
          if (npc.searchStepTimer > .8) { npc.searchIndex = (npc.searchIndex + 1) % pattern.length; npc.searchStepTimer = 0; npc.navGoal = null; }
        }
        break;
      }
      case 'report':
        npc.mode = 'report';
        updateCivilianReport(npc, dt);
        break;
      case 'flee': {
        npc.mode = 'flee';
        npc.panicTimer = Math.max(0, npc.panicTimer - dt);
        if (!npc.fleePoint) npc.fleePoint = { x: clamp(npc.x + 155, 40, WORLD.width - 40), y: clamp(npc.y + 120, 60, WORLD.height - 50) };
        const arrived = navigateNPCTo(npc, npc.fleePoint, npc.speed + 27, dt);
        if (arrived || distance(npc, npc.fleePoint) < 22) {
          npc.cowering = true; npc.intent = 'cower'; npc.mode = 'cower'; npc.navGoal = null;
        }
        break;
      }
      case 'cower':
        npc.mode = 'cower';
        npc.cowering = true;
        npc.panicTimer = Math.max(0, npc.panicTimer - dt);
        if (npc.panicTimer <= 0 && !mission.alarm && !mission.evacuating) { npc.cowering = false; npc.intent = 'patrol'; npc.mode = 'patrol'; }
        break;
      case 'investigate-sound': {
        const sound = npc.knowledge.soundTarget;
        if (!sound) { npc.intent = 'patrol'; break; }
        npc.mode = 'investigate-sound';
        const arrived = navigateNPCTo(npc, sound, npc.isGuard ? 52 : 34, dt);
        if (arrived || distance(npc, sound) < 23) {
          sound.reachedAt ??= mission.elapsed;
          npc.facing = Math.atan2(sound.y - npc.y, sound.x - npc.x);
          if (mission.elapsed - sound.reachedAt > (sound.kind === 'coin' ? 2.3 : 1.4)) {
            npc.knowledge.soundTarget = null; npc.navGoal = null; npc.mode = 'patrol';
          }
        }
        break;
      }
      case 'inspect': {
        const lastSeen = npc.knowledge.lastSeenPlayer;
        if (!lastSeen) { npc.intent = 'patrol'; break; }
        npc.mode = 'inspect';
        const reached = navigateNPCTo(npc, lastSeen, 45, dt);
        if (reached || distance(npc, lastSeen) < 28) {
          npc.inspectTimer = (npc.inspectTimer || 0) + dt;
          if (npc.inspectTimer > 2.4) { npc.suspicion = 0; npc.inspectTimer = 0; npc.knowledge.lastSeenPlayer = null; npc.intent = 'patrol'; }
        }
        break;
      }
      case 'scripted': {
        if (!npc.overridePoint) { npc.intent = 'schedule'; break; }
        npc.mode = 'scripted';
        const arrived = navigateNPCTo(npc, npc.overridePoint, npc.speed + 6, dt);
        if (arrived || distance(npc, npc.overridePoint) < 27) {
          npc.directiveElapsed += dt;
          if (npc.overrideEvent === 'sabotage-check' && npc.directiveElapsed > .55) {
            mission.sabotage = false;
            onTargetEliminated(npc, 'a sabotaged environmental accident');
            mission.scoreBonus += 1200;
            npc.overridePoint = null;
          } else if (npc.overrideEvent === 'poison-check' && mission.poisonedTray && npc.directiveElapsed > 1.5) {
            mission.poisonedTray = false;
            onTargetEliminated(npc, 'an unattended poisoned drink');
          } else if (npc.overrideEvent === 'security-meeting' && npc.directiveElapsed > 3.2) {
            npc.overridePoint = null; npc.overrideEvent = null; npc.directiveElapsed = 0; npc.navGoal = null; npc.intent = 'schedule';
            showToast('TARGET MOVED', `${npc.name} has returned to the summit floor.`);
          }
        }
        break;
      }
      case 'schedule':
      case 'patrol':
      default:
        npc.mode = 'patrol';
        patrolNPC(npc, dt);
        break;
    }
  }

  function detectExposedBodies(npc) {
    if (!mission || npc.down || npc.dead || npc.hidden) return;
    for (const body of npcs) {
      if (body === npc || body.hidden || body.discovered || !(body.down || body.dead)) continue;
      if (canNpcSeePoint(npc, body.x, body.y, .66)) {
        reportBodyDiscovery(npc, body);
        break;
      }
    }
  }

  function maybeDemoteCrowd() {
    if (!mission || !crowd || npcs.length <= baseNpcCount) return;
    for (let i = npcs.length - 1; i >= baseNpcCount; i -= 1) {
      const npc = npcs[i];
      if (!npc.promotedFromCrowd || npc.dead || npc.down || npc.pendingReport || npc.task || npc.panicTimer > 0 || npc.cowering) continue;
      if (mission.elapsed - npc.promotedAt < 12 || npc.mode !== 'patrol') continue;
      const index = npc.crowdAgentIndex;
      if (index >= 0) {
        crowd.promoted[index] = 0;
        crowd.x[index] = npc.x; crowd.y[index] = npc.y;
        const zone = CROWD_ZONES[crowd.zone[index]];
        crowd.destinationX[index] = clamp(npc.x + rand(-35, 35), zone.x + 8, zone.x + zone.w - 8);
        crowd.destinationY[index] = clamp(npc.y + rand(-35, 35), zone.y + 8, zone.y + zone.h - 8);
      }
      npcs.splice(i, 1);
    }
  }

  function updateNPCs(dt) {
    if (!mission) return;
    updateCrowd(dt);
    updateWorldEvents(dt);
    const currentRegion = getRegion(player.x, player.y);
    const currentKey = disguiseIdentityKey(currentRegion, player.disguise);
    const visibleSuspicion = { rate: 0, witness: null, reason: '' };
    for (let index = 0; index < npcs.length; index += 1) {
      const npc = npcs[index];
      if (npc.down || npc.dead || npc.hidden) continue;
      if (mission.alarm && npc.category === 'civilian' && npc.panicTimer <= 0 && !npc.pendingReport) {
        const danger = mission.alertOrigin || player;
        npc.panicTimer = 5;
        npc.fleePoint ||= crowdFleeGoal(npc.crowdAgentIndex, danger.x, danger.y, npc);
      }
      if (npc.isGuard && npc.incomingBodyReport && !npc.bodyCheck) startBodyCheck(npc, npc.incomingBodyReport);
      hearNearbySounds(npc);
      npc.knowledge.threatVisible = false;
      const seesPlayer = canNpcSeePlayer(npc);
      if (seesPlayer) {
        const cue = suspiciousCue(npc);
        npc.knowledge.lastSeenPlayer = { x: player.x, y: player.y, at: mission.elapsed, region: currentRegion };
        npc.knowledge.knownThreats.set('agent', { x: player.x, y: player.y, at: mission.elapsed, suspicious: cue.suspicious });
        if (cue.suspicious) {
          npc.knowledge.threatVisible = true;
          npc.suspicion = clamp(npc.suspicion + dt * cue.rate * .065, 0, 3);
          if (cue.rate > visibleSuspicion.rate) {
            visibleSuspicion.rate = cue.rate;
            visibleSuspicion.witness = npc;
            visibleSuspicion.reason = cue.reason;
          }
          if (npc.category === 'target') {
            npc.evacuating = true;
            npc.evacuationPoint ||= chooseSafeRoom(npc);
            if (!npc.evacuationPoint) npc.evacuationPoint = { x: npc.x - 100, y: npc.y + 80 };
            npc.evacuationRoom ||= 'nearest secure room';
            if (!mission.evacuating) beginEvacuation(cue.reason || 'Target security concern');
          }
          if (npc.category === 'civilian' && (player.weaponVisibleTimer > 0 || player.dragging) && !npc.pendingReport && Math.random() < dt * .45) {
            npc.panicTimer = 5;
            npc.fleePoint = { x: clamp(npc.x + (npc.x - player.x) * 1.9, 40, WORLD.width - 40), y: clamp(npc.y + (npc.y - player.y) * 1.9, 55, WORLD.height - 55) };
          }
        } else npc.suspicion = Math.max(0, npc.suspicion - dt * .55);
      } else {
        npc.suspicion = Math.max(0, npc.suspicion - dt * .3);
      }
      if (npc.evacuating && npc.atSafeRoom && !mission.alarm && mission.elapsed > npc.evacuationTimer) {
        npc.evacuating = false; npc.atSafeRoom = false; npc.evacuationPoint = null; npc.evacuationRoom = null; npc.evacuationTimer = 0;
        npc.knowledge.evacuationOrder = false;
      }
      npc.intent = 'patrol';
      npc.behaviorTree.tick({ npc, mission });
      updateNPCMovement(npc, dt);
      detectExposedBodies(npc);
      if (npc.isGuard && npc.mode === 'combat' && npc.caughtTimer > 2.15) { finishMission(false); return; }
      if (mode === 'ended') return;
    }

    if (mission.evacuating && !mission.alarm && !npcs.some((npc) => npc.target && !npc.dead && !npc.down && npc.evacuating)) {
      mission.evacuating = false;
      for (const guard of npcs) {
        if (!guard.isGuard || !guard.protectedTargetId) continue;
        guard.protectedTargetId = null;
        guard.weapon.drawn = Boolean(guard.searchId);
        guard.combatState = guard.searchId ? 'searching' : 'holstered';
        guard.navGoal = null;
      }
    }
    const oldMeter = mission.suspicionLevels[currentKey] || 0;
    let newMeter = visibleSuspicion.rate > 0 ? oldMeter + dt * visibleSuspicion.rate : oldMeter - dt * 9.5;
    newMeter = clamp(newMeter, 0, 100);
    mission.suspicionLevels[currentKey] = newMeter;
    for (const key of Object.keys(mission.suspicionLevels)) {
      if (key !== currentKey && mission.suspicionLevels[key] > 0) mission.suspicionLevels[key] = Math.max(0, mission.suspicionLevels[key] - dt * 6.5);
    }
    mission.suspicion = newMeter;
    if (newMeter >= 100 && !mission.compromisedDisguises.has(currentKey)) {
      mission.compromisedDisguises.add(currentKey);
      showToast('DISGUISE BLOWN', `Enforcers have identified this ${outfitLabel(player.disguise).toLowerCase()} in the ${regionLabel(currentRegion).toLowerCase()}. Change outfit or leave the area.`, 'alert');
      raiseAlarm('Disguise compromised in this area', { x: player.x, y: player.y, visual: true });
    } else if (visibleSuspicion.witness?.isGuard && newMeter > 84 && mission.elapsed - mission.lastSuspicionCall > 4) {
      mission.lastSuspicionCall = mission.elapsed;
      visibleSuspicion.witness.alarmed = true;
      visibleSuspicion.witness.weapon.drawn = true;
      visibleSuspicion.witness.knowledge.threatVisible = true;
    }

    if (mission.alarm) {
      const currentlySeen = npcs.some((npc) => npc.isGuard && !npc.down && !npc.dead && canNpcSeePlayer(npc));
      if (currentlySeen) mission.alarmTimer = Math.max(mission.alarmTimer, 4.5);
      else mission.alarmTimer -= dt;
      if (mission.alarmTimer <= 0) {
        mission.alarm = false;
        mission.alertOrigin = null;
        for (const npc of npcs) {
          if (!npc.isGuard || npc.down || npc.dead) continue;
          npc.alarmed = false;
          npc.knowledge.threatVisible = false;
          npc.weapon.drawn = Boolean(npc.searchId);
          npc.combatState = npc.searchId ? 'searching' : 'holstered';
          npc.caughtTimer = 0;
          if (!npc.searchId && !npc.protectedTargetId) { npc.intent = 'patrol'; npc.mode = 'patrol'; npc.navGoal = null; }
        }
        showToast('RADIO TRAFFIC QUIETS', 'Security has returned to its search pattern. Keep your distance.', 'good');
      }
    }
    for (const event of mission.noiseEvents) { event.age += dt; event.life -= dt; }
    mission.noiseEvents = mission.noiseEvents.filter((event) => event.life > 0);
    for (const coin of mission.coinsOnGround) coin.life -= dt;
    mission.coinsOnGround = mission.coinsOnGround.filter((coin) => coin.life > 0);
    for (const effect of mission.effects) effect.life -= dt;
    mission.effects = mission.effects.filter((effect) => effect.life > 0);
    maybeDemoteCrowd();
  }

  function updatePlayer(dt) {
    if (!player || mode !== 'playing') return;
    const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    const movement = window.SilentCoast3D?.mapMovement(x, y) || { x, y };
    const moveX = movement.x;
    const moveY = movement.y;
    const moving = x !== 0 || y !== 0;
    const running = moving && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !player.crouched;
    player.wasMoving = moving;
    player.weaponVisibleTimer = Math.max(0, player.weaponVisibleTimer - dt);
    if (moving) {
      if (player.blending) player.blending = false;
      const length = Math.hypot(moveX, moveY);
      const dx = moveX / length;
      const dy = moveY / length;
      player.faceX = dx;
      player.faceY = dy;
      const speed = (player.crouched ? 66 : running ? 205 : 128) * (player.dragging ? 0.58 : 1);
      moveActor(player, dx * speed * dt, dy * speed * dt, player.radius);
      player.walkCycle += dt * (running ? 13 : player.crouched ? 5 : 8);
      player.footsteps += dt;
      const stepDelay = running ? 0.37 : player.crouched ? 0.84 : 0.61;
      if (player.footsteps >= stepDelay) {
        player.footsteps = 0;
        if (running) makeNoise(player.x, player.y, 120, 'footstep');
        else if (player.dragging) makeNoise(player.x, player.y, 78, 'drag');
        else if (!player.crouched) makeNoise(player.x, player.y, 42, 'footstep');
      }
    } else {
      player.footsteps = Math.min(player.footsteps, 0.3);
    }
    if (player.dragging) {
      const body = npcs.find((npc) => npc.id === player.dragging);
      if (body) {
        body.x = player.x - player.faceX * bodyDragOffset;
        body.y = player.y - player.faceY * bodyDragOffset;
      }
    }
    if (player.blending && moving) player.blending = false;
    const region = getRegion(player.x, player.y);
    const suspicionKey = disguiseIdentityKey(region, player.disguise);
    let localSuspicion = mission.suspicionLevels[suspicionKey] || 0;
    if (!mission.alarm) {
      if (isTrespassing() && !player.blending) localSuspicion += dt * 1.8;
      else if (!isTrespassing()) localSuspicion -= dt * 3.2;
      if (player.blending) localSuspicion -= dt * 8;
    }
    mission.suspicionLevels[suspicionKey] = clamp(localSuspicion, 0, 100);
    mission.suspicion = mission.suspicionLevels[suspicionKey];
    if (region === 'building' || region === 'service' || region === 'secure') {
      if (canAccess(player.disguise, region) && !mission.enteredVenue) {
        mission.enteredVenue = true;
        showToast('INSIDE THE VENUE', 'Stay in character. Security is checking credentials.', 'good');
      }
    }
  }

  function handlePressed() {
    if (mode !== 'playing') { pressed.clear(); return; }
    if (pressed.has('KeyE')) interact();
    if (pressed.has('KeyQ')) doTakedown();
    if (pressed.has('KeyG')) dragBody();
    if (pressed.has('KeyH')) hideBody();
    if (pressed.has('KeyF')) useEquippedItem();
    if (pressed.has('KeyC')) {
      player.crouched = !player.crouched;
      showToast(player.crouched ? 'LOW PROFILE' : 'STANDING', player.crouched ? 'You are harder to spot, and almost silent.' : 'You are moving at normal height.');
    }
    if (pressed.has('Digit1')) selectItem('wire');
    if (pressed.has('Digit2')) selectItem('pistol');
    if (pressed.has('Digit3')) selectItem('coin');
    if (pressed.has('Tab')) toggleMap();
    pressed.clear();
  }

  function selectItem(item) {
    if (!player) return;
    player.selectedItem = item;
    if (item === 'pistol') player.weaponVisibleTimer = 0;
    updateHudStatic();
  }

  function updateCamera(dt) {
    if (mode === 'playing' || mode === 'paused' || mode === 'ended') {
      const lookX = player.x + player.faceX * 55;
      const lookY = player.y + player.faceY * 28;
      const smoothing = 1 - Math.exp(-dt * 5.5);
      camera.x += (lookX - camera.x) * smoothing;
      camera.y += (lookY - camera.y) * smoothing;
    } else {
      camera.x += (1060 - camera.x) * Math.min(1, dt * 0.75);
      camera.y += (620 - camera.y) * Math.min(1, dt * 0.75);
    }
    const halfW = view.width / (2 * view.zoom);
    const halfH = view.height / (2 * view.zoom);
    camera.x = clamp(camera.x, halfW - 25, WORLD.width - halfW + 25);
    camera.y = clamp(camera.y, halfH - 25, WORLD.height - halfH + 25);
  }

  function updateHud() {
    if (!mission || !['playing', 'paused'].includes(mode)) return;
    setSuspicionUI();
    updateContextPrompt();
    $('#blendIndicator').hidden = !player.blending;
  }

  function update(dt) {
    animationTime += dt;
    if (mode === 'playing' && mission) {
      mission.elapsed += dt;
      updatePlayer(dt);
      handlePressed();
      updateNPCs(dt);
      updateCamera(dt);
      updateHud();
    } else {
      pressed.clear();
      updateCamera(dt);
    }
  }

  function finishMission(success) {
    if (!mission || mode === 'ended') return;
    mission.failed = !success;
    mission.extracted = success;
    if (success && !completedContracts.includes(activeContract.id)) {
      completedContracts.push(activeContract.id);
      saveProgress();
    }
    const clean = success && !mission.alarm && mission.bodyDiscoveries === 0 && mission.civilianCasualties === 0;
    const rating = success ? clean ? 'SILENT ASSASSIN' : mission.alarm ? 'PROFESSIONAL' : 'FIELD AGENT' : 'COMPROMISED';
    const baseScore = success ? 15000 : 2400;
    const score = Math.max(900, baseScore + mission.scoreBonus - mission.bodyDiscoveries * 850 - mission.civilianCasualties * 1800 - (mission.alarm ? 2600 : 0));
    $('#endEmblem').textContent = success ? '07' : '!';
    $('#endKicker').textContent = success ? 'CONTRACT COMPLETE' : 'MISSION FAILED';
    $('#endHeading').textContent = success ? 'A CLEAN EXIT.' : 'YOU WERE MADE.';
    $('#endCopy').textContent = success ? `${activeContract.title} is closed. No loose ends.` : 'Security got too close. The contract is compromised; regroup and try again.';
    $('#missionRating').textContent = rating;
    $('#missionScore').textContent = `${score.toLocaleString()} XP`;
    $('#playAgain').querySelector('span').textContent = success ? 'REPLAY CONTRACT' : 'RETRY CONTRACT';
    $('#endScreen').classList.toggle('is-failure', !success);
    setMode('ended');
    sfx(success ? 'success' : 'alert');
    renderContractPicker();
  }

  function toggleMap() {
    const wrap = $('#minimapWrap');
    wrap.classList.toggle('expanded');
    resizeMiniMap();
  }
  function togglePause() {
    if (mode === 'playing') {
      keys.clear();
      setMode('paused');
      sfx('ui');
    } else if (mode === 'paused') {
      setMode('playing');
      sfx('ui');
    }
  }

  function updateContractPickerAndBriefing() {
    updateContractUI(selectedContract);
    renderContractPicker();
  }

  // --- Canvas rendering -----------------------------------------------------
  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }
  function fillRound(context, x, y, width, height, radius, fill, stroke = null) {
    roundRect(context, x, y, width, height, radius);
    context.fillStyle = fill;
    context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 1; context.stroke(); }
  }
  function drawWorld(dt = 1 / 60) {
    const renderer = window.SilentCoast3D;
    if (renderer) {
      renderer.render({
        mode,
        theme: activeContract.theme,
        contractId: activeContract.id,
        world: WORLD,
        building: BUILDING,
        walls: WALLS,
        props: PROPS,
        view,
        camera,
        player,
        npcs,
        crowd,
        mission,
        animationTime
      }, dt);
    }
    drawMinimap();
  }

  function drawMinimap() {
    resizeMiniMap();
    const width = miniCanvas.width;
    const height = miniCanvas.height;
    miniCtx.clearRect(0, 0, width, height);
    if (!width || !height) return;
    const sx = width / WORLD.width;
    const sy = height / WORLD.height;
    miniCtx.save();
    miniCtx.scale(sx, sy);
    const theme = themes[activeContract.theme] || themes.coast;
    miniCtx.fillStyle = activeContract.theme === 'night' ? '#222b30' : activeContract.theme === 'villa' ? '#60745c' : '#74877d';
    miniCtx.fillRect(0, 0, WORLD.width, WORLD.height);
    miniCtx.fillStyle = activeContract.theme === 'night' ? '#202a32' : '#247380';
    miniCtx.fillRect(1510, 1250, 690, 150);
    if (activeContract.theme !== 'villa') miniCtx.fillRect(1630, 195, 397, 225);
    miniCtx.fillStyle = theme.paving; miniCtx.fillRect(0, 170, 455, 660); miniCtx.fillRect(1555, 425, 460, 670);
    miniCtx.fillStyle = theme.interior; miniCtx.fillRect(BUILDING.x, BUILDING.y, BUILDING.w, BUILDING.h);
    miniCtx.fillStyle = theme.wall;
    WALLS.forEach((wall) => miniCtx.fillRect(wall.x, wall.y, wall.w, wall.h));
    miniCtx.fillStyle = 'rgba(215,222,209,.5)';
    [[282,555,56],[1780,690,75]].forEach(([x,y,r]) => { miniCtx.beginPath(); miniCtx.arc(x, y, r, 0, TAU); miniCtx.fill(); });
    if (mission?.searches) {
      for (const search of mission.searches) {
        miniCtx.fillStyle = 'rgba(232,79,69,.18)';
        miniCtx.beginPath(); miniCtx.arc(search.x, search.y, search.radius, 0, TAU); miniCtx.fill();
        miniCtx.strokeStyle = 'rgba(238,102,89,.75)'; miniCtx.lineWidth = 7;
        miniCtx.beginPath(); miniCtx.arc(search.x, search.y, search.radius, 0, TAU); miniCtx.stroke();
      }
    }
    for (const npc of npcs) {
      if (npc.hidden || npc.down || npc.dead) continue;
      miniCtx.fillStyle = npc.target ? '#e6514a' : npc.enforcer ? '#ffffff' : npc.isGuard ? '#ddb75f' : 'rgba(211,220,208,.57)';
      const r = npc.target && mission?.intelFound ? 7 : npc.enforcer ? 5.8 : npc.isGuard ? 5 : 3.7;
      miniCtx.beginPath(); miniCtx.arc(npc.x, npc.y, r, 0, TAU); miniCtx.fill();
    }
    if (player) {
      miniCtx.fillStyle = '#fff'; miniCtx.beginPath(); miniCtx.arc(player.x, player.y, 8, 0, TAU); miniCtx.fill();
      miniCtx.strokeStyle = 'rgba(255,255,255,.55)'; miniCtx.lineWidth = 3; miniCtx.beginPath(); miniCtx.arc(player.x, player.y, 14, 0, TAU); miniCtx.stroke();
    }
    if (mission?.targets.primary && mission?.targets.secondary) {
      const exit = PROPS.find((prop) => prop.type === 'exit');
      miniCtx.fillStyle = '#83d59c'; miniCtx.beginPath(); miniCtx.arc(exit.x, exit.y, 10, 0, TAU); miniCtx.fill();
    }
    miniCtx.restore();
    // Player-facing camera footprint.
    miniCtx.save();
    const cx = camera.x * sx, cy = camera.y * sy;
    const rx = (view.width / view.zoom / 2) * sx;
    const ry = (view.height / view.zoom / 2) * sy;
    miniCtx.strokeStyle = 'rgba(255,255,255,.27)'; miniCtx.lineWidth = Math.max(1, width / 300);
    miniCtx.strokeRect(cx - rx, cy - ry, rx * 2, ry * 2);
    miniCtx.restore();
  }

  function renderLoop(time) {
    const dt = previousTime ? Math.min(0.12, (time - previousTime) / 1000) : 0.016;
    previousTime = time;
    update(dt);
    drawWorld(dt);
    requestAnimationFrame(renderLoop);
  }

  // --- Interface and input --------------------------------------------------
  $('#openBriefing').addEventListener('click', () => {
    selectedContract = contracts.find((item) => item.id === selectedContract.id) || contracts[0];
    updateContractUI(selectedContract);
    setMode('briefing');
    sfx('ui');
  });
  $('#closeBriefing').addEventListener('click', () => { setMode('menu'); sfx('ui'); });
  $('#deployMission').addEventListener('click', () => beginMission(selectedContract));
  $('#pauseButton').addEventListener('click', togglePause);
  $('#resumeMission').addEventListener('click', togglePause);
  $('#restartMission').addEventListener('click', () => beginMission(activeContract));
  $('#returnMenu').addEventListener('click', () => { initMenuScene(selectedContract); setMode('menu'); renderContractPicker(); });
  $('#playAgain').addEventListener('click', () => beginMission(activeContract));
  $('#backToMenu').addEventListener('click', () => { initMenuScene(selectedContract); setMode('menu'); renderContractPicker(); });
  $('#toggleMap').addEventListener('click', toggleMap);
  document.querySelectorAll('.weapon-slot').forEach((slot) => {
    slot.addEventListener('click', () => {
      const item = ({ 1: 'wire', 2: 'pistol', 3: 'coin' })[slot.dataset.slot];
      selectItem(item);
      sfx('ui');
    });
  });
  $('#storyHintButton').addEventListener('click', () => {
    if (!mission) return;
    showToast(mission.intelFound ? 'OPPORTUNITY REVEALED' : 'FIELD TIP', mission.intelFound ? activeContract.opportunity : `Look for ${activeContract.intelName} in the restricted security wing. Staff and technician disguises open doors; security can access the whole venue.`);
  });
  $('#showControls').addEventListener('click', () => { setMode('manual'); sfx('ui'); });
  $('#closeManual').addEventListener('click', () => { setMode('menu'); sfx('ui'); });
  $('#manualDone').addEventListener('click', () => { setMode('menu'); sfx('confirm'); });
  $('#soundToggle').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    $('#soundToggle').classList.toggle('is-muted', !soundEnabled);
    $('#soundToggle').setAttribute('aria-label', soundEnabled ? 'Mute sound effects' : 'Enable sound effects');
    $('#soundToggle').title = soundEnabled ? 'Sound effects on' : 'Sound effects muted';
    if (soundEnabled) sfx('ui');
  });

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code)) event.preventDefault();
    if (code === 'Escape') {
      if (mode === 'playing' || mode === 'paused') togglePause();
      else if (mode === 'briefing') setMode('menu');
      else if (mode === 'manual') setMode('menu');
      return;
    }
    if (mode === 'menu' && (code === 'Enter' || code === 'Space')) { setMode('briefing'); updateContractUI(selectedContract); return; }
    if (mode === 'briefing' && (code === 'Enter' || code === 'Space')) { beginMission(selectedContract); return; }
    if (mode !== 'playing') return;
    if (!event.repeat) pressed.add(code);
    keys.add(code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    const worldPoint = window.SilentCoast3D?.screenToWorld(mouse.x, mouse.y);
    mouse.worldX = worldPoint ? worldPoint.x : camera.x + (mouse.x - view.width / 2) / view.zoom;
    mouse.worldY = worldPoint ? worldPoint.y : camera.y + (mouse.y - view.height / 2) / view.zoom;
    mouse.hasMoved = true;
  }
  canvas.addEventListener('mousemove', updateMousePosition);
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || mode !== 'playing') return;
    useEquippedItem();
  });
  window.addEventListener('mousemove', (event) => {
    if (mode === 'playing') updateMousePosition(event);
  });
  window.addEventListener('contextmenu', (event) => {
    if (mode === 'playing') event.preventDefault();
  });

  // A few menu keys are available even before deployment.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape' && mode === 'ended') { initMenuScene(selectedContract); setMode('menu'); }
  });

  // Boot into the contract-selection screen.
  resize();
  updateContractUI(selectedContract);
  renderContractPicker();
  initMenuScene(selectedContract);
  setMode('menu');
  requestAnimationFrame(renderLoop);
})();
