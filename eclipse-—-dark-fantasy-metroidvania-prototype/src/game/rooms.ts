import { RoomDefinition, RoomId } from './types';

export const ROOMS: Record<RoomId, RoomDefinition> = {
  movement_lab: {
    id: 'movement_lab',
    name: 'Sala 1 · Laboratório de Movimento',
    subtitle: 'Santuário Neutro · Sem Inimigos',
    width: 3100,
    height: 920,
    defaultSpawn: { x: 140, y: 720 },
    theme: 'lab',
    platforms: [
      // Outer boundaries
      { x: 0, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 3052, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 0, y: 0, w: 3100, h: 44, kind: 'ceiling' },

      // Main floor before Gap (Test A & Test B)
      { x: 48, y: 780, w: 1920, h: 140, kind: 'floor' },
      // Floor after Test G gap (leads to Test H & Doorway)
      { x: 2210, y: 780, w: 842, h: 140, kind: 'floor' },
      // Safety catch floor inside Test G gap so player can climb back out
      { x: 1968, y: 882, w: 242, h: 38, kind: 'floor' },
      // Stepping stone inside gap
      { x: 2050, y: 825, w: 80, h: 18, kind: 'stone' },

      // TEST C: Stepping platforms of varied heights
      { x: 760, y: 690, w: 130, h: 22, kind: 'stone' },
      { x: 930, y: 600, w: 130, h: 22, kind: 'stone' },
      { x: 1110, y: 505, w: 140, h: 22, kind: 'stone' },

      // TEST D: Small precision platforms
      { x: 1310, y: 505, w: 54, h: 18, kind: 'stone' },
      { x: 1435, y: 465, w: 48, h: 18, kind: 'stone' },
      { x: 1555, y: 515, w: 52, h: 18, kind: 'stone' },

      // TEST E: Vertical wall for collision testing (on ground)
      { x: 1220, y: 650, w: 46, h: 130, kind: 'wall' },

      // TEST F: Narrow dash corridor (low stone ceiling block above ground)
      { x: 1460, y: 625, w: 340, h: 82, kind: 'stone' },

      // TEST H: High platform for fall-speed / gravity testing
      { x: 2430, y: 440, w: 220, h: 24, kind: 'stone' },
      // Steps up to Test H
      { x: 2280, y: 675, w: 110, h: 20, kind: 'stone' },
      { x: 2330, y: 560, w: 110, h: 20, kind: 'stone' },
    ],
    doorways: [
      {
        id: 'door_lab_to_combat',
        x: 2945,
        y: 650,
        w: 75,
        h: 130,
        targetRoom: 'combat_arena',
        targetSpawnX: 145,
        targetSpawnY: 710,
        label: 'Arena de Combate',
      },
    ],
    testMarkers: [
      {
        code: 'TESTE A',
        title: 'Aceleração & Vel. Máx.',
        hint: 'Segure A / D em solo plano',
        x: 220,
        y: 740,
      },
      {
        code: 'TESTE B',
        title: 'Corredor de Desaceleração',
        hint: 'Solte o movimento e observe a parada',
        x: 540,
        y: 740,
      },
      {
        code: 'TESTE C',
        title: 'Alturas de Pulo',
        hint: 'Toque vs. Segurar Espaço',
        x: 920,
        y: 560,
      },
      {
        code: 'TESTE D',
        title: 'Precisão de Pouso',
        hint: 'Plataformas estreitas + Controle aéreo',
        x: 1435,
        y: 425,
      },
      {
        code: 'TESTE E',
        title: 'Parede de Colisão',
        hint: 'Teste colisão lateral e salto por cima',
        x: 1210,
        y: 590,
      },
      {
        code: 'TESTE F',
        title: 'Passagem de Dash',
        hint: 'Use SHIFT para atravessar o túnel baixo',
        x: 1580,
        y: 595,
      },
      {
        code: 'TESTE G',
        title: 'Grande Vão & Coyote',
        hint: 'Salte o abismo ou use Dash aéreo',
        x: 2088,
        y: 725,
      },
      {
        code: 'TESTE H',
        title: 'Queda Elevada',
        hint: 'Suba e observe vy / gravidade de queda',
        x: 2540,
        y: 380,
      },
    ],
    enemySpawns: [],
  },

  combat_arena: {
    id: 'combat_arena',
    name: 'Sala 2 · Arena de Combate',
    subtitle: 'Catacumbas Abissais · 3 Tipos de Inimigos',
    width: 2450,
    height: 920,
    defaultSpawn: { x: 150, y: 710 },
    theme: 'combat',
    platforms: [
      { x: 0, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 2402, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 0, y: 0, w: 2450, h: 44, kind: 'ceiling' },

      // Arena floor
      { x: 48, y: 780, w: 2354, h: 140, kind: 'floor' },

      // Elevated Gothic stone tiers
      { x: 440, y: 655, w: 230, h: 24, kind: 'stone' },
      { x: 860, y: 545, w: 320, h: 24, kind: 'stone' },
      { x: 1320, y: 645, w: 260, h: 24, kind: 'stone' },
      { x: 1750, y: 550, w: 280, h: 24, kind: 'stone' },
    ],
    doorways: [
      {
        id: 'door_combat_to_lab',
        x: 68,
        y: 650,
        w: 75,
        h: 130,
        targetRoom: 'movement_lab',
        targetSpawnX: 2860,
        targetSpawnY: 710,
        label: 'Laboratório',
      },
      {
        id: 'door_combat_to_boss',
        x: 2305,
        y: 650,
        w: 75,
        h: 130,
        targetRoom: 'boss_arena',
        targetSpawnX: 165,
        targetSpawnY: 730,
        label: 'Arena do Chefe',
      },
    ],
    testMarkers: [],
    enemySpawns: [
      { id: 'grunt_1', type: 'grunt', x: 740, y: 720 },
      { id: 'hunter_1', type: 'hunter', x: 1180, y: 720 },
      { id: 'ranged_1', type: 'ranged', x: 1020, y: 455 },
      { id: 'grunt_2', type: 'grunt', x: 1580, y: 720 },
      { id: 'hunter_2', type: 'hunter', x: 1920, y: 720 },
      { id: 'ranged_2', type: 'ranged', x: 1880, y: 465 },
    ],
  },

  boss_arena: {
    id: 'boss_arena',
    name: 'Sala 3 · Arena do Chefe',
    subtitle: 'Santuário Profanado · The Fallen Judgment',
    width: 2240,
    height: 950,
    defaultSpawn: { x: 165, y: 730 },
    theme: 'boss',
    platforms: [
      { x: 0, y: 0, w: 52, h: 950, kind: 'wall' },
      { x: 2188, y: 0, w: 52, h: 950, kind: 'wall' },
      { x: 0, y: 0, w: 2240, h: 48, kind: 'ceiling' },

      // Grand cathedral floor
      { x: 52, y: 800, w: 2136, h: 150, kind: 'floor' },

      // Flanking stone ledges to dodge Descent & Charge
      { x: 350, y: 665, w: 240, h: 24, kind: 'stone' },
      { x: 960, y: 575, w: 320, h: 24, kind: 'stone' },
      { x: 1650, y: 665, w: 240, h: 24, kind: 'stone' },
    ],
    doorways: [
      {
        id: 'door_boss_to_combat',
        x: 74,
        y: 670,
        w: 75,
        h: 130,
        targetRoom: 'combat_arena',
        targetSpawnX: 2220,
        targetSpawnY: 710,
        label: 'Arena de Combate',
        lockedByBoss: true,
      },
      {
        id: 'door_boss_to_swarm',
        x: 2088,
        y: 670,
        w: 75,
        h: 130,
        targetRoom: 'swarm_crypt',
        targetSpawnX: 155,
        targetSpawnY: 710,
        label: 'Cripta do Enxame',
        lockedByBoss: true,
      },
    ],
    testMarkers: [],
    enemySpawns: [],
    bossId: 'fallen_judgment',
    bossSpawn: { x: 1082, y: 662 },
    bossTriggerX: 340,
  },

  swarm_crypt: {
    id: 'swarm_crypt',
    name: 'Sala 4 · Cripta do Enxame',
    subtitle: 'Horda Alada · Minions Pequenos e Voadores',
    width: 2450,
    height: 920,
    defaultSpawn: { x: 150, y: 710 },
    theme: 'combat',
    platforms: [
      { x: 0, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 2402, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 0, y: 0, w: 2450, h: 44, kind: 'ceiling' },

      { x: 48, y: 780, w: 2354, h: 140, kind: 'floor' },

      { x: 420, y: 665, w: 240, h: 24, kind: 'stone' },
      { x: 840, y: 560, w: 300, h: 24, kind: 'stone' },
      { x: 1300, y: 655, w: 260, h: 24, kind: 'stone' },
      { x: 1740, y: 565, w: 280, h: 24, kind: 'stone' },
    ],
    doorways: [
      {
        id: 'door_swarm_to_boss',
        x: 68,
        y: 650,
        w: 75,
        h: 130,
        targetRoom: 'boss_arena',
        targetSpawnX: 1990,
        targetSpawnY: 730,
        label: 'Arena do Julgamento',
      },
      {
        id: 'door_swarm_to_colossus',
        x: 2305,
        y: 650,
        w: 75,
        h: 130,
        targetRoom: 'colossus_hall',
        targetSpawnX: 155,
        targetSpawnY: 710,
        label: 'Salão dos Colossos',
      },
    ],
    testMarkers: [],
    enemySpawns: [
      { id: 'swarm_1', type: 'swarmling', x: 560, y: 540 },
      { id: 'swarm_2', type: 'swarmling', x: 690, y: 440 },
      { id: 'swarm_3', type: 'swarmling', x: 850, y: 585 },
      { id: 'swarm_4', type: 'swarmling', x: 1020, y: 425 },
      { id: 'swarm_5', type: 'swarmling', x: 1210, y: 525 },
      { id: 'swarm_6', type: 'swarmling', x: 1410, y: 455 },
      { id: 'swarm_7', type: 'swarmling', x: 1580, y: 590 },
      { id: 'swarm_8', type: 'swarmling', x: 1770, y: 420 },
      { id: 'swarm_9', type: 'swarmling', x: 1930, y: 495 },
      { id: 'swarm_10', type: 'swarmling', x: 2080, y: 565 },
    ],
  },

  colossus_hall: {
    id: 'colossus_hall',
    name: 'Sala 5 · Salão dos Colossos',
    subtitle: 'Guarda Pesada · 3 Colossos + Mago Sombrio',
    width: 2500,
    height: 920,
    defaultSpawn: { x: 150, y: 710 },
    theme: 'combat',
    platforms: [
      { x: 0, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 2452, y: 0, w: 48, h: 920, kind: 'wall' },
      { x: 0, y: 0, w: 2500, h: 44, kind: 'ceiling' },

      { x: 48, y: 780, w: 2404, h: 140, kind: 'floor' },

      { x: 460, y: 660, w: 260, h: 24, kind: 'stone' },
      { x: 960, y: 560, w: 320, h: 24, kind: 'stone' },
      { x: 1580, y: 565, w: 320, h: 24, kind: 'stone' },
    ],
    doorways: [
      {
        id: 'door_colossus_to_swarm',
        x: 68,
        y: 650,
        w: 75,
        h: 130,
        targetRoom: 'swarm_crypt',
        targetSpawnX: 2210,
        targetSpawnY: 710,
        label: 'Cripta do Enxame',
      },
      {
        id: 'door_colossus_to_ember',
        x: 2355,
        y: 650,
        w: 75,
        h: 130,
        targetRoom: 'ember_sanctum',
        targetSpawnX: 165,
        targetSpawnY: 730,
        label: 'Forja das Cinzas',
      },
    ],
    testMarkers: [],
    enemySpawns: [
      { id: 'brute_1', type: 'brute', x: 760, y: 685 },
      { id: 'brute_2', type: 'brute', x: 1340, y: 685 },
      { id: 'brute_3', type: 'brute', x: 1940, y: 685 },
      { id: 'mage_1', type: 'mage', x: 2140, y: 716 },
    ],
  },

  ember_sanctum: {
    id: 'ember_sanctum',
    name: 'Sala 6 · Forja das Cinzas',
    subtitle: 'Santuário da Espada Colossal · Ignis, o Soberano das Cinzas',
    width: 2400,
    height: 950,
    defaultSpawn: { x: 165, y: 730 },
    theme: 'ember',
    platforms: [
      { x: 0, y: 0, w: 52, h: 950, kind: 'wall' },
      { x: 2348, y: 0, w: 52, h: 950, kind: 'wall' },
      { x: 0, y: 0, w: 2400, h: 48, kind: 'ceiling' },

      // Volcanic stone arena floor
      { x: 52, y: 800, w: 2296, h: 150, kind: 'floor' },

      // Elevated tactical platforms (4 platforms where Phase 3 structures spawn!)
      { x: 320, y: 670, w: 250, h: 24, kind: 'stone' },
      { x: 740, y: 555, w: 270, h: 24, kind: 'stone' },
      { x: 1390, y: 555, w: 270, h: 24, kind: 'stone' },
      { x: 1830, y: 670, w: 250, h: 24, kind: 'stone' },
    ],
    doorways: [
      {
        id: 'door_ember_to_colossus',
        x: 74,
        y: 670,
        w: 75,
        h: 130,
        targetRoom: 'colossus_hall',
        targetSpawnX: 2260,
        targetSpawnY: 710,
        label: 'Salão dos Colossos',
        lockedByBoss: true,
      },
    ],
    testMarkers: [],
    enemySpawns: [],
    bossId: 'ashen_sovereign',
    bossSpawn: { x: 1154, y: 650 },
    bossTriggerX: 330,
    giantSwordMonument: { x: 1200, y: 800 },
  },
};
