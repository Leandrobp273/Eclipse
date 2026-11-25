export type CharacterId = 'abyssal' | 'celestial';

export type RoomId =
  | 'movement_lab'
  | 'combat_arena'
  | 'boss_arena'
  | 'swarm_crypt'
  | 'colossus_hall'
  | 'ember_sanctum';

export type GameScreen = 'CHARACTER_SELECT' | 'PLAYING' | 'MAP_PAUSED';

export type PlayerState =
  | 'IDLE'
  | 'RUNNING'
  | 'JUMPING'
  | 'FALLING'
  | 'DASHING'
  | 'ATTACKING'
  | 'PARRYING'
  | 'HEALING'
  | 'HURT'
  | 'DEAD';

export type EnemyType = 'grunt' | 'hunter' | 'ranged' | 'swarmling' | 'brute' | 'mage';

export type EnemyState =
  | 'IDLE'
  | 'PATROL'
  | 'CHASE'
  | 'TELEGRAPH'
  | 'ATTACK'
  | 'RECOVER'
  | 'STAGGERED'
  | 'HURT'
  | 'DEAD';

export type BossId = 'fallen_judgment' | 'ashen_sovereign';

export type BossPhase = 1 | 2 | 3;

export type BossState =
  | 'WAITING'
  | 'INTRO'
  | 'IDLE'
  | 'APPROACH'
  | 'TELEGRAPH'
  | 'ATTACK'
  | 'RECOVERY'
  | 'STAGGERED'
  | 'PHASE_TRANSITION'
  | 'ORB_INTRO'
  | 'ORB_CHARGE'
  | 'ORB_FOCUS'
  | 'ORB_FALL'
  | 'DEATH';

export type BossAttackType =
  | 'abyssal_slash'
  | 'celestial_descent'
  | 'abyssal_projectiles'
  | 'judgment_charge'
  | 'corte_ardente'
  | 'investida_sombria'
  | 'chuva_de_cinzas'
  | 'ruptura'
  | 'ultimo_suspiro';

export interface AttackStageConfig {
  damage: number;
  windup: number;
  active: number;
  recovery: number;
  range: number;
  height: number;
  knockbackX: number;
  knockbackY: number;
  essenceGain: number;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  subtitle: string;
  originForce: 'ABYSSAL' | 'CELESTIAL';
  description: string;
  gameplayIdentity: string;
  movementSummary: string;
  combatSummary: string;
  specialAbilitySummary: string;
  stats: {
    maxHealth: number;
    maxEssence: number;
    healCost: number;
    healAmount: number;
    healDuration: number;
    maxSpeed: number;
    acceleration: number;
    deceleration: number;
    airAcceleration: number;
    jumpVelocity: number;
    gravity: number;
    fallGravityMultiplier: number;
    jumpCutMultiplier: number;
    maxFallSpeed: number;
    coyoteTime: number;
    jumpBufferTime: number;
    dashSpeed: number;
    dashDuration: number;
    dashInvulnDuration: number;
    dashCooldown: number;
    parryWindow: number;
    parryCooldown: number;
    parryEssenceGain: number;
    hitboxWidth: number;
    hitboxHeight: number;
    combo: [AttackStageConfig, AttackStageConfig, AttackStageConfig];
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    trail: string;
    parryFlash: string;
  };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform extends Rect {
  kind: 'floor' | 'stone' | 'wall' | 'ceiling' | 'oneway';
}

export interface Doorway extends Rect {
  id: string;
  targetRoom: RoomId;
  targetSpawnX: number;
  targetSpawnY: number;
  label: string;
  lockedByBoss?: boolean;
}

export interface TestMarker {
  code: string;
  title: string;
  hint: string;
  x: number;
  y: number;
}

export interface EnemySpawn {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
}

export interface RoomDefinition {
  id: RoomId;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  defaultSpawn: { x: number; y: number };
  theme: 'lab' | 'combat' | 'boss' | 'ember';
  platforms: Platform[];
  doorways: Doorway[];
  testMarkers: TestMarker[];
  enemySpawns: EnemySpawn[];
  bossId?: BossId;
  bossSpawn?: { x: number; y: number };
  bossTriggerX?: number;
  giantSwordMonument?: { x: number; y: number };
}

export interface PlayerEntity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  state: PlayerState;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  dashTimer: number;
  dashInvulnTimer: number;
  dashCooldownTimer: number;
  dashDirX: number;
  dashDirY: number;
  canAirDash: boolean;
  comboStage: 0 | 1 | 2;
  attackTimer: number;
  attackTotalTime: number;
  comboResetTimer: number;
  queuedAttack: boolean;
  attackHitIds: Set<string>;
  parryTimer: number;
  parryCooldownTimer: number;
  parrySuccessFlash: number;
  parryFailFlash: number;
  healTimer: number;
  hurtTimer: number;
  invulnTimer: number;
  health: number;
  maxHealth: number;
  essence: number;
  maxEssence: number;
  // Character-specific special abilities & ultimates
  abyssalTeleportCooldown: number;
  abyssalEmpoweredTimer: number;
  rage: number;
  maxRage: number;
  revolverState: 'NONE' | 'DRAW' | 'FIRE';
  revolverTimer: number;
  revolverPoseTimer: number;
  comboCount: number;
  comboDecayTimer: number;
  recentDamageTaken: number;
  recentDamageTimer: number;
  ultimateCharge: number;
  maxUltimateCharge: number;
  celestialReviveAvailable: boolean;
  celestialReviveFlash: number;
  canDoubleJump: boolean;
  wingFlapTimer: number;
  animTime: number;
  shackleAngleL: number;
  shackleVelL: number;
  shackleAngleR: number;
  shackleVelR: number;
  hairNodes: { x: number; y: number }[];
  afterimages: { x: number; y: number; facing: 1 | -1; alpha: number; state: PlayerState }[];
}

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  health: number;
  maxHealth: number;
  damage: number;
  state: EnemyState;
  stateTimer: number;
  attackCooldown: number;
  hitFlash: number;
  staggerTimer: number;
  parrable: boolean;
  patrolOriginX: number;
  animTime: number;
  hasHitCurrentSwing: boolean;
  buffTimer: number;
  burnTimer: number;
  burnTickTimer: number;
  burnDps: number;
  mageHealCooldown: number;
  mageBuffCooldown: number;
  castingSpell: 'heal' | 'buff' | null;
}

export interface BossEntity {
  id: BossId;
  active: boolean;
  defeated: boolean;
  name: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  health: number;
  maxHealth: number;
  displayHealth: number;
  phase: BossPhase;
  state: BossState;
  stateTimer: number;
  introProgress: number;
  attackCooldown: number;
  currentAttack: BossAttackType | null;
  parrable: boolean;
  parryStunDuration: number;
  targetX: number;
  targetY: number;
  descentWarningX: number;
  descentPhase: 'rising' | 'hovering' | 'crashing' | 'impact';
  comboStep: number;
  hasHitCurrentSwing: boolean;
  hitFlash: number;
  staggerTimer: number;
  aiPaused: boolean;
  animTime: number;
  projectilesFiredInAttack: number;
  phase2Triggered: boolean;
  phase3Triggered: boolean;
  phase3PortalsUsed: boolean;
  burnTimer: number;
  burnTickTimer: number;
  burnDps: number;
}

export interface BossStructure {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  health: number;
  maxHealth: number;
  hitFlash: number;
  platformIndex: number;
}

export interface IgnisOrbState {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  chargeTime: number;
  maxChargeTime: number;
  beamProgress: number;
  phase: 'RISING' | 'CHARGING' | 'FOCUS' | 'FALLING';
}

export interface CerberusSummon {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  state: 'EMERGE' | 'LUNGE' | 'BITE' | 'VANISH';
  timer: number;
  targetX: number;
  targetY: number;
  hasBitten: boolean;
  animTime: number;
}

export interface GiantBibleSummon {
  active: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  startY: number;
  floorY: number;
  state: 'APPEAR' | 'SLAM' | 'LINGER';
  timer: number;
  hasSlammed: boolean;
  animTime: number;
}

export interface BossPortal {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  side: 'left' | 'right' | 'sky';
  life: number;
  maxLife: number;
  telegraphTime: number;
  spawnAccum: number;
  color: string;
}

export interface SummonedSword {
  id: string;
  slotIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  state: 'SUMMONING' | 'CHASING';
  summonProgress: number;
  chargeTimer: number;
  damage: number;
  life: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  parrable: boolean;
  fromBoss: boolean;
  color: string;
  life: number;
  reflected?: boolean;
  kind?: 'orb' | 'ash_rain' | 'fire_wave' | 'portal_rain' | 'revolver_bullet';
  fromPlayer?: boolean;
  w?: number;
  h?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
  shape?: 'square' | 'circle' | 'spark' | 'smoke' | 'ring';
}

export interface SlashEffect {
  x: number;
  y: number;
  facing: 1 | -1;
  radius: number;
  angleStart: number;
  angleEnd: number;
  color: string;
  glow: string;
  life: number;
  maxLife: number;
  kind: 'chain' | 'celestial' | 'boss' | 'shockwave' | 'parry' | 'greatsword';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  large?: boolean;
}

export interface HudSnapshot {
  roomId: RoomId;
  roomName: string;
  roomSubtitle: string;
  characterId: CharacterId;
  characterName: string;
  health: number;
  maxHealth: number;
  essence: number;
  maxEssence: number;
  healCost: number;
  playerState: PlayerState;
  dashCooldown: number;
  dashCooldownMax: number;
  parryCooldown: number;
  healProgress: number;
  abyssalTeleportCooldown: number;
  abyssalEmpoweredTimer: number;
  rage: number;
  maxRage: number;
  revolverReady: boolean;
  revolverActive: boolean;
  comboCount: number;
  ultimateCharge: number;
  maxUltimateCharge: number;
  celestialReviveAvailable: boolean;
  canDoubleJump: boolean;
  nearbyDoorLabel: string | null;
  nearbyDoorLocked: boolean;
  room2EnemiesAlive: number;
  room2EnemiesTotal: number;
  swarmCryptEnemiesAlive: number;
  swarmCryptEnemiesTotal: number;
  colossusHallEnemiesAlive: number;
  colossusHallEnemiesTotal: number;
  orbCountdown: number | null;
  orbPhase: 'RISING' | 'CHARGING' | 'FOCUS' | 'FALLING' | null;
  structuresRemaining: number;
  structuresTotal: number;
  boss: {
    id: BossId;
    visible: boolean;
    name: string;
    title: string;
    health: number;
    displayHealth: number;
    maxHealth: number;
    phase: BossPhase;
    state: BossState;
    defeated: boolean;
  };
  bossIntroBanner: {
    active: boolean;
    name: string;
    title: string;
    progress: number;
  };
  fallenJudgmentDefeated: boolean;
  ashenSovereignDefeated: boolean;
  victoryBannerTimer: number;
  victoryBossName: string;
  isDead: boolean;
}

export interface DebugSnapshot {
  fps: number;
  roomId: RoomId;
  vx: number;
  vy: number;
  state: PlayerState;
  x: number;
  y: number;
  grounded: boolean;
  dashing: boolean;
  dashCooldown: number;
  health: number;
  essence: number;
  parryWindowActive: boolean;
  invulnActive: boolean;
  boss: {
    id: BossId;
    active: boolean;
    health: number;
    maxHealth: number;
    phase: BossPhase;
    state: BossState;
    currentAttack: string;
    attackCooldown: number;
    targetX: number;
    targetY: number;
    distanceToPlayer: number;
    staggered: boolean;
    aiPaused: boolean;
  };
}

export interface DebugOptions {
  showHitboxes: boolean;
  showDetectionRanges: boolean;
  godMode: boolean;
}
