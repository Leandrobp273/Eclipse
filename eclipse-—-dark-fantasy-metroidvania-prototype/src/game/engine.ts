import { soundEngine } from './audio';
import { CHARACTER_CONFIGS } from './characters';
import { ROOMS } from './rooms';
import {
  BossAttackType,
  BossEntity,
  BossId,
  BossPortal,
  BossStructure,
  CerberusSummon,
  CharacterConfig,
  CharacterId,
  DebugOptions,
  DebugSnapshot,
  Doorway,
  EnemyEntity,
  EnemyType,
  FloatingText,
  GiantBibleSummon,
  HudSnapshot,
  IgnisOrbState,
  Particle,
  Platform,
  PlayerEntity,
  Projectile,
  Rect,
  RoomDefinition,
  RoomId,
  SlashEffect,
  SummonedSword,
} from './types';

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  jumpJustReleased: boolean;
  dashJustPressed: boolean;
  attackJustPressed: boolean;
  parryJustPressed: boolean;
  healJustPressed: boolean;
  abilityJustPressed: boolean;
  revolverJustPressed: boolean;
  ultimateJustPressed: boolean;
  interactJustPressed: boolean;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class GameEngine {
  public characterId: CharacterId;
  public config: CharacterConfig;
  public roomId: RoomId = 'movement_lab';
  public room: RoomDefinition = ROOMS.movement_lab;

  public player: PlayerEntity;
  public enemiesByRoom: Record<RoomId, EnemyEntity[]> = {
    movement_lab: [],
    combat_arena: [],
    boss_arena: [],
    swarm_crypt: [],
    colossus_hall: [],
    ember_sanctum: [],
  };
  public bossesById: Record<BossId, BossEntity>;
  public boss: BossEntity;

  public projectiles: Projectile[] = [];
  public bossPortals: BossPortal[] = [];
  public summonedSwords: SummonedSword[] = [];
  public bossStructures: BossStructure[] = [];
  public ignisOrb: IgnisOrbState | null = null;
  public cerberus: CerberusSummon | null = null;
  public giantBible: GiantBibleSummon | null = null;
  public particles: Particle[] = [];
  public slashes: SlashEffect[] = [];
  public floatingTexts: FloatingText[] = [];
  private swordRespawnQueue: { slotIndex: number; timer: number }[] = [];
  private ignisSwordsCooldown = 0;

  public cameraX = 0;
  public cameraY = 0;
  public cameraZoom = 1;
  public targetCameraZoom = 1;
  public cameraFocusTarget: { x: number; y: number } | null = null;
  public shakeTimer = 0;
  public shakeIntensity = 0;
  public hitstopTimer = 0;
  public screenPulseTimer = 0;
  public screenPulseMax = 0.35;
  public screenPulseColor = '#ef4444';
  public victoryBannerTimer = 0;
  public victoryBossName = '';
  public fps = 60;
  public debugOptions: DebugOptions = {
    showHitboxes: false,
    showDetectionRanges: false,
    godMode: false,
  };

  private nextId = 1;
  private onRoomChangeCb?: (roomId: RoomId) => void;

  constructor(initialCharacter: CharacterId, onRoomChange?: (roomId: RoomId) => void) {
    this.characterId = initialCharacter;
    this.config = CHARACTER_CONFIGS[initialCharacter];
    this.onRoomChangeCb = onRoomChange;
    this.player = this.createPlayer(this.room.defaultSpawn.x, this.room.defaultSpawn.y);
    this.bossesById = {
      fallen_judgment: this.createBoss('fallen_judgment'),
      ashen_sovereign: this.createBoss('ashen_sovereign'),
    };
    this.boss = this.bossesById.fallen_judgment;
    this.spawnEnemiesForRoom('combat_arena');
    this.spawnEnemiesForRoom('swarm_crypt');
    this.spawnEnemiesForRoom('colossus_hall');
    this.snapCamera();
  }

  private uid(prefix: string): string {
    this.nextId += 1;
    return `${prefix}_${this.nextId}`;
  }

  public setCharacter(id: CharacterId, preserveStats = true) {
    this.characterId = id;
    this.config = CHARACTER_CONFIGS[id];
    const prevHpRatio = this.player ? this.player.health / this.player.maxHealth : 1;
    const prevEssence = this.player ? this.player.essence : 40;
    const oldX = this.player ? this.player.x : this.room.defaultSpawn.x;
    const oldY = this.player ? this.player.y : this.room.defaultSpawn.y;
    this.player = this.createPlayer(oldX, oldY);
    this.player.w = this.config.stats.hitboxWidth;
    this.player.h = this.config.stats.hitboxHeight;
    if (preserveStats) {
      this.player.health = Math.max(20, Math.round(this.player.maxHealth * prevHpRatio));
      this.player.essence = prevEssence;
    }
  }

  private createPlayer(x: number, y: number): PlayerEntity {
    const s = this.config.stats;
    const hairNodes = Array.from({ length: 6 }, (_, i) => ({ x: x - i * 4, y: y + 8 + i * 5 }));
    return {
      x,
      y,
      w: s.hitboxWidth,
      h: s.hitboxHeight,
      vx: 0,
      vy: 0,
      facing: 1,
      state: 'IDLE',
      grounded: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      dashTimer: 0,
      dashInvulnTimer: 0,
      dashCooldownTimer: 0,
      dashDirX: 1,
      dashDirY: 0,
      canAirDash: true,
      comboStage: 0,
      attackTimer: 0,
      attackTotalTime: 0,
      comboResetTimer: 0,
      queuedAttack: false,
      attackHitIds: new Set(),
      parryTimer: 0,
      parryCooldownTimer: 0,
      parrySuccessFlash: 0,
      parryFailFlash: 0,
      healTimer: 0,
      hurtTimer: 0,
      invulnTimer: 0,
      health: s.maxHealth,
      maxHealth: s.maxHealth,
      essence: 40,
      maxEssence: s.maxEssence,
      abyssalTeleportCooldown: 0,
      abyssalEmpoweredTimer: 0,
      rage: 0,
      maxRage: 100,
      revolverState: 'NONE',
      revolverTimer: 0,
      revolverPoseTimer: 0,
      comboCount: 0,
      comboDecayTimer: 0,
      recentDamageTaken: 0,
      recentDamageTimer: 0,
      ultimateCharge: 0,
      maxUltimateCharge: 100,
      celestialReviveAvailable: true,
      celestialReviveFlash: 0,
      canDoubleJump: true,
      wingFlapTimer: 0,
      animTime: 0,
      shackleAngleL: 0,
      shackleVelL: 0,
      shackleAngleR: 0,
      shackleVelR: 0,
      hairNodes,
      afterimages: [],
    };
  }

  private createBoss(id: BossId): BossEntity {
    if (id === 'ashen_sovereign') {
      const room = ROOMS.ember_sanctum;
      const centerX = room.width / 2 - 44;
      const floorY = 800 - 150;
      return {
        id: 'ashen_sovereign',
        active: false,
        defeated: false,
        name: 'IGNIS, O SOBERANO DAS CINZAS',
        title: 'Portador da Espada Colossal',
        x: centerX,
        y: floorY,
        w: 88,
        h: 150,
        vx: 0,
        vy: 0,
        facing: -1,
        grounded: true,
        health: 1200,
        maxHealth: 1200,
        displayHealth: 1200,
        phase: 1,
        state: 'WAITING',
        stateTimer: 0,
        introProgress: 0,
        attackCooldown: 0.8,
        currentAttack: null,
        parrable: true,
        parryStunDuration: 1.5,
        targetX: centerX,
        targetY: floorY,
        descentWarningX: centerX,
        descentPhase: 'rising',
        comboStep: 0,
        hasHitCurrentSwing: false,
        hitFlash: 0,
        staggerTimer: 0,
        aiPaused: false,
        animTime: 0,
        projectilesFiredInAttack: 0,
        phase2Triggered: false,
        phase3Triggered: false,
        phase3PortalsUsed: false,
        burnTimer: 0,
        burnTickTimer: 0,
        burnDps: 0,
      };
    }

    const room = ROOMS.boss_arena;
    const centerX = room.width / 2 - 38;
    const floorY = 800 - 138;
    return {
      id: 'fallen_judgment',
      active: false,
      defeated: false,
      name: 'THE FALLEN JUDGMENT',
      title: 'Guardião Celestial Corrompido',
      x: centerX,
      y: floorY,
      w: 76,
      h: 138,
      vx: 0,
      vy: 0,
      facing: -1,
      grounded: true,
      health: 1080, // 2x health (540 -> 1080)
      maxHealth: 1080,
      displayHealth: 1080,
      phase: 1,
      state: 'WAITING',
      stateTimer: 0,
      introProgress: 0,
      attackCooldown: 0.75,
      currentAttack: null,
      parrable: true,
      parryStunDuration: 1.75,
      targetX: centerX,
      targetY: floorY,
      descentWarningX: centerX,
      descentPhase: 'rising',
      comboStep: 0,
      hasHitCurrentSwing: false,
      hitFlash: 0,
      staggerTimer: 0,
      aiPaused: false,
      animTime: 0,
      projectilesFiredInAttack: 0,
      phase2Triggered: false,
      phase3Triggered: false,
      phase3PortalsUsed: false,
      burnTimer: 0,
      burnTickTimer: 0,
      burnDps: 0,
    };
  }

  private spawnEnemiesForRoom(roomId: RoomId) {
    const room = ROOMS[roomId];
    this.enemiesByRoom[roomId] = room.enemySpawns.map((sp) => this.makeEnemy(sp.id, sp.type, sp.x, sp.y));
  }

  private makeEnemy(id: string, type: EnemyType, x: number, y: number): EnemyEntity {
    const baseExtras = {
      buffTimer: 0,
      burnTimer: 0,
      burnTickTimer: 0,
      burnDps: 0,
      mageHealCooldown: 5.0,
      mageBuffCooldown: 2.5,
      castingSpell: null as 'heal' | 'buff' | null,
    };

    if (type === 'swarmling') {
      return {
        id,
        type,
        name: 'Cria Abissal',
        x,
        y,
        w: 24,
        h: 24,
        vx: 0,
        vy: 0,
        facing: -1,
        grounded: false,
        health: 32,
        maxHealth: 32,
        damage: 9,
        state: 'PATROL',
        stateTimer: 0,
        attackCooldown: 0.35,
        hitFlash: 0,
        staggerTimer: 0,
        parrable: true,
        patrolOriginX: x,
        animTime: Math.random() * 5,
        hasHitCurrentSwing: false,
        ...baseExtras,
      };
    }

    if (type === 'brute') {
      return {
        id,
        type,
        name: 'Colosso de Ferro',
        x,
        y,
        w: 62,
        h: 94,
        vx: 0,
        vy: 0,
        facing: -1,
        grounded: false,
        health: 290,
        maxHealth: 290,
        damage: 34,
        state: 'PATROL',
        stateTimer: 0,
        attackCooldown: 0.8,
        hitFlash: 0,
        staggerTimer: 0,
        parrable: true,
        patrolOriginX: x,
        animTime: Math.random() * 5,
        hasHitCurrentSwing: false,
        ...baseExtras,
      };
    }

    if (type === 'mage') {
      return {
        id,
        type,
        name: 'Sacerdote Sombrio',
        x,
        y,
        w: 38,
        h: 64,
        vx: 0,
        vy: 0,
        facing: -1,
        grounded: false,
        health: 135,
        maxHealth: 135,
        damage: 14,
        state: 'IDLE',
        stateTimer: 0,
        attackCooldown: 1.5,
        hitFlash: 0,
        staggerTimer: 0,
        parrable: true,
        patrolOriginX: x,
        animTime: Math.random() * 5,
        hasHitCurrentSwing: false,
        ...baseExtras,
      };
    }

    if (type === 'grunt') {
      return {
        id,
        type,
        name: 'Lacaio Abissal',
        x,
        y,
        w: 34,
        h: 58,
        vx: 0,
        vy: 0,
        facing: -1,
        grounded: false,
        health: 75,
        maxHealth: 75,
        damage: 16,
        state: 'PATROL',
        stateTimer: 0,
        attackCooldown: 0.4,
        hitFlash: 0,
        staggerTimer: 0,
        parrable: true,
        patrolOriginX: x,
        animTime: Math.random() * 5,
        hasHitCurrentSwing: false,
        ...baseExtras,
      };
    }
    if (type === 'hunter') {
      return {
        id,
        type,
        name: 'Caçador Abissal',
        x,
        y,
        w: 36,
        h: 50,
        vx: 0,
        vy: 0,
        facing: -1,
        grounded: false,
        health: 65,
        maxHealth: 65,
        damage: 20,
        state: 'PATROL',
        stateTimer: 0,
        attackCooldown: 0.5,
        hitFlash: 0,
        staggerTimer: 0,
        parrable: true,
        patrolOriginX: x,
        animTime: Math.random() * 5,
        hasHitCurrentSwing: false,
        ...baseExtras,
      };
    }
    return {
      id,
      type: 'ranged',
      name: 'Vigia Abissal',
      x,
      y,
      w: 34,
      h: 54,
      vx: 0,
      vy: 0,
      facing: -1,
      grounded: false,
      health: 55,
      maxHealth: 55,
      damage: 15,
      state: 'IDLE',
      stateTimer: 0,
      attackCooldown: 1.0,
      hitFlash: 0,
      staggerTimer: 0,
      parrable: true,
      patrolOriginX: x,
      animTime: Math.random() * 5,
      hasHitCurrentSwing: false,
      ...baseExtras,
    };
  }

  public transitionToRoom(targetRoom: RoomId, spawnX?: number, spawnY?: number) {
    this.roomId = targetRoom;
    this.room = ROOMS[targetRoom];
    this.projectiles = [];
    this.bossPortals = [];
    this.summonedSwords = [];
    this.swordRespawnQueue = [];
    this.ignisSwordsCooldown = 0;
    this.bossStructures = [];
    this.ignisOrb = null;
    this.cerberus = null;
    this.giantBible = null;
    this.cameraFocusTarget = null;
    this.targetCameraZoom = 1;
    this.cameraZoom = 1;
    this.slashes = [];
    this.particles = [];
    this.floatingTexts = [];

    const sx = spawnX ?? this.room.defaultSpawn.x;
    const sy = spawnY ?? this.room.defaultSpawn.y;
    this.player.x = sx;
    this.player.y = sy;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.dashTimer = 0;
    this.player.attackTimer = 0;
    this.player.healTimer = 0;
    this.player.revolverState = 'NONE';
    this.player.revolverTimer = 0;
    this.player.revolverPoseTimer = 0;
    this.player.wingFlapTimer = 0;
    this.player.canDoubleJump = true;
    this.player.state = 'IDLE';

    if (this.room.bossId) {
      this.boss = this.bossesById[this.room.bossId];
      if (!this.boss.defeated) {
        this.resetBossEncounter(false, this.room.bossId);
      }
    }

    this.snapCamera();
    soundEngine.playDoor();
    this.onRoomChangeCb?.(targetRoom);
  }

  public respawnPlayer() {
    this.player.health = this.player.maxHealth;
    this.player.essence = Math.max(this.player.essence, 40);
    this.player.rage = 0;
    this.player.revolverState = 'NONE';
    this.player.revolverTimer = 0;
    this.player.revolverPoseTimer = 0;
    this.player.wingFlapTimer = 0;
    this.player.canDoubleJump = true;
    this.player.comboCount = 0;
    this.player.comboDecayTimer = 0;
    this.player.recentDamageTaken = 0;
    this.player.ultimateCharge = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = 'IDLE';
    this.player.invulnTimer = 1.0;
    this.player.hurtTimer = 0;
    this.player.x = this.room.defaultSpawn.x;
    this.player.y = this.room.defaultSpawn.y;
    if (this.characterId === 'celestial') {
      this.player.celestialReviveAvailable = true;
    }
    this.projectiles = [];
    this.bossPortals = [];
    this.summonedSwords = [];
    this.swordRespawnQueue = [];
    this.ignisSwordsCooldown = 0;
    this.bossStructures = [];
    this.ignisOrb = null;
    this.cerberus = null;
    this.giantBible = null;
    this.cameraFocusTarget = null;
    this.targetCameraZoom = 1;
    this.cameraZoom = 1;
    if (this.room.bossId && !this.boss.defeated) {
      this.resetBossEncounter(false, this.room.bossId);
    }
    this.snapCamera();
  }

  public resetCurrentRoom() {
    if (this.room.enemySpawns.length > 0) {
      this.spawnEnemiesForRoom(this.roomId);
    } else if (this.room.bossId) {
      this.resetBossEncounter(true, this.room.bossId);
    }
    this.player.x = this.room.defaultSpawn.x;
    this.player.y = this.room.defaultSpawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = this.player.maxHealth;
    this.player.rage = 0;
    this.player.revolverState = 'NONE';
    this.player.revolverTimer = 0;
    this.player.revolverPoseTimer = 0;
    this.player.wingFlapTimer = 0;
    this.player.canDoubleJump = true;
    this.player.comboCount = 0;
    this.player.comboDecayTimer = 0;
    this.player.recentDamageTaken = 0;
    this.player.ultimateCharge = 0;
    this.player.state = 'IDLE';
    this.projectiles = [];
    this.bossPortals = [];
    this.summonedSwords = [];
    this.swordRespawnQueue = [];
    this.ignisSwordsCooldown = 0;
    this.bossStructures = [];
    this.ignisOrb = null;
    this.cerberus = null;
    this.giantBible = null;
    this.cameraFocusTarget = null;
    this.targetCameraZoom = 1;
    this.cameraZoom = 1;
    this.snapCamera();
  }

  public resetBossEncounter(fullReset = true, targetBossId?: BossId) {
    const bid = targetBossId ?? this.room.bossId ?? 'fallen_judgment';
    const prevDefeated = fullReset ? false : this.bossesById[bid].defeated;
    const fresh = this.createBoss(bid);
    fresh.defeated = prevDefeated;
    if (prevDefeated) {
      fresh.state = 'DEATH';
      fresh.health = 0;
      fresh.displayHealth = 0;
    }
    this.bossesById[bid] = fresh;
    if (this.room.bossId === bid) {
      this.boss = fresh;
    }
    this.projectiles = [];
    this.bossPortals = [];
    this.summonedSwords = [];
    this.swordRespawnQueue = [];
    this.ignisSwordsCooldown = 0;
    this.bossStructures = [];
    this.ignisOrb = null;
    this.cameraFocusTarget = null;
    this.targetCameraZoom = 1;
    this.cameraZoom = 1;
  }

  public forceBossPhaseTransition() {
    if (!this.room.bossId || this.boss.defeated) return;
    if (!this.boss.active) {
      this.boss.active = true;
    }
    if (this.boss.phase === 1) {
      this.boss.health = Math.round(this.boss.maxHealth * 0.62);
      this.triggerBossPhase(2);
    } else if (this.boss.phase === 2) {
      this.boss.health = Math.round(this.boss.maxHealth * 0.28);
      this.triggerBossPhase(3);
    }
  }

  private triggerScreenPulse(color: string, duration = 0.35) {
    this.screenPulseColor = color;
    this.screenPulseTimer = duration;
    this.screenPulseMax = duration;
  }

  public update(dtRaw: number, input: InputState, viewportW: number, viewportH: number) {
    const dt = Math.min(dtRaw, 0.05);
    if (dt <= 0) return;

    if (this.victoryBannerTimer > 0) {
      this.victoryBannerTimer = Math.max(0, this.victoryBannerTimer - dt);
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    if (this.screenPulseTimer > 0) {
      this.screenPulseTimer = Math.max(0, this.screenPulseTimer - dt);
    }

    this.boss.displayHealth += (this.boss.health - this.boss.displayHealth) * Math.min(1, dt * 8);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateEffects(dt * 0.35);
      return;
    }

    this.updatePlayer(dt, input);
    this.updateUltimates(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateBossStructures(dt);
    this.updateBossPortals(dt);
    this.updateSummonedSwords(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.updateCamera(dt, viewportW, viewportH);

    if (input.interactJustPressed && this.player.state !== 'DEAD') {
      const door = this.getNearbyDoorway();
      if (door) {
        const locked = Boolean(door.lockedByBoss && this.room.bossId && !this.boss.defeated);
        if (locked) {
          this.addFloatingText(
            this.player.x + this.player.w / 2,
            this.player.y - 16,
            'Selo Ativo: Derrote o Chefe',
            '#f87171'
          );
          soundEngine.playParryFail();
        } else {
          this.transitionToRoom(door.targetRoom, door.targetSpawnX, door.targetSpawnY);
        }
      }
    }
  }

  public getNearbyDoorway(): Doorway | null {
    const pRect: Rect = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    for (const d of this.room.doorways) {
      if (rectsOverlap(pRect, d)) return d;
    }
    return null;
  }

  private spawnCharacterMovementVFX(kind: 'run' | 'dash' | 'jump') {
    const p = this.player;
    const cx = p.x + p.w / 2;
    const by = p.y + p.h;
    if (this.characterId === 'abyssal') {
      if (kind === 'run' && Math.random() < 0.35) {
        this.particles.push({
          x: cx + (Math.random() - 0.5) * 14,
          y: by - 4,
          vx: -p.facing * (15 + Math.random() * 25),
          vy: -10 - Math.random() * 18,
          size: 4 + Math.random() * 3,
          color: '#18181b',
          alpha: 0.65,
          life: 0.38,
          maxLife: 0.38,
          shape: 'smoke',
        });
      } else if (kind === 'dash') {
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: cx + (Math.random() - 0.5) * 18,
            y: p.y + Math.random() * p.h,
            vx: -p.dashDirX * (60 + Math.random() * 80),
            vy: -p.dashDirY * 40 + (Math.random() - 0.5) * 40,
            size: i % 2 === 0 ? 6 : 3,
            color: i % 2 === 0 ? '#18181b' : '#dc2626',
            alpha: 0.85,
            life: 0.35,
            maxLife: 0.35,
            shape: i % 2 === 0 ? 'smoke' : 'circle',
          });
        }
      } else if (kind === 'jump') {
        this.spawnStyledBurst(cx, by, 7, '#27272a', 90, 'smoke');
        this.spawnStyledBurst(cx, by, 4, '#dc2626', 110, 'spark');
      }
    } else {
      if (kind === 'run' && Math.random() < 0.32) {
        this.particles.push({
          x: cx + (Math.random() - 0.5) * 12,
          y: p.y + Math.random() * p.h * 0.8,
          vx: -p.facing * 20,
          vy: -14 - Math.random() * 16,
          size: 2.5,
          color: Math.random() < 0.6 ? '#fde047' : '#ffffff',
          alpha: 0.75,
          life: 0.42,
          maxLife: 0.42,
          shape: 'circle',
        });
      } else if (kind === 'dash') {
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: cx + (Math.random() - 0.5) * 14,
            y: p.y + Math.random() * p.h,
            vx: -p.dashDirX * 70,
            vy: -p.dashDirY * 45 + (Math.random() - 0.5) * 30,
            size: i % 2 === 0 ? 4 : 2.5,
            color: i % 2 === 0 ? '#fde047' : '#e0f2fe',
            alpha: 0.85,
            life: 0.36,
            maxLife: 0.36,
            shape: 'circle',
          });
        }
      } else if (kind === 'jump') {
        this.spawnStyledBurst(cx, by, 6, '#fde047', 95, 'circle');
        this.spawnStyledBurst(cx, by, 4, '#ffffff', 75, 'spark');
      }
    }
  }

  private tryAbyssalTeleport() {
    const p = this.player;
    if (this.characterId !== 'abyssal' || p.abyssalTeleportCooldown > 0 || p.state === 'DEAD') return;

    // Find nearest living enemy or active boss
    const pCx = p.x + p.w / 2;
    const pCy = p.y + p.h / 2;
    let bestTarget: { x: number; y: number; w: number; h: number; facing: 1 | -1; isBoss: boolean } | null = null;
    let bestDist = 720;

    for (const e of this.enemiesByRoom[this.roomId]) {
      if (e.state === 'DEAD') continue;
      const d = Math.hypot(e.x + e.w / 2 - pCx, e.y + e.h / 2 - pCy);
      if (d < bestDist) {
        bestDist = d;
        bestTarget = { x: e.x, y: e.y, w: e.w, h: e.h, facing: e.facing, isBoss: false };
      }
    }

    for (const st of this.bossStructures) {
      const d = Math.hypot(st.x + st.w / 2 - pCx, st.y + st.h / 2 - pCy);
      if (d < bestDist) {
        bestDist = d;
        bestTarget = { x: st.x, y: st.y, w: st.w, h: st.h, facing: pCx <= st.x + st.w / 2 ? 1 : -1, isBoss: false };
      }
    }

    if (
      this.room.bossId &&
      this.boss.active &&
      !this.boss.defeated &&
      this.boss.state !== 'INTRO' &&
      !this.isBossInOrbSequence()
    ) {
      const d = Math.hypot(this.boss.x + this.boss.w / 2 - pCx, this.boss.y + this.boss.h / 2 - pCy);
      if (d < 950 && d < bestDist + 200) {
        bestTarget = {
          x: this.boss.x,
          y: this.boss.y,
          w: this.boss.w,
          h: this.boss.h,
          facing: this.boss.facing,
          isBoss: true,
        };
      }
    }

    if (!bestTarget) {
      this.addFloatingText(pCx, p.y - 14, 'Sem alvo próximo', '#94a3b8');
      soundEngine.playParryFail();
      return;
    }

    // Departure dark smoke + crimson chains
    this.spawnStyledBurst(pCx, pCy, 14, '#18181b', 160, 'smoke');
    this.spawnStyledBurst(pCx, pCy, 10, '#dc2626', 210, 'spark');

    // Compute position directly behind the target
    let destX = bestTarget.x - bestTarget.facing * (p.w + 18);
    if (destX < 56 || destX + p.w > this.room.width - 56) {
      destX = bestTarget.x + bestTarget.w + 18;
    }
    destX = clamp(destX, 56, this.room.width - 56 - p.w);
    const destY = clamp(bestTarget.y + bestTarget.h - p.h, 52, 800 - p.h);

    p.x = destX;
    p.y = destY;
    p.vx = 0;
    p.vy = 0;
    p.facing = bestTarget.x + bestTarget.w / 2 >= p.x + p.w / 2 ? 1 : -1;
    p.invulnTimer = 0.25;
    p.abyssalTeleportCooldown = 15.0;
    p.abyssalEmpoweredTimer = 3.2;
    p.state = 'IDLE';

    soundEngine.playDash(true);
    this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 14, '#18181b', 170, 'smoke');
    this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 12, '#ef4444', 220, 'spark');
    this.addFloatingText(p.x + p.w / 2, p.y - 18, 'PASSO SOMBRIO', '#f87171');
  }

  private updatePlayer(dt: number, input: InputState) {
    const p = this.player;
    const s = this.config.stats;
    p.animTime += dt;

    if (p.dashCooldownTimer > 0) p.dashCooldownTimer = Math.max(0, p.dashCooldownTimer - dt);
    if (p.dashInvulnTimer > 0) p.dashInvulnTimer = Math.max(0, p.dashInvulnTimer - dt);
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.parryCooldownTimer > 0) p.parryCooldownTimer = Math.max(0, p.parryCooldownTimer - dt);
    if (p.parrySuccessFlash > 0) p.parrySuccessFlash = Math.max(0, p.parrySuccessFlash - dt);
    if (p.parryFailFlash > 0) p.parryFailFlash = Math.max(0, p.parryFailFlash - dt);
    if (p.abyssalTeleportCooldown > 0) p.abyssalTeleportCooldown = Math.max(0, p.abyssalTeleportCooldown - dt);
    if (p.abyssalEmpoweredTimer > 0) p.abyssalEmpoweredTimer = Math.max(0, p.abyssalEmpoweredTimer - dt);
    if (p.celestialReviveFlash > 0) p.celestialReviveFlash = Math.max(0, p.celestialReviveFlash - dt);
    if (p.wingFlapTimer > 0) p.wingFlapTimer = Math.max(0, p.wingFlapTimer - dt);
    if (p.revolverPoseTimer > 0) p.revolverPoseTimer = Math.max(0, p.revolverPoseTimer - dt);
    if (p.recentDamageTimer > 0) {
      p.recentDamageTimer = Math.max(0, p.recentDamageTimer - dt);
      if (p.recentDamageTimer === 0) p.recentDamageTaken = 0;
    }
    if (p.comboDecayTimer > 0) {
      p.comboDecayTimer = Math.max(0, p.comboDecayTimer - dt);
      if (p.comboDecayTimer === 0) p.comboCount = 0;
    }

    if (p.comboResetTimer > 0) {
      p.comboResetTimer = Math.max(0, p.comboResetTimer - dt);
      if (p.comboResetTimer === 0 && p.state !== 'ATTACKING') {
        p.comboStage = 0;
      }
    }

    for (let i = p.afterimages.length - 1; i >= 0; i--) {
      p.afterimages[i].alpha -= dt * 3.8;
      if (p.afterimages[i].alpha <= 0) p.afterimages.splice(i, 1);
    }

    if (p.state === 'DEAD') {
      p.vy = Math.min(s.maxFallSpeed, p.vy + s.gravity * dt);
      this.moveAndCollidePlayer(dt);
      this.updateCharacterAttachments(dt);
      return;
    }

    if (input.abilityJustPressed) {
      this.tryAbyssalTeleport();
    }

    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    // Manual Revolver Trigger for The Abyssal ([I] or [R])
    if (input.revolverJustPressed && this.characterId === 'abyssal' && p.revolverState === 'NONE') {
      if (p.rage >= p.maxRage) {
        p.rage = 0;
        p.revolverState = 'DRAW';
        p.revolverTimer = 0.14;
        p.revolverPoseTimer = 0.54;
        p.invulnTimer = Math.max(p.invulnTimer, 0.38);
        p.attackTimer = 0;
        p.queuedAttack = false;
        p.healTimer = 0;
        if (moveDir !== 0) p.facing = moveDir > 0 ? 1 : -1;
        this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h * 0.45, 12, '#ef4444', 190, 'spark');
      } else {
        this.addFloatingText(p.x + p.w / 2, p.y - 16, 'Ira Insuficiente', '#94a3b8');
        soundEngine.playParryFail();
      }
    }

    // Ultimate Activation ([O] or [Q])
    if (input.ultimateJustPressed) {
      this.tryActivateUltimate(moveDir);
    }

    if (p.grounded) {
      p.coyoteTimer = s.coyoteTime;
      p.canAirDash = true;
      p.canDoubleJump = true;
    } else if (p.coyoteTimer > 0) {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    if (input.jumpJustPressed) {
      p.jumpBufferTimer = s.jumpBufferTime;
    } else if (p.jumpBufferTimer > 0) {
      p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
    }

    // Abyssal Rage Revolver Draw & Shot Sequence
    if (p.revolverState === 'DRAW') {
      p.revolverTimer -= dt;
      if (moveDir !== 0) p.facing = moveDir > 0 ? 1 : -1;
      p.vx = this.approach(p.vx, 0, s.deceleration * dt);
      p.vy = Math.min(s.maxFallSpeed, p.vy + s.gravity * dt);
      this.moveAndCollidePlayer(dt);
      if (p.revolverTimer <= 0) {
        p.revolverState = 'NONE';
        const muzzleX = p.x + p.w / 2 + p.facing * 28;
        const muzzleY = p.y + p.h * 0.42;
        this.projectiles.push({
          id: this.uid('rbullet'),
          x: muzzleX,
          y: muzzleY,
          vx: p.facing * 1280,
          vy: 0,
          radius: 6,
          w: 32,
          h: 10,
          damage: 115,
          parrable: false,
          fromBoss: false,
          fromPlayer: true,
          color: '#ef4444',
          life: 1.5,
          kind: 'revolver_bullet',
        });
        p.vx = -p.facing * 240;
        this.shakeTimer = 0.28;
        this.shakeIntensity = 8;
        this.triggerScreenPulse('#ef4444', 0.25);
        soundEngine.playGunshot();
        this.spawnStyledBurst(muzzleX, muzzleY, 14, '#fef08a', 260, 'spark');
        this.spawnStyledBurst(muzzleX, muzzleY, 10, '#ef4444', 200, 'spark');
        this.spawnStyledBurst(muzzleX, muzzleY, 8, '#27272a', 110, 'smoke');
        this.addFloatingText(p.x + p.w / 2, p.y - 24, 'DISPARO ABISSAL!', '#fde047', true);
      }
      this.updateCharacterAttachments(dt);
      return;
    }

    if (p.state === 'HURT') {
      p.hurtTimer -= dt;
      p.vy = Math.min(s.maxFallSpeed, p.vy + s.gravity * dt);
      p.vx *= Math.pow(0.05, dt);
      this.moveAndCollidePlayer(dt);
      if (p.hurtTimer <= 0) {
        p.state = p.grounded ? 'IDLE' : 'FALLING';
      }
      this.updateCharacterAttachments(dt);
      return;
    }

    if (
      input.dashJustPressed &&
      p.dashCooldownTimer <= 0 &&
      p.state !== 'DASHING' &&
      (p.grounded || p.canAirDash)
    ) {
      let dx = moveDir;
      let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (dx === 0 && dy === 0) {
        dx = p.facing;
      }
      const len = Math.hypot(dx, dy) || 1;
      p.dashDirX = dx / len;
      p.dashDirY = dy / len;
      if (dx !== 0) p.facing = dx > 0 ? 1 : -1;
      if (!p.grounded) p.canAirDash = false;
      p.state = 'DASHING';
      p.dashTimer = s.dashDuration;
      p.dashInvulnTimer = s.dashInvulnDuration;
      p.dashCooldownTimer = s.dashCooldown;
      p.attackTimer = 0;
      p.healTimer = 0;
      p.parryTimer = 0;
      p.vx = p.dashDirX * s.dashSpeed;
      p.vy = p.dashDirY * s.dashSpeed;
      soundEngine.playDash(this.characterId === 'abyssal');
      this.spawnCharacterMovementVFX('dash');
    }

    if (p.state === 'DASHING') {
      p.dashTimer -= dt;
      p.vx = p.dashDirX * s.dashSpeed;
      p.vy = p.dashDirY * s.dashSpeed;

      if (Math.random() < 0.85) {
        p.afterimages.push({
          x: p.x,
          y: p.y,
          facing: p.facing,
          alpha: 0.65,
          state: 'DASHING',
        });
      }
      if (Math.random() < 0.65) {
        this.spawnCharacterMovementVFX('dash');
      }

      const steps = 4;
      const subDt = dt / steps;
      for (let i = 0; i < steps; i++) {
        this.moveAndCollidePlayer(subDt);
      }

      if (p.dashTimer <= 0) {
        p.vx *= 0.45;
        p.vy *= 0.35;
        p.state = p.grounded ? (moveDir !== 0 ? 'RUNNING' : 'IDLE') : 'FALLING';
      }
      this.updateCharacterAttachments(dt);
      return;
    }

    if (
      input.parryJustPressed &&
      p.parryCooldownTimer <= 0 &&
      p.state !== 'PARRYING' &&
      p.state !== 'HEALING'
    ) {
      if (moveDir !== 0) {
        p.facing = moveDir > 0 ? 1 : -1;
      }
      p.state = 'PARRYING';
      p.parryTimer = s.parryWindow;
      p.parryCooldownTimer = s.parryCooldown;
      p.attackTimer = 0;
      p.queuedAttack = false;
      p.vx *= 0.35;
    }

    if (p.state === 'PARRYING') {
      p.parryTimer -= dt;
      p.vx = this.approach(p.vx, 0, s.deceleration * dt);
      p.vy = Math.min(s.maxFallSpeed, p.vy + s.gravity * dt);
      this.moveAndCollidePlayer(dt);
      if (p.parryTimer <= 0) {
        if (p.parrySuccessFlash <= 0) {
          p.parryFailFlash = 0.16;
          soundEngine.playParryFail();
        }
        p.state = p.grounded ? 'IDLE' : 'FALLING';
      }
      this.updateCharacterAttachments(dt);
      return;
    }

    if (
      input.healJustPressed &&
      p.grounded &&
      p.state !== 'HEALING' &&
      p.state !== 'ATTACKING' &&
      p.essence >= s.healCost &&
      p.health < p.maxHealth
    ) {
      p.state = 'HEALING';
      p.healTimer = s.healDuration;
      p.vx = 0;
    }

    if (p.state === 'HEALING') {
      p.healTimer -= dt;
      p.vx = 0;
      p.vy = Math.min(s.maxFallSpeed, p.vy + s.gravity * dt);
      this.moveAndCollidePlayer(dt);

      if (Math.random() < 0.55) {
        this.particles.push({
          x: p.x + Math.random() * p.w,
          y: p.y + p.h - 4,
          vx: (Math.random() - 0.5) * 35,
          vy: -75 - Math.random() * 65,
          size: 3.5,
          color: this.characterId === 'celestial' ? (Math.random() < 0.5 ? '#fde047' : '#ffffff') : '#ef4444',
          alpha: 0.9,
          life: 0.45,
          maxLife: 0.45,
          shape: 'circle',
        });
      }

      if (p.healTimer <= 0) {
        p.essence = Math.max(0, p.essence - s.healCost);
        const healed = Math.min(s.healAmount, p.maxHealth - p.health);
        p.health += healed;
        soundEngine.playHeal();
        this.addFloatingText(p.x + p.w / 2, p.y - 12, `+${healed} HP`, '#4ade80', true);
        if (this.characterId === 'celestial') {
          this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 14, '#fde047', 160, 'circle');
          this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 10, '#ffffff', 120, 'spark');
        } else {
          this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 12, '#dc2626', 160, 'circle');
          this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 8, '#18181b', 110, 'smoke');
        }
        p.state = 'IDLE';
      }
      this.updateCharacterAttachments(dt);
      return;
    }

    if (input.attackJustPressed) {
      if (p.state === 'ATTACKING') {
        if (p.attackTimer < p.attackTotalTime * 0.65 && p.comboStage < 2) {
          p.queuedAttack = true;
        }
      } else {
        this.startAttack(moveDir);
      }
    }

    if (moveDir !== 0 && p.state !== 'ATTACKING') {
      p.facing = moveDir > 0 ? 1 : -1;
    }

    const controlScale = p.state === 'ATTACKING' ? 0.55 : 1.0;
    const targetSpeed = moveDir * s.maxSpeed * controlScale;
    const accel = p.grounded ? s.acceleration : s.airAcceleration;
    if (moveDir !== 0) {
      p.vx = this.approach(p.vx, targetSpeed, accel * dt);
    } else {
      const decel = p.grounded ? s.deceleration : s.airAcceleration * 0.65;
      p.vx = this.approach(p.vx, 0, decel * dt);
    }

    if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0 && p.state !== 'ATTACKING') {
      p.vy = s.jumpVelocity;
      p.grounded = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.state = 'JUMPING';
      soundEngine.playJump();
      this.spawnCharacterMovementVFX('jump');
    } else if (
      p.jumpBufferTimer > 0 &&
      !p.grounded &&
      p.coyoteTimer <= 0 &&
      this.characterId === 'celestial' &&
      p.canDoubleJump &&
      p.state !== 'ATTACKING'
    ) {
      p.vy = s.jumpVelocity * 0.94;
      p.canDoubleJump = false;
      p.jumpBufferTimer = 0;
      p.wingFlapTimer = 0.68;
      p.state = 'JUMPING';
      soundEngine.playDoubleJump();
      this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h * 0.52, 12, '#ffffff', 165, 'spark');
      this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h * 0.52, 10, '#fde047', 135, 'circle');
      this.addFloatingText(p.x + p.w / 2, p.y - 14, 'ASAS CELESTIAIS', '#fef08a');
    }

    if (input.jumpJustReleased && p.vy < 0) {
      p.vy *= s.jumpCutMultiplier;
    }

    const gravMult = p.vy > 0 ? s.fallGravityMultiplier : 1.0;
    p.vy = Math.min(s.maxFallSpeed, p.vy + s.gravity * gravMult * dt);

    this.moveAndCollidePlayer(dt);

    if (p.state === 'ATTACKING') {
      const stageCfg = s.combo[p.comboStage];
      const elapsed = p.attackTotalTime - p.attackTimer;
      p.attackTimer -= dt;

      if (elapsed >= stageCfg.windup && elapsed <= stageCfg.windup + stageCfg.active) {
        this.processPlayerAttackHitbox(stageCfg);
      }

      if (p.attackTimer <= 0) {
        if (p.queuedAttack && p.comboStage < 2) {
          p.comboStage = (p.comboStage + 1) as 0 | 1 | 2;
          p.queuedAttack = false;
          this.beginComboSwing(moveDir);
        } else {
          p.comboResetTimer = 0.42;
          p.queuedAttack = false;
          p.state = p.grounded ? (moveDir !== 0 ? 'RUNNING' : 'IDLE') : p.vy < 0 ? 'JUMPING' : 'FALLING';
        }
      }
    } else {
      if (p.grounded) {
        p.state = Math.abs(p.vx) > 12 ? 'RUNNING' : 'IDLE';
        if (p.state === 'RUNNING') this.spawnCharacterMovementVFX('run');
      } else {
        p.state = p.vy < 0 ? 'JUMPING' : 'FALLING';
      }
    }

    this.updateCharacterAttachments(dt);
  }

  private startAttack(moveDir: number) {
    const p = this.player;
    if (p.comboResetTimer <= 0) {
      p.comboStage = 0;
    }
    this.beginComboSwing(moveDir);
  }

  private beginComboSwing(moveDir: number) {
    const p = this.player;
    const s = this.config.stats;
    if (moveDir !== 0) p.facing = moveDir > 0 ? 1 : -1;
    const stageCfg = s.combo[p.comboStage];
    p.state = 'ATTACKING';
    p.attackTotalTime = stageCfg.windup + stageCfg.active + stageCfg.recovery;
    p.attackTimer = p.attackTotalTime;
    p.attackHitIds.clear();
    p.comboResetTimer = 0.55;

    if (p.grounded) {
      p.vx = p.facing * (this.characterId === 'abyssal' ? 115 : 85);
    }

    soundEngine.playAttack(p.comboStage, this.characterId === 'abyssal');

    const slashX = p.x + p.w / 2 + p.facing * (stageCfg.range * 0.48);
    const slashY = p.y + p.h * 0.48;
    this.slashes.push({
      x: slashX,
      y: slashY,
      facing: p.facing,
      radius: stageCfg.range * 0.62,
      angleStart: p.comboStage === 1 ? 0.9 : -0.95,
      angleEnd: p.comboStage === 1 ? -0.95 : 0.9,
      color: this.config.palette.accent,
      glow: this.config.palette.glow,
      life: 0.2,
      maxLife: 0.2,
      kind: this.characterId === 'abyssal' ? 'chain' : 'celestial',
    });
  }

  private registerComboHit() {
    const p = this.player;
    p.comboCount += 1;
    p.comboDecayTimer = 5.5;
    const gain = 11 + Math.min(8, p.comboCount);
    const prevFull = p.ultimateCharge >= p.maxUltimateCharge;
    p.ultimateCharge = Math.min(p.maxUltimateCharge, p.ultimateCharge + gain);
    if (!prevFull && p.ultimateCharge >= p.maxUltimateCharge) {
      this.addFloatingText(
        p.x + p.w / 2,
        p.y - 34,
        this.characterId === 'abyssal' ? 'ULTIMATE PRONTA · CÉRBERO [O]!' : 'ULTIMATE PRONTA · BÍBLIA [O]!',
        '#fde047',
        true
      );
    }
  }

  private tryActivateUltimate(moveDir: number) {
    const p = this.player;
    if (p.state === 'DEAD') return;
    if (p.ultimateCharge < p.maxUltimateCharge) {
      this.addFloatingText(p.x + p.w / 2, p.y - 16, 'Ultimate Carregando', '#94a3b8');
      soundEngine.playParryFail();
      return;
    }

    p.ultimateCharge = 0;
    p.invulnTimer = Math.max(p.invulnTimer, 0.9);
    if (moveDir !== 0) p.facing = moveDir > 0 ? 1 : -1;

    const pCx = p.x + p.w / 2;
    const pCy = p.y + p.h / 2;

    if (this.characterId === 'abyssal') {
      // Find nearest living target (enemy, boss structure, or active boss)
      let targetX = clamp(pCx + p.facing * 260, 90, this.room.width - 90);
      let targetY = p.y + p.h;
      let bestDist = 950;

      for (const e of this.enemiesByRoom[this.roomId]) {
        if (e.state === 'DEAD') continue;
        const d = Math.hypot(e.x + e.w / 2 - pCx, e.y + e.h / 2 - pCy);
        if (d < bestDist) {
          bestDist = d;
          targetX = e.x + e.w / 2;
          targetY = e.y + e.h;
        }
      }
      for (const st of this.bossStructures) {
        const d = Math.hypot(st.x + st.w / 2 - pCx, st.y + st.h / 2 - pCy);
        if (d < bestDist) {
          bestDist = d;
          targetX = st.x + st.w / 2;
          targetY = st.y + st.h;
        }
      }
      if (
        this.room.bossId &&
        this.boss.active &&
        !this.boss.defeated &&
        this.boss.state !== 'INTRO' &&
        !this.isBossInOrbSequence()
      ) {
        const d = Math.hypot(this.boss.x + this.boss.w / 2 - pCx, this.boss.y + this.boss.h / 2 - pCy);
        if (d < bestDist + 220) {
          targetX = this.boss.x + this.boss.w / 2;
          targetY = this.boss.y + this.boss.h;
        }
      }

      const dir: 1 | -1 = targetX >= pCx ? 1 : -1;
      p.facing = dir;
      this.cerberus = {
        active: true,
        x: clamp(pCx - dir * 55, 70, this.room.width - 70),
        y: p.y + p.h,
        vx: 0,
        vy: 0,
        facing: dir,
        state: 'EMERGE',
        timer: 0.22,
        targetX,
        targetY,
        hasBitten: false,
        animTime: 0,
      };
      soundEngine.playCerberusUltimate();
      this.shakeTimer = 0.35;
      this.shakeIntensity = 7;
      this.triggerScreenPulse('#dc2626', 0.35);
      this.spawnStyledBurst(this.cerberus.x, this.cerberus.y - 28, 22, '#ef4444', 240, 'spark');
      this.spawnStyledBurst(this.cerberus.x, this.cerberus.y - 28, 16, '#18181b', 150, 'smoke');
      this.addFloatingText(pCx, p.y - 28, 'INVOCAR CÉRBERO!', '#ef4444', true);
    } else {
      // THE CELESTIAL ULTIMATE: Giant Sacred Bible crushes adversaries across the floor!
      const floorY = this.room.theme === 'boss' || this.room.theme === 'ember' ? 800 : 780;
      const slamX = clamp(pCx + p.facing * 130, 320, this.room.width - 320);
      this.giantBible = {
        active: true,
        x: slamX,
        y: 165,
        w: 560,
        h: 112,
        startY: 165,
        floorY,
        state: 'APPEAR',
        timer: 0.38,
        hasSlammed: false,
        animTime: 0,
      };
      soundEngine.playBibleUltimate();
      this.triggerScreenPulse('#fde047', 0.4);
      this.spawnStyledBurst(slamX, 220, 24, '#fde047', 240, 'circle');
      this.addFloatingText(pCx, p.y - 28, 'JULGAMENTO DA ESCRITURA!', '#fde047', true);
    }
  }

  private updateUltimates(dt: number) {
    if (this.cerberus) {
      const c = this.cerberus;
      c.animTime += dt;
      c.timer -= dt;

      if (Math.random() < 0.75) {
        this.particles.push({
          x: c.x + (Math.random() - 0.5) * 60,
          y: c.y - 24 + (Math.random() - 0.5) * 32,
          vx: (Math.random() - 0.5) * 60,
          vy: -60 - Math.random() * 80,
          size: 4,
          color: Math.random() < 0.5 ? '#ef4444' : '#f97316',
          alpha: 0.88,
          life: 0.35,
          maxLife: 0.35,
          shape: 'circle',
        });
      }

      if (c.state === 'EMERGE' && c.timer <= 0) {
        c.state = 'LUNGE';
        c.timer = 0.24;
      } else if (c.state === 'LUNGE') {
        c.x += (c.targetX - c.x) * Math.min(1, dt * 15);
        c.y += (c.targetY - c.y) * Math.min(1, dt * 15);
        if (c.timer <= 0) {
          c.x = c.targetX;
          c.y = c.targetY;
          c.state = 'BITE';
          c.timer = 0.34;
        }
      } else if (c.state === 'BITE') {
        if (!c.hasBitten) {
          c.hasBitten = true;
          this.hitstopTimer = 0.08;
          this.shakeTimer = 0.42;
          this.shakeIntensity = 11;
          this.triggerScreenPulse('#ef4444', 0.35);
          soundEngine.playBossImpact();
          this.spawnStyledBurst(c.x, c.y - 38, 34, '#ef4444', 320, 'spark');
          this.spawnStyledBurst(c.x, c.y - 38, 22, '#f97316', 240, 'circle');
          this.slashes.push({
            x: c.x,
            y: c.y - 36,
            facing: c.facing,
            radius: 105,
            angleStart: 0,
            angleEnd: Math.PI * 2,
            color: '#ef4444',
            glow: '#fde047',
            life: 0.32,
            maxLife: 0.32,
            kind: 'parry',
          });

          const biteBox: Rect = { x: c.x - 135, y: c.y - 165, w: 270, h: 180 };
          // Massive Boss-Phase damage (380) + Hellfire Burn DoT (6s, 28 dps)!
          for (const e of this.enemiesByRoom[this.roomId]) {
            if (e.state !== 'DEAD' && rectsOverlap(biteBox, e)) {
              this.damageEnemy(e, 380, c.facing * 260, -140, false);
              if (e.health > 0) {
                e.burnTimer = 6.0;
                e.burnTickTimer = 0.4;
                e.burnDps = 28;
                this.addFloatingText(e.x + e.w / 2, e.y - 34, 'EM CHAMAS!', '#fb923c');
              }
            }
          }
          for (let si = this.bossStructures.length - 1; si >= 0; si--) {
            if (rectsOverlap(biteBox, this.bossStructures[si])) {
              this.damageBossStructure(this.bossStructures[si], 380);
            }
          }
          if (
            this.room.bossId &&
            this.boss.active &&
            !this.boss.defeated &&
            this.boss.state !== 'INTRO' &&
            this.boss.state !== 'PHASE_TRANSITION' &&
            !this.isBossInOrbSequence() &&
            rectsOverlap(biteBox, this.boss)
          ) {
            this.damageBoss(380);
            if (!this.boss.defeated) {
              this.boss.burnTimer = 6.0;
              this.boss.burnTickTimer = 0.4;
              this.boss.burnDps = 28;
              this.addFloatingText(this.boss.x + this.boss.w / 2, this.boss.y - 42, 'CHAMA INFERNAL!', '#fb923c', true);
            }
          }
        }
        if (c.timer <= 0) {
          c.state = 'VANISH';
          c.timer = 0.28;
        }
      } else if (c.state === 'VANISH' && c.timer <= 0) {
        this.cerberus = null;
      }
    }

    if (this.giantBible) {
      const gb = this.giantBible;
      gb.animTime += dt;
      gb.timer -= dt;

      if (gb.state === 'APPEAR') {
        if (gb.timer <= 0) {
          gb.state = 'SLAM';
          gb.timer = 0.22;
        }
      } else if (gb.state === 'SLAM') {
        gb.y = Math.min(gb.floorY - gb.h, gb.y + 3400 * dt);
        if (gb.y >= gb.floorY - gb.h || gb.timer <= 0) {
          gb.y = gb.floorY - gb.h;
          if (!gb.hasSlammed) {
            gb.hasSlammed = true;
            this.hitstopTimer = 0.06;
            this.shakeTimer = 0.45;
            this.shakeIntensity = 12;
            this.triggerScreenPulse('#fde047', 0.45);
            soundEngine.playBossImpact();
            this.spawnStyledBurst(gb.x, gb.floorY - 12, 40, '#fde047', 380, 'spark');
            this.spawnStyledBurst(gb.x, gb.floorY - 12, 28, '#ffffff', 300, 'circle');
            this.slashes.push({
              x: gb.x,
              y: gb.floorY - 8,
              facing: 1,
              radius: 360,
              angleStart: Math.PI,
              angleEnd: Math.PI * 2,
              color: '#fde047',
              glow: '#ffffff',
              life: 0.36,
              maxLife: 0.36,
              kind: 'shockwave',
            });

            // Wide floor crush zone with intentionally modest damage (65): clears low-HP minion swarms!
            const crushBox: Rect = {
              x: gb.x - gb.w * 0.68,
              y: gb.floorY - 260,
              w: gb.w * 1.36,
              h: 280,
            };
            for (const e of this.enemiesByRoom[this.roomId]) {
              if (e.state !== 'DEAD' && rectsOverlap(crushBox, e)) {
                this.damageEnemy(e, 65, (e.x + e.w / 2 >= gb.x ? 1 : -1) * 180, -140, false);
              }
            }
            for (let si = this.bossStructures.length - 1; si >= 0; si--) {
              if (rectsOverlap(crushBox, this.bossStructures[si])) {
                this.damageBossStructure(this.bossStructures[si], 65);
              }
            }
            if (
              this.room.bossId &&
              this.boss.active &&
              !this.boss.defeated &&
              this.boss.state !== 'INTRO' &&
              this.boss.state !== 'PHASE_TRANSITION' &&
              !this.isBossInOrbSequence() &&
              rectsOverlap(crushBox, this.boss)
            ) {
              this.damageBoss(65);
            }
          }
          gb.state = 'LINGER';
          gb.timer = 0.65;
        }
      } else if (gb.state === 'LINGER' && gb.timer <= 0) {
        this.giantBible = null;
      }
    }
  }

  private processPlayerAttackHitbox(stageCfg: CharacterConfig['stats']['combo'][0]) {
    const hitbox = this.getPlayerAttackHitbox(stageCfg);
    const p = this.player;

    const enemies = this.enemiesByRoom[this.roomId];
    for (const enemy of enemies) {
      if (enemy.state === 'DEAD' || p.attackHitIds.has(enemy.id)) continue;
      if (rectsOverlap(hitbox, enemy)) {
        p.attackHitIds.add(enemy.id);
        const empowered = this.characterId === 'abyssal' && p.abyssalEmpoweredTimer > 0;
        const dmg = enemy.state === 'STAGGERED' ? Math.round(stageCfg.damage * 1.4) : stageCfg.damage;
        this.damageEnemy(enemy, dmg, p.facing * stageCfg.knockbackX, stageCfg.knockbackY, empowered);
        if (empowered) {
          p.abyssalEmpoweredTimer = 0;
        }
        p.essence = Math.min(p.maxEssence, p.essence + stageCfg.essenceGain);
        this.registerComboHit();
        this.hitstopTimer = this.characterId === 'abyssal' ? 0.045 : 0.03;
      }
    }

    for (let si = this.bossStructures.length - 1; si >= 0; si--) {
      const st = this.bossStructures[si];
      if (p.attackHitIds.has(st.id)) continue;
      if (rectsOverlap(hitbox, st)) {
        p.attackHitIds.add(st.id);
        this.damageBossStructure(st, stageCfg.damage);
        p.essence = Math.min(p.maxEssence, p.essence + stageCfg.essenceGain);
        this.registerComboHit();
        this.hitstopTimer = 0.03;
      }
    }

    if (
      this.room.bossId &&
      this.boss.active &&
      !this.boss.defeated &&
      this.boss.state !== 'INTRO' &&
      this.boss.state !== 'PHASE_TRANSITION' &&
      !this.isBossInOrbSequence()
    ) {
      if (!p.attackHitIds.has('boss') && rectsOverlap(hitbox, this.boss)) {
        p.attackHitIds.add('boss');
        if (this.characterId === 'abyssal' && p.abyssalEmpoweredTimer > 0) {
          // Consumes buff on boss hit, but NEVER stuns the boss!
          p.abyssalEmpoweredTimer = 0;
        }
        const dmg = this.boss.state === 'STAGGERED' ? Math.round(stageCfg.damage * 1.35) : stageCfg.damage;
        this.damageBoss(dmg);
        p.essence = Math.min(p.maxEssence, p.essence + stageCfg.essenceGain);
        this.registerComboHit();
        this.hitstopTimer = 0.035;
      }
    }
  }

  public getPlayerAttackHitbox(stageCfg?: CharacterConfig['stats']['combo'][0]): Rect {
    const p = this.player;
    const cfg = stageCfg ?? this.config.stats.combo[p.comboStage];
    const x = p.facing === 1 ? p.x + p.w * 0.5 : p.x + p.w * 0.5 - cfg.range;
    const y = p.y + (p.h - cfg.height) * 0.45;
    return { x, y, w: cfg.range, h: cfg.height };
  }

  private damageBossStructure(st: BossStructure, amount: number) {
    st.health = Math.max(0, st.health - amount);
    st.hitFlash = 0.16;
    soundEngine.playHit(amount >= 35);
    this.addFloatingText(st.x + st.w / 2, st.y - 10, `-${amount}`, '#fde047');
    this.spawnStyledBurst(st.x + st.w / 2, st.y + st.h / 2, 10, '#fb923c', 180, 'spark');

    if (st.health <= 0) {
      const idx = this.bossStructures.findIndex((item) => item.id === st.id);
      if (idx >= 0) this.bossStructures.splice(idx, 1);
      soundEngine.playBossImpact();
      this.shakeTimer = 0.25;
      this.shakeIntensity = 7;
      this.spawnStyledBurst(st.x + st.w / 2, st.y + st.h / 2, 22, '#fb923c', 260, 'spark');
      this.spawnStyledBurst(st.x + st.w / 2, st.y + st.h / 2, 14, '#fde047', 190, 'circle');
      this.addFloatingText(st.x + st.w / 2, st.y - 24, 'ESTRUTURA QUEBRADA!', '#fde047', true);

      if (this.bossStructures.length === 0 && this.boss.state === 'ORB_CHARGE') {
        this.resolveIgnisStructuresBroken();
      }
    }
  }

  private damageEnemy(
    enemy: EnemyEntity,
    amount: number,
    kbX: number,
    kbY: number,
    stunFromTeleport = false,
    isDot = false
  ) {
    enemy.health = Math.max(0, enemy.health - amount);
    enemy.hitFlash = isDot ? 0.08 : 0.16;
    if (!isDot) {
      enemy.vx = kbX;
      enemy.vy = kbY;
      soundEngine.playHit(amount >= 35);
      this.addFloatingText(enemy.x + enemy.w / 2, enemy.y - 10, `-${amount}`, '#fde047');

      // Character-specific hit VFX
      if (this.characterId === 'abyssal') {
        this.spawnStyledBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 7, '#e2e8f0', 220, 'spark');
        this.spawnStyledBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 6, '#dc2626', 170, 'circle');
        this.spawnStyledBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 4, '#18181b', 95, 'smoke');
      } else {
        this.spawnStyledBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 8, '#fde047', 190, 'circle');
        this.spawnStyledBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 6, '#ffffff', 220, 'spark');
      }
    } else {
      this.addFloatingText(enemy.x + enemy.w / 2, enemy.y - 10, `-${amount}`, '#fb923c');
      this.spawnStyledBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 4, '#f97316', 90, 'spark');
    }

    if (enemy.health <= 0) {
      enemy.state = 'DEAD';
      enemy.stateTimer = 0.45;
      this.spawnStyledBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 20, '#dc2626', 240, 'circle');
      this.addFloatingText(enemy.x + enemy.w / 2, enemy.y - 26, 'Purificado', '#c4b5fd');
    } else if (stunFromTeleport) {
      // Abyssal Teleport strike briefly stuns regular enemies
      enemy.state = 'STAGGERED';
      enemy.staggerTimer = 1.2;
      this.addFloatingText(enemy.x + enemy.w / 2, enemy.y - 26, 'ATORDOADO', '#f87171');
    } else if (!isDot && enemy.state !== 'STAGGERED') {
      enemy.state = 'HURT';
      enemy.stateTimer = 0.22;
    }
  }

  private isBossInOrbSequence(): boolean {
    const s = this.boss.state;
    return s === 'ORB_INTRO' || s === 'ORB_CHARGE' || s === 'ORB_FOCUS' || s === 'ORB_FALL';
  }

  private damageBoss(amount: number, isDot = false) {
    const b = this.boss;
    if (b.defeated || b.state === 'DEATH' || this.isBossInOrbSequence()) return;
    b.health = Math.max(0, b.health - amount);
    b.hitFlash = isDot ? 0.08 : 0.14;

    if (!isDot) {
      soundEngine.playHit(amount >= 35);
      this.addFloatingText(b.x + b.w / 2, b.y - 12, `-${amount}`, '#fbbf24');

      if (this.characterId === 'abyssal') {
        this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h * 0.45, 7, '#e2e8f0', 240, 'spark');
        this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h * 0.45, 7, '#ef4444', 190, 'circle');
        this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h * 0.45, 4, '#18181b', 90, 'smoke');
      } else {
        this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h * 0.45, 8, '#fde047', 210, 'circle');
        this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h * 0.45, 6, '#ffffff', 230, 'spark');
      }
    } else {
      this.addFloatingText(b.x + b.w / 2, b.y - 14, `-${amount}`, '#fb923c');
      this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h * 0.45, 5, '#f97316', 120, 'spark');
    }

    const hpPct = b.health / b.maxHealth;
    if (b.health <= 0) {
      b.state = 'DEATH';
      b.stateTimer = 2.2;
      b.vx = 0;
      b.vy = 0;
      b.defeated = true;
      this.projectiles = [];
      this.bossPortals = [];
      this.summonedSwords = [];
      this.swordRespawnQueue = [];
      this.bossStructures = [];
      this.ignisOrb = null;
      this.cameraFocusTarget = null;
      this.targetCameraZoom = 1;
      this.shakeTimer = 0.6;
      this.shakeIntensity = 10;
      this.triggerScreenPulse('#f59e0b', 0.55);
      soundEngine.playBossPhase();
      this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h / 2, 46, '#f59e0b', 340, 'circle');
      this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h / 2, 34, '#dc2626', 280, 'spark');
      this.player.essence = Math.min(this.player.maxEssence, this.player.essence + 50);
      this.victoryBossName = b.name;
      this.victoryBannerTimer = 6.5;
      return;
    }

    if (hpPct <= 0.65 && !b.phase2Triggered) {
      this.triggerBossPhase(2);
    } else if (hpPct <= 0.3 && !b.phase3Triggered) {
      this.triggerBossPhase(3);
    }
  }

  private triggerBossPhase(phase: 2 | 3) {
    const b = this.boss;
    const oldCx = b.x + b.w / 2;
    const oldCy = b.y + b.h / 2;
    const oldColor = phase === 2 ? '#f59e0b' : '#a855f7';

    this.spawnStyledBurst(oldCx, oldCy, 24, oldColor, 260, 'spark');
    this.slashes.push({
      x: oldCx,
      y: oldCy,
      facing: 1,
      radius: 80,
      angleStart: 0,
      angleEnd: Math.PI * 2,
      color: oldColor,
      glow: '#ffffff',
      life: 0.3,
      maxLife: 0.3,
      kind: 'parry',
    });

    const centerX = this.room.width / 2 - b.w / 2;
    b.phase = phase;
    if (phase === 2) b.phase2Triggered = true;
    if (phase === 3) b.phase3Triggered = true;
    b.vx = 0;
    b.vy = 0;
    b.currentAttack = null;
    this.projectiles = [];
    this.shakeTimer = 0.6;
    this.shakeIntensity = 9;
    this.triggerScreenPulse(phase === 3 ? '#ef4444' : '#a855f7', 0.45);
    soundEngine.playBossPhase();

    // Ignis Phase 3: Teleport to center IN THE AIR, zoom camera onto him, channel Cataclysm Orb to ceiling!
    if (b.id === 'ashen_sovereign' && phase === 3) {
      b.x = centerX;
      b.y = 295;
      b.grounded = false;
      b.facing = this.player.x + this.player.w / 2 >= centerX + b.w / 2 ? 1 : -1;
      b.state = 'ORB_INTRO';
      b.stateTimer = 2.6;
      this.summonedSwords = [];
      this.swordRespawnQueue = [];
      this.bossStructures = [];
      this.ignisOrb = {
        active: true,
        x: this.room.width / 2,
        y: 118,
        radius: 14,
        chargeTime: 15.0,
        maxChargeTime: 15.0,
        beamProgress: 0,
        phase: 'RISING',
      };
      this.targetCameraZoom = 1.48;
      this.cameraFocusTarget = { x: this.room.width / 2, y: b.y + b.h * 0.12 };

      const newCx = b.x + b.w / 2;
      const newCy = b.y + b.h / 2;
      this.spawnStyledBurst(newCx, newCy, 44, '#ef4444', 340, 'circle');
      this.addFloatingText(newCx, b.y - 36, 'FASE III · ORBE DO CATACLISMA!', '#ef4444', true);
      return;
    }

    // Teleport boss to the CENTER of the arena, IN THE AIR!
    const airY = 300;
    b.x = centerX;
    b.y = airY;
    b.grounded = false;
    b.facing = this.player.x + this.player.w / 2 >= centerX + b.w / 2 ? 1 : -1;
    b.state = 'PHASE_TRANSITION';

    const shouldOpenPhase3Portals = b.id === 'fallen_judgment' && phase === 3 && !b.phase3PortalsUsed;
    const shouldBeginIgnisSwords = b.id === 'ashen_sovereign' && phase === 2;
    b.stateTimer = shouldOpenPhase3Portals ? 4.4 : shouldBeginIgnisSwords ? 2.9 : 2.6;

    const newColor = phase === 2 ? '#a855f7' : '#ef4444';
    const newCx = b.x + b.w / 2;
    const newCy = b.y + b.h / 2;
    this.spawnStyledBurst(newCx, newCy, 44, newColor, 340, 'circle');
    this.slashes.push({
      x: newCx,
      y: newCy,
      facing: 1,
      radius: 150,
      angleStart: 0,
      angleEnd: Math.PI * 2,
      color: newColor,
      glow: '#ffffff',
      life: 0.45,
      maxLife: 0.45,
      kind: 'parry',
    });

    if (shouldOpenPhase3Portals) {
      b.phase3PortalsUsed = true;
      this.spawnFallenJudgmentPhase3Portals(newCx, newCy);
    }

    if (shouldBeginIgnisSwords) {
      this.ignisSwordsCooldown = 0;
      this.beginIgnisSwords();
    }

    const phaseLabel =
      b.id === 'ashen_sovereign'
        ? 'FASE II · CHAMA PROFANA'
        : phase === 2
        ? 'FASE II · GUARDIÃO CORROMPIDO'
        : 'FASE III · JULGAMENTO ABISSAL';

    this.addFloatingText(
      newCx,
      b.y - 34,
      phaseLabel,
      phase === 2 ? '#c084fc' : '#f87171',
      true
    );
  }

  private spawnFallenJudgmentPhase3Portals(bossCx: number, bossCy: number) {
    this.bossPortals = [
      {
        id: this.uid('portal_l'),
        x: bossCx - 175,
        y: bossCy - 72,
        w: 66,
        h: 146,
        side: 'left',
        life: 4.3,
        maxLife: 4.3,
        telegraphTime: 1.15,
        spawnAccum: 0,
        color: '#ef4444',
      },
      {
        id: this.uid('portal_r'),
        x: bossCx + 109,
        y: bossCy - 72,
        w: 66,
        h: 146,
        side: 'right',
        life: 4.3,
        maxLife: 4.3,
        telegraphTime: 1.15,
        spawnAccum: 0,
        color: '#a855f7',
      },
      {
        id: this.uid('portal_sky'),
        x: 90,
        y: 86,
        w: this.room.width - 180,
        h: 36,
        side: 'sky',
        life: 4.3,
        maxLife: 4.3,
        telegraphTime: 1.15,
        spawnAccum: 0,
        color: '#ef4444',
      },
    ];
    this.addFloatingText(
      bossCx,
      bossCy - 95,
      'PORTAIS ABERTOS · ABRIGUE-SE SOB AS PLATAFORMAS!',
      '#fde047',
      true
    );
  }

  private updateBossPortals(dt: number) {
    if (this.bossPortals.length === 0) return;

    for (let i = this.bossPortals.length - 1; i >= 0; i--) {
      const pt = this.bossPortals[i];
      pt.life -= dt;

      if (pt.telegraphTime > 0) {
        pt.telegraphTime = Math.max(0, pt.telegraphTime - dt);
        if (pt.side !== 'sky' && Math.random() < 0.6) {
          this.particles.push({
            x: pt.x + Math.random() * pt.w,
            y: pt.y + Math.random() * pt.h,
            vx: (Math.random() - 0.5) * 40,
            vy: -140 - Math.random() * 120,
            size: 3.5,
            color: pt.color,
            alpha: 0.9,
            life: 0.4,
            maxLife: 0.4,
            shape: 'spark',
          });
        }
      } else {
        // Active short-duration torrential portal rain
        if (pt.side === 'sky') {
          pt.spawnAccum += dt;
          while (pt.spawnAccum >= 0.085) {
            pt.spawnAccum -= 0.085;
            // Dense vertical rainfall lanes covering open floor; stone platforms block droplets cleanly!
            const lanes = 11;
            const span = this.room.width - 160;
            for (let k = 0; k < lanes; k++) {
              const rx = 80 + (span / (lanes - 1)) * k + (Math.random() - 0.5) * 145;
              this.projectiles.push({
                id: this.uid('prain'),
                x: clamp(rx, 68, this.room.width - 68),
                y: 82 + Math.random() * 24,
                vx: (Math.random() - 0.5) * 20,
                vy: 600 + Math.random() * 120,
                radius: 8,
                w: 14,
                h: 26,
                damage: 18,
                parrable: false,
                fromBoss: true,
                color: Math.random() < 0.6 ? '#ef4444' : '#c084fc',
                life: 2.2,
                kind: 'portal_rain',
              });
            }
          }
        } else if (Math.random() < 0.75) {
          // Flanking portals visibly vent energy upward to feed the rift rain
          this.particles.push({
            x: pt.x + pt.w / 2 + (Math.random() - 0.5) * 26,
            y: pt.y + Math.random() * pt.h,
            vx: (pt.side === 'left' ? -1 : 1) * (40 + Math.random() * 90),
            vy: -260 - Math.random() * 160,
            size: 4,
            color: pt.color,
            alpha: 0.9,
            life: 0.42,
            maxLife: 0.42,
            shape: 'spark',
          });
        }
      }

      if (pt.life <= 0) {
        if (pt.side !== 'sky') {
          this.spawnStyledBurst(pt.x + pt.w / 2, pt.y + pt.h / 2, 18, pt.color, 210, 'spark');
        }
        this.bossPortals.splice(i, 1);
      }
    }
  }

  private spawnIgnisPhase3Structures() {
    const stonePlats = this.room.platforms.filter((pl) => pl.kind === 'stone');
    this.bossStructures = stonePlats.slice(0, 4).map((plat, idx) => {
      const w = 48;
      const h = 76;
      const x = plat.x + plat.w / 2 - w / 2;
      const y = plat.y - h;
      this.spawnStyledBurst(x + w / 2, y + h / 2, 18, '#f97316', 210, 'spark');
      return {
        id: this.uid(`struct_${idx}`),
        x,
        y,
        w,
        h,
        health: 75,
        maxHealth: 75,
        hitFlash: 0,
        platformIndex: idx,
      };
    });
    this.addFloatingText(
      this.room.width / 2,
      250,
      'DESTRUA AS 4 ESTRUTURAS NAS PLATAFORMAS EM 15s!',
      '#fde047',
      true
    );
  }

  private resolveIgnisStructuresBroken() {
    const b = this.boss;
    const bCx = b.x + b.w / 2;
    this.ignisOrb = null;
    this.targetCameraZoom = 1;
    this.cameraFocusTarget = null;
    b.state = 'STAGGERED';
    b.staggerTimer = 5.0;
    b.vx = 0;
    b.vy = 280;
    b.grounded = false;
    b.currentAttack = null;

    soundEngine.playBossImpact();
    soundEngine.playParrySuccess();
    this.shakeTimer = 0.55;
    this.shakeIntensity = 11;
    this.triggerScreenPulse('#fde047', 0.45);
    this.spawnStyledBurst(this.room.width / 2, 140, 32, '#fde047', 300, 'spark');
    this.spawnStyledBurst(bCx, b.y + b.h * 0.5, 28, '#38bdf8', 260, 'circle');
    this.addFloatingText(bCx, b.y - 42, 'ORBE QUEBRADO · IGNIS ATORDOADO POR 5s!', '#38bdf8', true);
  }

  private updateBossStructures(dt: number) {
    for (const st of this.bossStructures) {
      if (st.hitFlash > 0) st.hitFlash = Math.max(0, st.hitFlash - dt);
      if (this.ignisOrb && Math.random() < 0.25) {
        const sx = st.x + st.w / 2;
        const sy = st.y + 10;
        const ang = Math.atan2(this.ignisOrb.y - sy, this.ignisOrb.x - sx);
        this.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(ang) * 260,
          vy: Math.sin(ang) * 260,
          size: 3,
          color: '#fb923c',
          alpha: 0.85,
          life: 0.45,
          maxLife: 0.45,
          shape: 'circle',
        });
      }
    }
  }

  private beginIgnisSwords() {
    this.summonedSwords = [];
    this.ignisSwordsCooldown = 6.0;
    // Queue 5 swords to summon sequentially, one by one, around Ignis
    this.swordRespawnQueue = [
      { slotIndex: 0, timer: 0.25 },
      { slotIndex: 1, timer: 0.62 },
      { slotIndex: 2, timer: 0.99 },
      { slotIndex: 3, timer: 1.36 },
      { slotIndex: 4, timer: 1.73 },
    ];
    this.addFloatingText(
      this.boss.x + this.boss.w / 2,
      this.boss.y - 68,
      'ESPADAS DAS CINZAS INVOCADAS!',
      '#fb923c',
      true
    );
  }

  private getIgnisSwordSlotPos(slotIndex: number): { x: number; y: number } {
    const b = this.boss;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h * 0.4;
    // Semi-circular crown arc of 5 slots around Ignis
    const arcAngles = [-2.45, -1.98, -Math.PI / 2, -1.16, -0.69];
    const ang = arcAngles[slotIndex % arcAngles.length];
    return {
      x: cx + Math.cos(ang) * 108,
      y: cy + Math.sin(ang) * 92,
    };
  }

  private queueSwordRespawn(slotIndex: number) {
    // Stagger respawn slightly if other slots are already queued so swords continue appearing one by one
    const maxQueued = this.swordRespawnQueue.reduce((mx, q) => Math.max(mx, q.timer), 0);
    const delay = Math.max(1.15, maxQueued + 0.32);
    this.swordRespawnQueue.push({ slotIndex, timer: delay });
  }

  private updateSummonedSwords(dt: number) {
    const b = this.boss;
    const isOrbSequence =
      b.state === 'ORB_INTRO' ||
      b.state === 'ORB_CHARGE' ||
      b.state === 'ORB_FOCUS' ||
      b.state === 'ORB_FALL';

    const activeIgnisSwords =
      this.room.bossId === 'ashen_sovereign' &&
      b.active &&
      !b.defeated &&
      b.phase >= 2 &&
      !isOrbSequence;

    if (!activeIgnisSwords) {
      this.summonedSwords = [];
      this.swordRespawnQueue = [];
      this.ignisSwordsCooldown = 0;
      return;
    }

    if (b.aiPaused || b.state === 'STAGGERED') return;

    // Phase 2 Cooldown: wait after all swords in the current wave finish before summoning the next wave
    if (b.phase === 2 && this.summonedSwords.length === 0 && this.swordRespawnQueue.length === 0) {
      this.ignisSwordsCooldown -= dt;
      if (this.ignisSwordsCooldown <= 0) {
        this.beginIgnisSwords();
      }
      return;
    }

    const p = this.player;
    const pCx = p.x + p.w / 2;
    const pCy = p.y + p.h / 2;

    // 1. Spawn queued swords one by one around Ignis
    for (let i = this.swordRespawnQueue.length - 1; i >= 0; i--) {
      const q = this.swordRespawnQueue[i];
      q.timer -= dt;
      if (q.timer <= 0) {
        const pos = this.getIgnisSwordSlotPos(q.slotIndex);
        const initAng = Math.atan2(pCy - pos.y, pCx - pos.x);
        this.summonedSwords.push({
          id: this.uid('sword'),
          slotIndex: q.slotIndex,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          angle: initAng,
          state: 'SUMMONING',
          summonProgress: 0,
          chargeTimer: 0.95,
          damage: 20,
          life: 8.0,
        });
        soundEngine.playBossTelegraph();
        this.spawnStyledBurst(pos.x, pos.y, 10, '#f97316', 140, 'spark');
        this.swordRespawnQueue.splice(i, 1);
      }
    }

    // 2. Update existing summoned swords
    for (let i = this.summonedSwords.length - 1; i >= 0; i--) {
      const sw = this.summonedSwords[i];

      if (sw.state === 'SUMMONING') {
        const slotPos = this.getIgnisSwordSlotPos(sw.slotIndex);
        sw.x = slotPos.x;
        sw.y = slotPos.y;
        sw.summonProgress = Math.min(1, sw.summonProgress + dt * 2.4);
        sw.chargeTimer -= dt;

        // Smoothly aim toward the player while charging around Ignis
        const targetAng = Math.atan2(pCy - sw.y, pCx - sw.x);
        let diff = targetAng - sw.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        sw.angle += diff * Math.min(1, dt * 8);

        if (sw.chargeTimer <= 0) {
          sw.state = 'CHASING';
          const launchSpeed = 335;
          sw.vx = Math.cos(sw.angle) * launchSpeed;
          sw.vy = Math.sin(sw.angle) * launchSpeed;
          this.spawnStyledBurst(sw.x, sw.y, 8, '#fde047', 160, 'spark');
        }
        continue;
      }

      // CHASING: Follow the player smoothly
      sw.life -= dt;
      const desiredAng = Math.atan2(pCy - sw.y, pCx - sw.x);
      let diff = desiredAng - sw.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const maxTurnRate = 2.45; // Smooth curve so player can bait swords into platforms
      sw.angle += clamp(diff, -maxTurnRate * dt, maxTurnRate * dt);

      const speed = 345;
      sw.vx = Math.cos(sw.angle) * speed;
      sw.vy = Math.sin(sw.angle) * speed;
      sw.x += sw.vx * dt;
      sw.y += sw.vy * dt;

      if (Math.random() < 0.45) {
        this.particles.push({
          x: sw.x - Math.cos(sw.angle) * 18,
          y: sw.y - Math.sin(sw.angle) * 18,
          vx: (Math.random() - 0.5) * 35,
          vy: -25 - Math.random() * 30,
          size: 2.8,
          color: Math.random() < 0.5 ? '#ef4444' : '#fb923c',
          alpha: 0.85,
          life: 0.25,
          maxLife: 0.25,
          shape: 'circle',
        });
      }

      const swordRect: Rect = { x: sw.x - 12, y: sw.y - 12, w: 24, h: 24 };

      // Check platform collision -> sword disappears and a new sword respawns around Ignis!
      let hitPlatform = false;
      for (const plat of this.room.platforms) {
        if (rectsOverlap(swordRect, plat)) {
          hitPlatform = true;
          break;
        }
      }

      if (
        hitPlatform ||
        sw.life <= 0 ||
        sw.x < 40 ||
        sw.x > this.room.width - 40 ||
        sw.y < 40 ||
        sw.y > this.room.height - 40
      ) {
        this.spawnStyledBurst(sw.x, sw.y, 12, '#f97316', 180, 'spark');
        this.spawnStyledBurst(sw.x, sw.y, 6, '#fde047', 120, 'circle');
        this.summonedSwords.splice(i, 1);
        if (b.phase >= 3) {
          this.queueSwordRespawn(sw.slotIndex);
        }
        continue;
      }

      // Check player hit / parry
      if (rectsOverlap(swordRect, p)) {
        if (p.state === 'PARRYING' && p.parryTimer > 0) {
          p.parrySuccessFlash = 0.28;
          p.essence = Math.min(p.maxEssence, p.essence + 14);
          soundEngine.playParrySuccess();
          this.addFloatingText(pCx, p.y - 18, 'ESPADA APARADA!', '#fde047');
          this.spawnStyledBurst(sw.x, sw.y, 14, '#fde047', 210, 'spark');
          this.summonedSwords.splice(i, 1);
          if (b.phase >= 3) {
            this.queueSwordRespawn(sw.slotIndex);
          }
        } else {
          const hit = this.tryHitPlayer(sw.damage, sw.x, true);
          if (hit) {
            this.spawnStyledBurst(sw.x, sw.y, 12, '#ef4444', 190, 'spark');
            this.summonedSwords.splice(i, 1);
            if (b.phase >= 3) {
              this.queueSwordRespawn(sw.slotIndex);
            }
          }
        }
      }
    }
  }

  private tryHitPlayer(
    damage: number,
    sourceX: number,
    parrable: boolean,
    attackerEnemy?: EnemyEntity,
    isBossAttack = false
  ): boolean {
    const p = this.player;
    if (this.debugOptions.godMode || p.state === 'DEAD') return false;
    if (p.dashInvulnTimer > 0 || p.invulnTimer > 0) return false;

    if (p.state === 'PARRYING' && p.parryTimer > 0) {
      if (parrable) {
        p.parrySuccessFlash = 0.34;
        p.invulnTimer = 0.38;
        p.essence = Math.min(p.maxEssence, p.essence + this.config.stats.parryEssenceGain);
        this.hitstopTimer = 0.095;
        this.shakeTimer = 0.22;
        this.shakeIntensity = 6;
        this.triggerScreenPulse('#38bdf8', 0.24);
        soundEngine.playParrySuccess();
        this.addFloatingText(p.x + p.w / 2, p.y - 22, 'PARRY PERFEITO!', '#fde047', true);
        this.slashes.push({
          x: p.x + p.w / 2,
          y: p.y + p.h * 0.45,
          facing: p.facing,
          radius: 65,
          angleStart: 0,
          angleEnd: Math.PI * 2,
          color: this.config.palette.parryFlash,
          glow: '#ffffff',
          life: 0.25,
          maxLife: 0.25,
          kind: 'parry',
        });
        this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h * 0.45, 18, '#fde047', 250, 'spark');

        if (attackerEnemy) {
          attackerEnemy.state = 'STAGGERED';
          attackerEnemy.staggerTimer = 1.6;
          attackerEnemy.vx = (attackerEnemy.x > p.x ? 1 : -1) * 160;
          this.addFloatingText(attackerEnemy.x + attackerEnemy.w / 2, attackerEnemy.y - 16, 'ATORDOADO', '#38bdf8');
        }
        if (isBossAttack && !this.boss.defeated) {
          const stunDur = this.boss.parryStunDuration || 1.75;
          this.boss.state = 'STAGGERED';
          this.boss.staggerTimer = stunDur;
          this.boss.vx = 0;
          this.boss.currentAttack = null;
          this.addFloatingText(
            this.boss.x + this.boss.w / 2,
            this.boss.y - 24,
            stunDur >= 2.5 ? 'ATORDOAMENTO PROFUNDO!' : stunDur <= 0.7 ? 'STUN BREVE!' : 'CHEFE ATORDOADO!',
            '#38bdf8',
            true
          );
        }
        return false;
      } else {
        this.addFloatingText(p.x + p.w / 2, p.y - 22, 'ATAQUE IMPARÁVEL!', '#ef4444');
      }
    }

    p.health = Math.max(0, p.health - damage);
    p.invulnTimer = 0.75;
    p.hurtTimer = 0.24;
    p.healTimer = 0;
    p.attackTimer = 0;
    p.parryTimer = 0;

    // THE CELESTIAL PASSIVE: Single Revive upon lethal damage!
    if (p.health <= 0 && this.characterId === 'celestial' && p.celestialReviveAvailable) {
      p.celestialReviveAvailable = false;
      p.health = Math.round(p.maxHealth * 0.65);
      p.essence = Math.min(p.maxEssence, p.essence + 30);
      p.invulnTimer = 2.1;
      p.hurtTimer = 0;
      p.celestialReviveFlash = 1.1;
      p.state = 'IDLE';
      p.vx = 0;
      p.vy = -180;
      this.hitstopTimer = 0.14;
      this.shakeTimer = 0.35;
      this.shakeIntensity = 7;
      this.triggerScreenPulse('#fde047', 0.5);
      soundEngine.playHeal();
      soundEngine.playParrySuccess();
      this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 28, '#fde047', 260, 'circle');
      this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 20, '#ffffff', 300, 'spark');
      this.slashes.push({
        x: p.x + p.w / 2,
        y: p.y + p.h / 2,
        facing: 1,
        radius: 105,
        angleStart: 0,
        angleEnd: Math.PI * 2,
        color: '#fde047',
        glow: '#ffffff',
        life: 0.4,
        maxLife: 0.4,
        kind: 'parry',
      });
      this.addFloatingText(p.x + p.w / 2, p.y - 30, 'GRAÇA CELESTIAL · RENASCIDA!', '#fde047', true);
      return true;
    }

    const kbDir = p.x + p.w / 2 >= sourceX ? 1 : -1;
    soundEngine.playHurt();
    this.shakeTimer = 0.22;
    this.shakeIntensity = 6;
    this.triggerScreenPulse('#dc2626', 0.25);
    this.addFloatingText(p.x + p.w / 2, p.y - 14, `-${damage}`, '#ef4444', true);
    this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h / 2, 14, '#dc2626', 190, 'circle');

    // Heavy damage breaks combo & resets Ultimate charge!
    p.recentDamageTaken += damage;
    p.recentDamageTimer = 3.2;
    if ((damage >= 20 || p.recentDamageTaken >= 26) && (p.comboCount > 0 || p.ultimateCharge > 0)) {
      p.comboCount = 0;
      p.comboDecayTimer = 0;
      p.ultimateCharge = 0;
      p.recentDamageTaken = 0;
      this.addFloatingText(p.x + p.w / 2, p.y - 36, 'COMBO QUEBRADO!', '#f87171', true);
    }

    // THE ABYSSAL PASSIVE: Rage bar fills upon taking damage (player triggers revolver manually with [I])
    if (p.health > 0 && this.characterId === 'abyssal') {
      const prevRage = p.rage;
      p.rage = Math.min(p.maxRage, p.rage + Math.max(25, Math.round(damage * 1.6)));
      if (prevRage < p.maxRage && p.rage >= p.maxRage) {
        this.spawnStyledBurst(p.x + p.w / 2, p.y + p.h * 0.45, 14, '#ef4444', 210, 'spark');
        this.addFloatingText(p.x + p.w / 2, p.y - 30, 'IRA MÁXIMA · PRESSIONE [I]!', '#fde047', true);
      }
    }

    p.vx = kbDir * 220;
    p.vy = -190;
    p.state = p.health <= 0 ? 'DEAD' : 'HURT';
    return true;
  }

  private updateEnemies(dt: number) {
    const enemies = this.enemiesByRoom[this.roomId];
    const p = this.player;
    const pCx = p.x + p.w / 2;
    const pCy = p.y + p.h / 2;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.animTime += dt;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.attackCooldown > 0) e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      if (e.buffTimer > 0) e.buffTimer = Math.max(0, e.buffTimer - dt);
      if (e.mageHealCooldown > 0) e.mageHealCooldown = Math.max(0, e.mageHealCooldown - dt);
      if (e.mageBuffCooldown > 0) e.mageBuffCooldown = Math.max(0, e.mageBuffCooldown - dt);

      const isFloating = e.type === 'ranged' || e.type === 'swarmling';

      if (e.state === 'DEAD') {
        e.stateTimer -= dt;
        e.vx = this.approach(e.vx, 0, 800 * dt);
        if (!isFloating) e.vy = Math.min(800, e.vy + 1400 * dt);
        this.moveAndCollideEntity(e, dt, !isFloating);
        if (e.stateTimer <= 0) {
          enemies.splice(i, 1);
        }
        continue;
      }

      if (e.burnTimer > 0) {
        e.burnTimer = Math.max(0, e.burnTimer - dt);
        e.burnTickTimer -= dt;
        if (Math.random() < 0.45) {
          this.particles.push({
            x: e.x + Math.random() * e.w,
            y: e.y + Math.random() * e.h,
            vx: (Math.random() - 0.5) * 30,
            vy: -55 - Math.random() * 55,
            size: 3.2,
            color: Math.random() < 0.5 ? '#f97316' : '#ef4444',
            alpha: 0.85,
            life: 0.3,
            maxLife: 0.3,
            shape: 'circle',
          });
        }
        if (e.burnTickTimer <= 0) {
          e.burnTickTimer = 0.5;
          const tickDmg = Math.max(4, Math.round(e.burnDps * 0.5));
          this.damageEnemy(e, tickDmg, 0, 0, false, true);
          if (e.health <= 0) continue;
        }
      }

      if (e.state === 'STAGGERED') {
        e.staggerTimer -= dt;
        e.vx = this.approach(e.vx, 0, 900 * dt);
        if (!isFloating) e.vy = Math.min(800, e.vy + 1400 * dt);
        this.moveAndCollideEntity(e, dt, !isFloating);
        if (e.staggerTimer <= 0) {
          e.state = 'CHASE';
          e.attackCooldown = 0.6;
        }
        continue;
      }

      if (e.state === 'HURT') {
        e.stateTimer -= dt;
        e.vx = this.approach(e.vx, 0, 1100 * dt);
        if (!isFloating) e.vy = Math.min(800, e.vy + 1400 * dt);
        this.moveAndCollideEntity(e, dt, !isFloating);
        if (e.stateTimer <= 0) {
          e.state = 'CHASE';
        }
        continue;
      }

      const eCx = e.x + e.w / 2;
      const eCy = e.y + e.h / 2;
      const distX = pCx - eCx;
      const dist = Math.hypot(distX, pCy - eCy);

      if (e.type === 'grunt') {
        this.updateGruntAI(e, dt, dist, distX);
      } else if (e.type === 'hunter') {
        this.updateHunterAI(e, dt, dist, distX);
      } else if (e.type === 'swarmling') {
        this.updateSwarmlingAI(e, dt, dist, distX, pCx, pCy);
      } else if (e.type === 'brute') {
        this.updateBruteAI(e, dt, dist, distX);
      } else if (e.type === 'mage') {
        this.updateMageAI(e, dt, dist, distX, pCx, pCy, enemies);
      } else {
        this.updateRangedAI(e, dt, dist, distX, pCx, pCy);
      }
    }
  }

  private updateGruntAI(e: EnemyEntity, dt: number, dist: number, distX: number) {
    const buffMult = e.buffTimer > 0 ? 1.35 : 1;
    if (e.state === 'PATROL' || e.state === 'IDLE') {
      const patrolOffset = e.x - e.patrolOriginX;
      if (Math.abs(patrolOffset) > 100) e.facing = patrolOffset > 0 ? -1 : 1;
      e.vx = e.facing * 55 * buffMult;
      if (dist < 380 && this.player.state !== 'DEAD') {
        e.state = 'CHASE';
      }
    } else if (e.state === 'CHASE') {
      e.facing = distX >= 0 ? 1 : -1;
      e.vx = e.facing * 125 * buffMult;
      if (Math.abs(distX) < 62 && Math.abs(this.player.y - e.y) < 70 && e.attackCooldown <= 0) {
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.42;
        e.vx = 0;
        e.hasHitCurrentSwing = false;
      } else if (dist > 540) {
        e.state = 'PATROL';
      }
    } else if (e.state === 'TELEGRAPH') {
      e.vx = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'ATTACK';
        e.stateTimer = 0.2;
        e.vx = e.facing * 95 * buffMult;
      }
    } else if (e.state === 'ATTACK') {
      e.stateTimer -= dt;
      if (!e.hasHitCurrentSwing && e.stateTimer < 0.16 && e.stateTimer > 0.04) {
        const atkBox: Rect = {
          x: e.facing === 1 ? e.x + e.w * 0.4 : e.x - 42,
          y: e.y + 6,
          w: 52,
          h: e.h - 10,
        };
        if (rectsOverlap(atkBox, this.player)) {
          e.hasHitCurrentSwing = true;
          this.tryHitPlayer(Math.round(e.damage * buffMult), e.x + e.w / 2, true, e);
        }
      }
      if (e.stateTimer <= 0) {
        e.state = 'RECOVER';
        e.stateTimer = 0.48;
        e.attackCooldown = 0.85;
      }
    } else if (e.state === 'RECOVER') {
      e.vx = this.approach(e.vx, 0, 900 * dt);
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'CHASE';
    }

    e.vy = Math.min(820, e.vy + 1450 * dt);
    this.moveAndCollideEntity(e, dt, true);
  }

  private updateHunterAI(e: EnemyEntity, dt: number, dist: number, distX: number) {
    const buffMult = e.buffTimer > 0 ? 1.35 : 1;
    if (e.state === 'PATROL' || e.state === 'IDLE') {
      e.vx = e.facing * 80 * buffMult;
      if (Math.abs(e.x - e.patrolOriginX) > 130) e.facing = e.x > e.patrolOriginX ? -1 : 1;
      if (dist < 460 && this.player.state !== 'DEAD') {
        e.state = 'CHASE';
      }
    } else if (e.state === 'CHASE') {
      e.facing = distX >= 0 ? 1 : -1;
      e.vx = e.facing * 185 * buffMult;
      if (Math.abs(distX) < 165 && Math.abs(this.player.y - e.y) < 80 && e.attackCooldown <= 0) {
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.36;
        e.vx = 0;
        e.hasHitCurrentSwing = false;
      }
    } else if (e.state === 'TELEGRAPH') {
      e.vx = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'ATTACK';
        e.stateTimer = 0.28;
        e.vx = e.facing * 430 * buffMult;
        e.vy = -120;
      }
    } else if (e.state === 'ATTACK') {
      e.stateTimer -= dt;
      if (!e.hasHitCurrentSwing && rectsOverlap(e, this.player)) {
        e.hasHitCurrentSwing = true;
        this.tryHitPlayer(Math.round(e.damage * buffMult), e.x + e.w / 2, true, e);
      }
      if (e.stateTimer <= 0) {
        e.state = 'RECOVER';
        e.stateTimer = 0.45;
        e.attackCooldown = 0.95;
      }
    } else if (e.state === 'RECOVER') {
      e.vx = this.approach(e.vx, 0, 1200 * dt);
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'CHASE';
    }

    e.vy = Math.min(820, e.vy + 1450 * dt);
    this.moveAndCollideEntity(e, dt, true);
  }

  private updateSwarmlingAI(
    e: EnemyEntity,
    dt: number,
    dist: number,
    distX: number,
    pCx: number,
    pCy: number
  ) {
    const buffMult = e.buffTimer > 0 ? 1.35 : 1;
    const eCx = e.x + e.w / 2;
    const eCy = e.y + e.h / 2;

    if (e.state === 'PATROL' || e.state === 'IDLE') {
      const patrolOffset = e.x - e.patrolOriginX;
      if (Math.abs(patrolOffset) > 125) e.facing = patrolOffset > 0 ? -1 : 1;
      e.vx = e.facing * 95 * buffMult;
      e.vy = Math.sin(e.animTime * 5.0) * 42;
      if (dist < 560 && this.player.state !== 'DEAD') {
        e.state = 'CHASE';
      }
    } else if (e.state === 'CHASE') {
      e.facing = distX >= 0 ? 1 : -1;
      const targetY = pCy - 14;
      const ang = Math.atan2(targetY - eCy, pCx - eCx);
      const speed = 235 * buffMult;
      e.vx = Math.cos(ang) * speed;
      e.vy = Math.sin(ang) * speed + Math.sin(e.animTime * 8) * 28;
      if (dist < 64 && e.attackCooldown <= 0) {
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.18;
        e.vx = -e.facing * 45;
        e.vy = -25;
        e.hasHitCurrentSwing = false;
      }
    } else if (e.state === 'TELEGRAPH') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'ATTACK';
        e.stateTimer = 0.18;
        const ang = Math.atan2(pCy - eCy, pCx - eCx);
        const swoopSpeed = 350 * buffMult;
        e.vx = Math.cos(ang) * swoopSpeed;
        e.vy = Math.sin(ang) * swoopSpeed;
      }
    } else if (e.state === 'ATTACK') {
      e.stateTimer -= dt;
      const atkBox: Rect = {
        x: e.x - 4,
        y: e.y - 4,
        w: e.w + 8,
        h: e.h + 8,
      };
      if (!e.hasHitCurrentSwing && rectsOverlap(atkBox, this.player)) {
        e.hasHitCurrentSwing = true;
        this.tryHitPlayer(Math.round(e.damage * buffMult), eCx, true, e);
      }
      if (e.stateTimer <= 0) {
        e.state = 'RECOVER';
        e.stateTimer = 0.22;
        e.attackCooldown = 0.48;
      }
    } else if (e.state === 'RECOVER') {
      e.vx = this.approach(e.vx, 0, 900 * dt);
      e.vy = this.approach(e.vy, -35, 600 * dt);
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'CHASE';
    }

    this.moveAndCollideEntity(e, dt, false);
    e.y = clamp(e.y, 70, 780 - e.h - 16);
  }

  private updateBruteAI(e: EnemyEntity, dt: number, dist: number, distX: number) {
    const buffMult = e.buffTimer > 0 ? 1.35 : 1;
    if (e.state === 'PATROL' || e.state === 'IDLE') {
      const patrolOffset = e.x - e.patrolOriginX;
      if (Math.abs(patrolOffset) > 90) e.facing = patrolOffset > 0 ? -1 : 1;
      e.vx = e.facing * 38 * buffMult;
      if (dist < 460 && this.player.state !== 'DEAD') {
        e.state = 'CHASE';
      }
    } else if (e.state === 'CHASE') {
      e.facing = distX >= 0 ? 1 : -1;
      e.vx = e.facing * 84 * buffMult;
      if (Math.abs(distX) < 105 && Math.abs(this.player.y - e.y) < 95 && e.attackCooldown <= 0) {
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.96; // Slow heavy windup!
        e.vx = 0;
        e.hasHitCurrentSwing = false;
      }
    } else if (e.state === 'TELEGRAPH') {
      e.vx = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'ATTACK';
        e.stateTimer = 0.28;
        e.vx = e.facing * 115 * buffMult;
        this.shakeTimer = Math.max(this.shakeTimer, 0.16);
        this.shakeIntensity = Math.max(this.shakeIntensity, 5);
        this.spawnStyledBurst(e.x + e.w / 2 + e.facing * 42, e.y + e.h - 4, 12, '#f97316', 180, 'spark');
      }
    } else if (e.state === 'ATTACK') {
      e.stateTimer -= dt;
      if (!e.hasHitCurrentSwing && e.stateTimer < 0.22 && e.stateTimer > 0.04) {
        const atkBox: Rect = {
          x: e.facing === 1 ? e.x + e.w * 0.25 : e.x - 74,
          y: e.y + 10,
          w: 96,
          h: e.h - 6,
        };
        if (rectsOverlap(atkBox, this.player)) {
          e.hasHitCurrentSwing = true;
          this.tryHitPlayer(Math.round(e.damage * buffMult), e.x + e.w / 2, true, e);
        }
      }
      if (e.stateTimer <= 0) {
        e.state = 'RECOVER';
        e.stateTimer = 0.85;
        e.attackCooldown = 1.65;
      }
    } else if (e.state === 'RECOVER') {
      e.vx = this.approach(e.vx, 0, 800 * dt);
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'CHASE';
    }

    e.vy = Math.min(820, e.vy + 1450 * dt);
    this.moveAndCollideEntity(e, dt, true);
  }

  private updateMageAI(
    e: EnemyEntity,
    dt: number,
    dist: number,
    distX: number,
    pCx: number,
    pCy: number,
    roomEnemies: EnemyEntity[]
  ) {
    e.facing = distX >= 0 ? 1 : -1;

    if (e.state === 'IDLE' || e.state === 'PATROL') {
      e.vx = 0;
      if (dist < 760 && this.player.state !== 'DEAD') {
        e.state = 'CHASE';
      }
    } else if (e.state === 'CHASE') {
      if (dist < 240) {
        e.vx = -e.facing * 92;
      } else if (dist > 490) {
        e.vx = e.facing * 86;
      } else {
        e.vx = this.approach(e.vx, 0, 500 * dt);
      }

      const needsHeal = roomEnemies.some(
        (ally) => ally.state !== 'DEAD' && ally.health < ally.maxHealth * 0.88
      );
      const needsBuff = roomEnemies.some(
        (ally) => ally.state !== 'DEAD' && ally.id !== e.id && ally.buffTimer <= 0.6
      );

      if (e.mageHealCooldown <= 0 && needsHeal) {
        e.castingSpell = 'heal';
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.72;
        e.vx = 0;
      } else if (e.mageBuffCooldown <= 0 && needsBuff) {
        e.castingSpell = 'buff';
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.65;
        e.vx = 0;
      } else if (e.attackCooldown <= 0 && dist < 640) {
        e.castingSpell = null;
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.55;
        e.vx = 0;
      }
    } else if (e.state === 'TELEGRAPH') {
      e.vx = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'ATTACK';
        e.stateTimer = 0.24;

        if (e.castingSpell === 'heal') {
          e.mageHealCooldown = 11.5; // High cooldown heal!
          soundEngine.playMageSpell(true);
          this.spawnStyledBurst(e.x + e.w / 2, e.y + e.h / 2, 18, '#4ade80', 210, 'circle');
          this.addFloatingText(e.x + e.w / 2, e.y - 22, 'CURA SOMBRIA!', '#4ade80', true);
          for (const ally of roomEnemies) {
            if (ally.state === 'DEAD') continue;
            const healed = Math.min(70, ally.maxHealth - ally.health);
            ally.health = Math.min(ally.maxHealth, ally.health + 70);
            this.spawnStyledBurst(ally.x + ally.w / 2, ally.y + ally.h / 2, 14, '#4ade80', 170, 'circle');
            if (healed > 0) {
              this.addFloatingText(ally.x + ally.w / 2, ally.y - 16, `+${healed}`, '#4ade80');
            }
          }
        } else if (e.castingSpell === 'buff') {
          e.mageBuffCooldown = 9.0;
          soundEngine.playMageSpell(false);
          this.spawnStyledBurst(e.x + e.w / 2, e.y + e.h / 2, 18, '#c084fc', 210, 'spark');
          this.addFloatingText(e.x + e.w / 2, e.y - 22, 'FÚRIA ARCANISTA!', '#e879f9', true);
          for (const ally of roomEnemies) {
            if (ally.state === 'DEAD') continue;
            ally.buffTimer = 7.5;
            this.spawnStyledBurst(ally.x + ally.w / 2, ally.y + ally.h / 2, 14, '#c084fc', 180, 'spark');
            if (ally.id !== e.id) {
              this.addFloatingText(ally.x + ally.w / 2, ally.y - 18, 'BUFF +35%', '#e879f9');
            }
          }
        } else {
          const ox = e.x + e.w / 2;
          const oy = e.y + e.h * 0.4;
          const ang = Math.atan2(pCy - oy, pCx - ox);
          const speed = 340;
          this.projectiles.push({
            id: this.uid('proj'),
            x: ox,
            y: oy,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            radius: 7,
            damage: e.damage,
            parrable: true,
            fromBoss: false,
            color: '#c084fc',
            life: 2.6,
            kind: 'orb',
          });
        }
      }
    } else if (e.state === 'ATTACK') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.castingSpell = null;
        e.state = 'RECOVER';
        e.stateTimer = 0.45;
        e.attackCooldown = 1.9;
      }
    } else if (e.state === 'RECOVER') {
      e.vx = this.approach(e.vx, 0, 700 * dt);
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'CHASE';
    }

    e.vy = Math.min(820, e.vy + 1450 * dt);
    this.moveAndCollideEntity(e, dt, true);
  }

  private updateRangedAI(e: EnemyEntity, dt: number, dist: number, distX: number, pCx: number, pCy: number) {
    e.facing = distX >= 0 ? 1 : -1;

    if (e.state === 'IDLE' || e.state === 'PATROL') {
      e.vx = 0;
      e.vy = Math.sin(e.animTime * 2.5) * 18;
      if (dist < 560 && this.player.state !== 'DEAD') {
        e.state = 'CHASE';
      }
    } else if (e.state === 'CHASE') {
      if (dist < 190) {
        e.vx = -e.facing * 125;
      } else if (dist > 410) {
        e.vx = e.facing * 110;
      } else {
        e.vx = this.approach(e.vx, 0, 600 * dt);
      }
      e.vy = Math.sin(e.animTime * 3) * 24;

      if (e.attackCooldown <= 0 && dist < 560) {
        e.state = 'TELEGRAPH';
        e.stateTimer = 0.55;
        e.vx = 0;
      }
    } else if (e.state === 'TELEGRAPH') {
      e.vx = 0;
      e.vy = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'ATTACK';
        e.stateTimer = 0.18;
        const ox = e.x + e.w / 2;
        const oy = e.y + e.h * 0.4;
        const ang = Math.atan2(pCy - oy, pCx - ox);
        const speed = 340;
        this.projectiles.push({
          id: this.uid('proj'),
          x: ox,
          y: oy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          radius: 7,
          damage: e.damage,
          parrable: true,
          fromBoss: false,
          color: '#c084fc',
          life: 2.6,
          kind: 'orb',
        });
      }
    } else if (e.state === 'ATTACK') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.state = 'RECOVER';
        e.stateTimer = 0.45;
        e.attackCooldown = 1.65;
      }
    } else if (e.state === 'RECOVER') {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'CHASE';
    }

    this.moveAndCollideEntity(e, dt, false);
  }

  private updateBoss(dt: number) {
    if (!this.room.bossId) return;
    const b = this.boss;
    const p = this.player;
    b.animTime += dt;
    if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
    if (b.attackCooldown > 0) b.attackCooldown = Math.max(0, b.attackCooldown - dt);

    if (b.defeated) {
      if (b.state === 'DEATH') {
        b.stateTimer -= dt;
      }
      return;
    }

    // Trigger summoning ritual when entering central zone
    if (b.state === 'WAITING') {
      const triggerX = this.room.bossTriggerX ?? 340;
      if (p.x >= triggerX) {
        b.active = true;
        b.state = 'INTRO';
        b.stateTimer = 3.0;
        b.introProgress = 0;
        b.x = this.room.width / 2 - b.w / 2;
        b.y = 800 - b.h;
        b.facing = p.x + p.w / 2 >= b.x + b.w / 2 ? 1 : -1;
        soundEngine.playBossPhase();
        this.shakeTimer = 0.55;
        this.shakeIntensity = 6;
      }
      return;
    }

    if (b.active && !b.defeated && Math.random() < (b.phase === 3 ? 0.55 : b.phase === 2 ? 0.3 : 0.15)) {
      this.particles.push({
        x: Math.random() * this.room.width,
        y: 795,
        vx: (Math.random() - 0.5) * 30,
        vy: -55 - Math.random() * 85,
        size: 2.5 + Math.random() * 2.5,
        color:
          b.id === 'ashen_sovereign'
            ? b.phase === 3
              ? '#ef4444'
              : b.phase === 2
              ? '#fb923c'
              : '#f59e0b'
            : b.phase === 3
            ? '#ef4444'
            : b.phase === 2
            ? '#a855f7'
            : '#f59e0b',
        alpha: 0.7,
        life: 1.1,
        maxLife: 1.1,
        shape: 'circle',
      });
    }

    if (b.aiPaused) return;

    const pCx = p.x + p.w / 2;
    const bCx = b.x + b.w / 2;
    const dist = Math.abs(pCx - bCx);

    if (b.burnTimer > 0 && b.state !== 'INTRO' && !this.isBossInOrbSequence()) {
      b.burnTimer = Math.max(0, b.burnTimer - dt);
      b.burnTickTimer -= dt;
      if (Math.random() < 0.55) {
        this.particles.push({
          x: b.x + Math.random() * b.w,
          y: b.y + Math.random() * b.h,
          vx: (Math.random() - 0.5) * 45,
          vy: -70 - Math.random() * 65,
          size: 4,
          color: Math.random() < 0.5 ? '#f97316' : '#ef4444',
          alpha: 0.9,
          life: 0.35,
          maxLife: 0.35,
          shape: 'circle',
        });
      }
      if (b.burnTickTimer <= 0) {
        b.burnTickTimer = 0.5;
        const tickDmg = Math.max(6, Math.round(b.burnDps * 0.5));
        this.damageBoss(tickDmg, true);
        if (b.defeated) return;
      }
    }

    if (b.state === 'INTRO') {
      b.stateTimer -= dt;
      b.introProgress = clamp(1 - b.stateTimer / 3.0, 0, 1);
      b.vx = 0;
      if (Math.random() < 0.75) {
        this.particles.push({
          x: bCx + (Math.random() - 0.5) * 110,
          y: 795,
          vx: (Math.random() - 0.5) * 40,
          vy: -160 - Math.random() * 160,
          size: 3.5,
          color: b.id === 'ashen_sovereign' ? '#fb923c' : '#f59e0b',
          alpha: 0.9,
          life: 0.6,
          maxLife: 0.6,
          shape: 'circle',
        });
      }
      if (b.stateTimer <= 0) {
        b.introProgress = 1;
        b.state = 'IDLE';
        b.stateTimer = 0.25;
        b.attackCooldown = 0.35;
      }
      return;
    }

    // Ignis Phase 3: Hover in mid-air at center & zoom onto boss channeling energy up to ceiling Orb
    if (b.state === 'ORB_INTRO') {
      b.stateTimer -= dt;
      b.x = this.room.width / 2 - b.w / 2;
      b.y = 295 + Math.sin(b.animTime * 3.2) * 8;
      b.grounded = false;
      b.vx = 0;
      b.vy = 0;
      this.targetCameraZoom = 1.48;
      this.cameraFocusTarget = { x: this.room.width / 2, y: b.y + b.h * 0.12 };
      if (this.ignisOrb) {
        this.ignisOrb.beamProgress = clamp(1 - b.stateTimer / 2.6, 0, 1);
        this.ignisOrb.radius = 14 + this.ignisOrb.beamProgress * 22;
        if (Math.random() < 0.85) {
          this.particles.push({
            x: bCx + (Math.random() - 0.5) * 26,
            y: b.y + 18,
            vx: (Math.random() - 0.5) * 24,
            vy: -420 - Math.random() * 180,
            size: 4,
            color: Math.random() < 0.5 ? '#fde047' : '#ef4444',
            alpha: 0.95,
            life: 0.65,
            maxLife: 0.65,
            shape: 'spark',
          });
        }
      }
      if (b.stateTimer <= 0) {
        b.state = 'ORB_CHARGE';
        if (this.ignisOrb) {
          this.ignisOrb.phase = 'CHARGING';
          this.ignisOrb.chargeTime = 15.0;
        }
        this.targetCameraZoom = 1.0;
        this.cameraFocusTarget = null;
        this.spawnIgnisPhase3Structures();
      }
      return;
    }

    // Ignis Phase 3: 15-second Orb Charge (boss hovers invulnerable in center air & does not attack)
    if (b.state === 'ORB_CHARGE') {
      b.x = this.room.width / 2 - b.w / 2;
      b.y = 295 + Math.sin(b.animTime * 3.2) * 8;
      b.grounded = false;
      b.vx = 0;
      b.vy = 0;
      if (Math.random() < 0.55) {
        this.particles.push({
          x: bCx + (Math.random() - 0.5) * 68,
          y: b.y + b.h - 4,
          vx: (Math.random() - 0.5) * 45,
          vy: 75 + Math.random() * 75,
          size: 3.4,
          color: Math.random() < 0.5 ? '#fb923c' : '#ef4444',
          alpha: 0.8,
          life: 0.42,
          maxLife: 0.42,
          shape: 'circle',
        });
      }
      if (this.ignisOrb) {
        this.ignisOrb.chargeTime = Math.max(0, this.ignisOrb.chargeTime - dt);
        const chargePct = 1 - this.ignisOrb.chargeTime / this.ignisOrb.maxChargeTime;
        this.ignisOrb.radius = 36 + chargePct * 34;

        if (Math.random() < 0.7) {
          this.particles.push({
            x: this.ignisOrb.x + (Math.random() - 0.5) * 70,
            y: this.ignisOrb.y + (Math.random() - 0.5) * 70,
            vx: (Math.random() - 0.5) * 35,
            vy: (Math.random() - 0.5) * 35,
            size: 3.5,
            color: chargePct > 0.7 ? '#ef4444' : '#fb923c',
            alpha: 0.9,
            life: 0.35,
            maxLife: 0.35,
            shape: 'circle',
          });
        }

        if (this.ignisOrb.chargeTime <= 0 && this.bossStructures.length > 0) {
          for (const st of this.bossStructures) {
            this.spawnStyledBurst(st.x + st.w / 2, st.y + st.h / 2, 14, '#ef4444', 200, 'spark');
          }
          this.bossStructures = [];
          this.ignisOrb.phase = 'FOCUS';
          b.state = 'ORB_FOCUS';
          b.stateTimer = 1.25;
          this.targetCameraZoom = 1.48;
          this.cameraFocusTarget = { x: bCx, y: b.y + b.h * 0.15 };
          soundEngine.playBossPhase();
          this.addFloatingText(bCx, b.y - 42, 'ORBE COMPLETO · CATACLISMA!', '#ef4444', true);
        }
      }
      return;
    }

    // Ignis Phase 3: Focus camera back on airborne Ignis before hurling Orb
    if (b.state === 'ORB_FOCUS') {
      b.stateTimer -= dt;
      b.x = this.room.width / 2 - b.w / 2;
      b.y = 295 + Math.sin(b.animTime * 3.2) * 8;
      b.grounded = false;
      b.vx = 0;
      b.vy = 0;
      this.targetCameraZoom = 1.48;
      this.cameraFocusTarget = { x: bCx, y: b.y + b.h * 0.15 };
      if (b.stateTimer <= 0) {
        b.state = 'ORB_FALL';
        if (this.ignisOrb) {
          this.ignisOrb.phase = 'FALLING';
          this.cameraFocusTarget = { x: this.ignisOrb.x, y: this.ignisOrb.y };
        }
        this.targetCameraZoom = 1.38;
        soundEngine.playBossTelegraph();
      }
      return;
    }

    // Ignis Phase 3: Camera follows Orb down to floor impact (-99% remaining HP!)
    if (b.state === 'ORB_FALL') {
      b.x = this.room.width / 2 - b.w / 2;
      b.y = 295 + Math.sin(b.animTime * 3.2) * 8;
      b.grounded = false;
      b.vx = 0;
      b.vy = 0;
      if (this.ignisOrb) {
        this.ignisOrb.y += 690 * dt;
        this.targetCameraZoom = 1.38;
        this.cameraFocusTarget = { x: this.ignisOrb.x, y: this.ignisOrb.y };

        if (Math.random() < 0.9) {
          this.particles.push({
            x: this.ignisOrb.x + (Math.random() - 0.5) * 44,
            y: this.ignisOrb.y - 24,
            vx: (Math.random() - 0.5) * 60,
            vy: -140 - Math.random() * 120,
            size: 5,
            color: Math.random() < 0.5 ? '#ef4444' : '#fde047',
            alpha: 0.95,
            life: 0.4,
            maxLife: 0.4,
            shape: 'spark',
          });
        }

        if (this.ignisOrb.y >= 785) {
          const impX = this.ignisOrb.x;
          this.ignisOrb = null;
          this.targetCameraZoom = 1.0;
          this.cameraFocusTarget = null;
          soundEngine.playBossImpact();
          soundEngine.playBossPhase();
          this.shakeTimer = 0.85;
          this.shakeIntensity = 16;
          this.triggerScreenPulse('#ef4444', 0.65);
          this.spawnStyledBurst(impX, 790, 56, '#ef4444', 440, 'spark');
          this.spawnStyledBurst(impX, 790, 38, '#fde047', 340, 'circle');
          this.slashes.push({
            x: impX,
            y: 794,
            facing: 1,
            radius: 420,
            angleStart: Math.PI,
            angleEnd: Math.PI * 2,
            color: '#ef4444',
            glow: '#fde047',
            life: 0.48,
            maxLife: 0.48,
            kind: 'shockwave',
          });

          if (!this.debugOptions.godMode && p.state !== 'DEAD') {
            const remain = Math.max(1, Math.ceil(p.health * 0.01));
            const cataclysmDmg = Math.max(0, p.health - remain);
            if (cataclysmDmg > 0) {
              p.health = remain;
              p.invulnTimer = 1.1;
              p.hurtTimer = 0.36;
              p.healTimer = 0;
              p.attackTimer = 0;
              p.parryTimer = 0;
              p.vy = -210;
              p.vx = (p.x + p.w / 2 >= impX ? 1 : -1) * 260;
              p.state = 'HURT';
              p.comboCount = 0;
              p.comboDecayTimer = 0;
              p.ultimateCharge = 0;
              soundEngine.playHurt();
              this.addFloatingText(p.x + p.w / 2, p.y - 26, `-${cataclysmDmg} (-99% HP!)`, '#ef4444', true);
            }
          }

          b.state = 'IDLE';
          b.vy = 220;
          b.stateTimer = 0.55;
          b.attackCooldown = 0.75;
          this.beginIgnisSwords();
        }
      }
      return;
    }

    if (b.state === 'PHASE_TRANSITION') {
      // Hovering in mid-air at the center of the arena during prolonged transformation
      b.stateTimer -= dt;
      b.vx = 0;
      b.vy = Math.sin(b.animTime * 5) * 18;
      b.y = clamp(b.y + b.vy * dt, 260, 360);
      if (Math.random() < 0.85) {
        this.particles.push({
          x: bCx + (Math.random() - 0.5) * 120,
          y: b.y + b.h + 20,
          vx: (Math.random() - 0.5) * 80,
          vy: -170 - Math.random() * 140,
          size: 4,
          color: b.phase === 3 ? '#ef4444' : b.id === 'ashen_sovereign' ? '#fb923c' : '#c084fc',
          alpha: 0.95,
          life: 0.55,
          maxLife: 0.55,
          shape: 'circle',
        });
      }
      if (b.stateTimer <= 0) {
        b.vy = 0;
        b.state = 'IDLE';
        b.stateTimer = 0.2;
        b.attackCooldown = 0.35;
      }
      return;
    }

    if (b.state === 'STAGGERED') {
      b.staggerTimer -= dt;
      b.vx = this.approach(b.vx, 0, 800 * dt);
      b.vy = Math.min(900, b.vy + 1500 * dt);
      this.moveAndCollideEntity(b, dt, true);
      if (b.staggerTimer <= 0) {
        b.state = 'IDLE';
        b.stateTimer = 0.22;
        b.attackCooldown = 0.4;
        if (
          b.id === 'ashen_sovereign' &&
          (b.phase >= 3 || (b.phase === 2 && this.ignisSwordsCooldown <= 0)) &&
          this.summonedSwords.length === 0 &&
          this.swordRespawnQueue.length === 0
        ) {
          this.beginIgnisSwords();
        }
      }
      return;
    }

    if (b.state === 'IDLE') {
      b.facing = pCx >= bCx ? 1 : -1;
      b.vx = 0;
      b.stateTimer -= dt;
      if (b.stateTimer <= 0) {
        if (b.attackCooldown <= 0 && p.state !== 'DEAD') {
          this.chooseBossAttack(dist);
        } else {
          b.state = 'APPROACH';
          b.stateTimer = 0.55;
        }
      }
    } else if (b.state === 'APPROACH') {
      b.facing = pCx >= bCx ? 1 : -1;
      const moveSpeed = b.phase === 1 ? 185 : b.phase === 2 ? 245 : 295;
      b.vx = b.facing * moveSpeed;
      b.stateTimer -= dt;
      if (dist < 145 || (b.attackCooldown <= 0 && b.stateTimer <= 0)) {
        if (b.attackCooldown <= 0 && p.state !== 'DEAD') {
          this.chooseBossAttack(dist);
        } else {
          b.state = 'IDLE';
          b.stateTimer = 0.18;
        }
      }
    } else if (b.state === 'TELEGRAPH') {
      b.vx = 0;
      b.stateTimer -= dt;
      if (b.currentAttack === 'celestial_descent') {
        const lockTime = b.phase === 1 ? 0.3 : 0.2;
        if (b.stateTimer > lockTime) {
          b.descentWarningX = clamp(pCx, 180, this.room.width - 180);
          b.y = this.approach(b.y, 240, 1100 * dt);
        }
      }
      if (b.stateTimer <= 0) {
        this.beginBossAttackExecution();
      }
    } else if (b.state === 'ATTACK') {
      this.updateBossAttackExecution(dt);
    } else if (b.state === 'RECOVERY') {
      b.vx = this.approach(b.vx, 0, 1400 * dt);
      b.stateTimer -= dt;
      if (b.stateTimer <= 0) {
        b.currentAttack = null;
        b.state = 'IDLE';
        b.stateTimer = b.phase === 3 ? 0.1 : 0.2;
      }
    }

    if (b.currentAttack !== 'celestial_descent' || b.state !== 'TELEGRAPH') {
      b.vy = Math.min(940, b.vy + 1500 * dt);
      this.moveAndCollideEntity(b, dt, true);
    }
  }

  private chooseBossAttack(dist: number) {
    const b = this.boss;
    const p = this.player;
    b.facing = p.x + p.w / 2 >= b.x + b.w / 2 ? 1 : -1;
    b.hasHitCurrentSwing = false;
    b.projectilesFiredInAttack = 0;
    b.comboStep = 0;

    if (b.id === 'ashen_sovereign') {
      let pool: BossAttackType[] = ['corte_ardente', 'investida_sombria', 'chuva_de_cinzas', 'ruptura'];
      if (b.phase === 3) {
        pool = ['corte_ardente', 'investida_sombria', 'chuva_de_cinzas', 'ruptura', 'ultimo_suspiro', 'ultimo_suspiro'];
      } else if (dist < 175) {
        pool.push('corte_ardente', 'ruptura');
      } else {
        pool.push('investida_sombria', 'chuva_de_cinzas');
      }
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      b.currentAttack = chosen;
      b.state = 'TELEGRAPH';

      const speedScale = b.phase === 1 ? 0.94 : b.phase === 2 ? 0.8 : 0.68;
      if (chosen === 'corte_ardente') {
        b.parrable = true;
        b.parryStunDuration = 1.65;
        b.stateTimer = 0.52 * speedScale;
      } else if (chosen === 'investida_sombria') {
        b.parrable = true;
        b.parryStunDuration = 3.1; // Parry stuns for MUCH longer!
        b.stateTimer = 0.5 * speedScale;
      } else if (chosen === 'chuva_de_cinzas') {
        b.parrable = true;
        b.parryStunDuration = 1.4;
        b.stateTimer = 0.58 * speedScale;
      } else if (chosen === 'ruptura') {
        b.parrable = false; // Must jump!
        b.parryStunDuration = 0;
        b.stateTimer = 0.65 * speedScale;
      } else if (chosen === 'ultimo_suspiro') {
        b.parrable = true;
        b.parryStunDuration = 0.52; // Very short stun on parry!
        b.stateTimer = 0.44;
      }
      soundEngine.playBossTelegraph();
      return;
    }

    // THE FALLEN JUDGMENT
    let pool: BossAttackType[] = ['abyssal_slash', 'abyssal_projectiles', 'celestial_descent'];
    if (b.phase >= 2) {
      pool = ['abyssal_slash', 'celestial_descent', 'abyssal_projectiles', 'judgment_charge'];
    }
    if (dist < 160) {
      pool.push('abyssal_slash');
    } else if (dist > 310) {
      pool.push('abyssal_projectiles', 'celestial_descent');
      if (b.phase >= 2) pool.push('judgment_charge');
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    b.currentAttack = chosen;
    b.state = 'TELEGRAPH';

    const speedScale = b.phase === 1 ? 0.92 : b.phase === 2 ? 0.78 : 0.65;

    if (chosen === 'abyssal_slash') {
      b.parrable = true;
      b.parryStunDuration = 1.75;
      b.stateTimer = 0.48 * speedScale;
    } else if (chosen === 'celestial_descent') {
      b.parrable = false;
      b.parryStunDuration = 0;
      b.descentPhase = 'rising';
      b.descentWarningX = clamp(p.x + p.w / 2, 180, this.room.width - 180);
      b.stateTimer = 0.68 * speedScale;
    } else if (chosen === 'abyssal_projectiles') {
      b.parrable = true;
      b.parryStunDuration = 1.6;
      b.stateTimer = 0.5 * speedScale;
    } else if (chosen === 'judgment_charge') {
      b.parrable = b.phase === 1;
      b.parryStunDuration = 1.75;
      b.targetX = clamp(b.x + b.facing * 760, 150, this.room.width - 150 - b.w);
      b.stateTimer = 0.52 * speedScale;
    }
    soundEngine.playBossTelegraph();
  }

  private beginBossAttackExecution() {
    const b = this.boss;
    b.state = 'ATTACK';

    if (b.currentAttack === 'abyssal_slash' || b.currentAttack === 'corte_ardente') {
      b.stateTimer = 0.25;
      b.vx = b.facing * 240;
      this.slashes.push({
        x: b.x + b.w / 2 + b.facing * 86,
        y: b.y + b.h * 0.5,
        facing: b.facing,
        radius: b.currentAttack === 'corte_ardente' ? 125 : 102,
        angleStart: -1.15,
        angleEnd: 1.15,
        color: b.currentAttack === 'corte_ardente' ? '#fb923c' : '#ef4444',
        glow: b.parrable ? '#38bdf8' : '#dc2626',
        life: 0.26,
        maxLife: 0.26,
        kind: b.currentAttack === 'corte_ardente' ? 'greatsword' : 'boss',
      });
    } else if (b.currentAttack === 'celestial_descent') {
      b.x = b.descentWarningX - b.w / 2;
      b.descentPhase = 'crashing';
      b.vy = 1280;
      b.vx = 0;
      b.stateTimer = 0.65;
    } else if (b.currentAttack === 'abyssal_projectiles') {
      b.stateTimer = 0.38;
      this.fireBossProjectiles();
    } else if (b.currentAttack === 'judgment_charge') {
      b.stateTimer = 0.46;
      b.vx = b.facing * (b.phase === 3 ? 840 : 690);
    } else if (b.currentAttack === 'investida_sombria') {
      b.stateTimer = 0.34;
      b.vx = b.facing * (b.phase === 3 ? 880 : 760);
      this.slashes.push({
        x: b.x + b.w / 2 + b.facing * 85,
        y: b.y + b.h * 0.5,
        facing: b.facing,
        radius: 118,
        angleStart: -0.9,
        angleEnd: 0.9,
        color: '#f97316',
        glow: '#38bdf8',
        life: 0.24,
        maxLife: 0.24,
        kind: 'greatsword',
      });
    } else if (b.currentAttack === 'chuva_de_cinzas') {
      b.stateTimer = 0.55;
      this.spawnAshRainProjectiles();
    } else if (b.currentAttack === 'ruptura') {
      b.stateTimer = 0.38;
      soundEngine.playBossImpact();
      this.shakeTimer = 0.42;
      this.shakeIntensity = 10;
      this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h, 30, '#f97316', 320, 'spark');
      this.slashes.push({
        x: b.x + b.w / 2,
        y: b.y + b.h - 6,
        facing: 1,
        radius: 165,
        angleStart: Math.PI,
        angleEnd: Math.PI * 2,
        color: '#f97316',
        glow: '#ef4444',
        life: 0.32,
        maxLife: 0.32,
        kind: 'shockwave',
      });
      // Spawn low ground fire waves moving left and right along the floor! Player MUST jump!
      for (const dir of [-1, 1] as const) {
        const waveSpeed = b.phase === 3 ? 520 : b.phase === 2 ? 450 : 390;
        this.projectiles.push({
          id: this.uid('rupture'),
          x: b.x + b.w / 2 + dir * 40,
          y: 782, // Hugs floor (floor at 800, height 34 -> top at 765)
          vx: dir * waveSpeed,
          vy: 0,
          radius: 17,
          w: 42,
          h: 34,
          damage: 28,
          parrable: false,
          fromBoss: true,
          color: '#f97316',
          life: 3.4,
          kind: 'fire_wave',
        });
      }
    } else if (b.currentAttack === 'ultimo_suspiro') {
      b.comboStep = 0;
      this.startUltimoSuspiroStep();
    }
  }

  private startUltimoSuspiroStep() {
    const b = this.boss;
    const p = this.player;
    b.facing = p.x + p.w / 2 >= b.x + b.w / 2 ? 1 : -1;
    b.hasHitCurrentSwing = false;
    b.stateTimer = 0.26;
    b.vx = b.facing * (b.comboStep % 2 === 0 ? 840 : 310);
    soundEngine.playAttack(b.comboStep, true);
    this.slashes.push({
      x: b.x + b.w / 2 + b.facing * 90,
      y: b.y + b.h * 0.5,
      facing: b.facing,
      radius: 122,
      angleStart: -1.1,
      angleEnd: 1.1,
      color: '#ef4444',
      glow: '#38bdf8',
      life: 0.22,
      maxLife: 0.22,
      kind: 'greatsword',
    });
  }

  private spawnAshRainProjectiles() {
    const b = this.boss;
    const pCx = this.player.x + this.player.w / 2;
    const count = b.phase === 1 ? 6 : b.phase === 2 ? 8 : 11;
    const spreadSpan = 1550;
    for (let i = 0; i < count; i++) {
      const targetX = clamp(
        pCx - spreadSpan / 2 + (spreadSpan / Math.max(1, count - 1)) * i + (Math.random() - 0.5) * 90,
        120,
        this.room.width - 120
      );
      const speedY = (b.phase === 3 ? 430 : 350) + Math.random() * 80;
      this.projectiles.push({
        id: this.uid('ash'),
        x: targetX,
        y: 62,
        vx: (Math.random() - 0.5) * 35,
        vy: speedY,
        radius: 10,
        damage: 22,
        parrable: true,
        fromBoss: true,
        color: b.phase === 3 ? '#ef4444' : '#fb923c',
        life: 3.0,
        kind: 'ash_rain',
      });
    }
  }

  private fireBossProjectiles() {
    const b = this.boss;
    const p = this.player;
    const ox = b.x + b.w / 2;
    const oy = b.y + b.h * 0.35;
    const baseAngle = Math.atan2(p.y + p.h / 2 - oy, p.x + p.w / 2 - ox);
    const count = b.phase === 1 ? 4 : b.phase === 2 ? 6 : 7;
    const spread = b.phase === 3 ? 0.21 : 0.23;
    const speed = b.phase === 3 ? 485 : b.phase === 2 ? 435 : 390;

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      const ang = baseAngle + offset;
      this.projectiles.push({
        id: this.uid('bproj'),
        x: ox,
        y: oy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        radius: 9,
        damage: 20,
        parrable: true,
        fromBoss: true,
        color: b.phase === 3 ? '#ef4444' : b.phase === 2 ? '#a855f7' : '#f59e0b',
        life: 3.2,
        kind: 'orb',
      });
    }
  }

  private updateBossAttackExecution(dt: number) {
    const b = this.boss;
    b.stateTimer -= dt;

    if (b.currentAttack === 'abyssal_slash' || b.currentAttack === 'corte_ardente') {
      const reach = b.currentAttack === 'corte_ardente' ? 162 : 134;
      if (!b.hasHitCurrentSwing && b.stateTimer < 0.2 && b.stateTimer > 0.04) {
        const atkRect: Rect = {
          x: b.facing === 1 ? b.x + b.w * 0.3 : b.x - (reach - 18),
          y: b.y + 12,
          w: reach,
          h: b.h - 14,
        };
        if (rectsOverlap(atkRect, this.player)) {
          b.hasHitCurrentSwing = true;
          this.tryHitPlayer(b.phase === 3 ? 32 : 28, b.x + b.w / 2, b.parrable, undefined, true);
        }
      }
      if (b.stateTimer <= 0) {
        this.enterBossRecovery();
      }
    } else if (b.currentAttack === 'investida_sombria') {
      if (Math.random() < 0.85) {
        this.particles.push({
          x: b.x + b.w / 2,
          y: b.y + Math.random() * b.h,
          vx: -b.facing * 120,
          vy: (Math.random() - 0.5) * 40,
          size: 5,
          color: '#f97316',
          alpha: 0.9,
          life: 0.24,
          maxLife: 0.24,
          shape: 'spark',
        });
      }
      const dashSwordRect: Rect = {
        x: b.facing === 1 ? b.x + 10 : b.x - 85,
        y: b.y + 18,
        w: b.w + 75,
        h: b.h - 22,
      };
      if (!b.hasHitCurrentSwing && rectsOverlap(dashSwordRect, this.player)) {
        b.hasHitCurrentSwing = true;
        this.tryHitPlayer(30, b.x + b.w / 2, true, undefined, true);
      }
      if (b.x <= 135 || b.x + b.w >= this.room.width - 135 || b.stateTimer <= 0) {
        b.vx = 0;
        this.enterBossRecovery();
      }
    } else if (b.currentAttack === 'ultimo_suspiro') {
      const slashRect: Rect = {
        x: b.facing === 1 ? b.x + 10 : b.x - 95,
        y: b.y + 12,
        w: b.w + 85,
        h: b.h - 16,
      };
      if (!b.hasHitCurrentSwing && rectsOverlap(slashRect, this.player)) {
        b.hasHitCurrentSwing = true;
        this.tryHitPlayer(26, b.x + b.w / 2, true, undefined, true);
      }
      if (b.x <= 125 || b.x + b.w >= this.room.width - 125) {
        b.vx = 0;
      }
      if (b.stateTimer <= 0) {
        b.comboStep += 1;
        if (b.comboStep < 3) {
          this.startUltimoSuspiroStep();
        } else {
          b.vx = 0;
          this.enterBossRecovery();
        }
      }
    } else if (b.currentAttack === 'chuva_de_cinzas' || b.currentAttack === 'ruptura' || b.currentAttack === 'abyssal_projectiles') {
      if (b.stateTimer <= 0) {
        this.enterBossRecovery();
      }
    } else if (b.currentAttack === 'celestial_descent') {
      if (b.grounded && b.descentPhase === 'crashing') {
        b.descentPhase = 'impact';
        soundEngine.playBossImpact();
        this.shakeTimer = 0.36;
        this.shakeIntensity = 9;
        this.slashes.push({
          x: b.x + b.w / 2,
          y: b.y + b.h - 8,
          facing: 1,
          radius: 150,
          angleStart: Math.PI,
          angleEnd: Math.PI * 2,
          color: '#ef4444',
          glow: b.phase === 3 ? '#ef4444' : '#fbbf24',
          life: 0.3,
          maxLife: 0.3,
          kind: 'shockwave',
        });
        this.spawnStyledBurst(b.x + b.w / 2, b.y + b.h, 28, b.phase === 3 ? '#ef4444' : '#a855f7', 300, 'spark');
        const impactRect: Rect = {
          x: b.x - 85,
          y: b.y + b.h - 60,
          w: b.w + 170,
          h: 64,
        };
        if (!b.hasHitCurrentSwing && rectsOverlap(impactRect, this.player)) {
          b.hasHitCurrentSwing = true;
          this.tryHitPlayer(32, b.x + b.w / 2, false, undefined, true);
        }
        b.stateTimer = 0.12;
      } else if (b.stateTimer <= 0) {
        this.enterBossRecovery();
      }
    } else if (b.currentAttack === 'judgment_charge') {
      if (Math.random() < 0.75) {
        this.particles.push({
          x: b.x + b.w / 2,
          y: b.y + Math.random() * b.h,
          vx: -b.facing * 110,
          vy: (Math.random() - 0.5) * 45,
          size: 5,
          color: b.phase === 3 ? '#ef4444' : '#a855f7',
          alpha: 0.9,
          life: 0.25,
          maxLife: 0.25,
          shape: 'circle',
        });
      }
      if (!b.hasHitCurrentSwing && rectsOverlap(b, this.player)) {
        b.hasHitCurrentSwing = true;
        this.tryHitPlayer(28, b.x + b.w / 2, b.parrable, undefined, true);
      }
      if (b.x <= 135 || b.x + b.w >= this.room.width - 135 || b.stateTimer <= 0) {
        b.vx = 0;
        this.enterBossRecovery();
      }
    }
  }

  private enterBossRecovery() {
    const b = this.boss;
    b.state = 'RECOVERY';
    b.vx = 0;
    if (b.phase === 1) {
      b.stateTimer = 0.54;
      b.attackCooldown = 0.72;
    } else if (b.phase === 2) {
      b.stateTimer = 0.36;
      b.attackCooldown = 0.45;
    } else {
      b.stateTimer = 0.22;
      b.attackCooldown = 0.26;
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      if (pr.life <= 0 || pr.x < 0 || pr.x > this.room.width || pr.y < 0 || pr.y > this.room.height) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const prW = pr.w ?? pr.radius * 2;
      const prH = pr.h ?? pr.radius * 2;
      const prRect: Rect = {
        x: pr.x - prW / 2,
        y: pr.y - prH / 2,
        w: prW,
        h: prH,
      };

      // Fire waves travel along the floor (only collide with outer room walls, pass under platforms!)
      // Portal rain and ash rain ignore ceiling, but STOP on stone platforms so sheltering underneath works!
      let hitWall = false;
      for (const plat of this.room.platforms) {
        if (pr.kind === 'fire_wave' && plat.kind !== 'wall') continue;
        if ((pr.kind === 'ash_rain' || pr.kind === 'portal_rain') && plat.kind === 'ceiling') continue;
        if (rectsOverlap(prRect, plat)) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        this.spawnStyledBurst(
          pr.x,
          pr.y,
          pr.kind === 'portal_rain' ? 4 : 6,
          pr.color,
          pr.kind === 'portal_rain' ? 90 : 110,
          'spark'
        );
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.fromPlayer) {
        let hitSomething = false;
        for (const e of this.enemiesByRoom[this.roomId]) {
          if (e.state !== 'DEAD' && rectsOverlap(prRect, e)) {
            this.damageEnemy(e, pr.damage, Math.sign(pr.vx) * 280, -110);
            if (e.health > 0) {
              e.state = 'STAGGERED';
              e.staggerTimer = 1.4;
              this.addFloatingText(e.x + e.w / 2, e.y - 26, 'TIRO CRÍTICO!', '#ef4444');
            }
            this.hitstopTimer = 0.05;
            this.spawnStyledBurst(pr.x, pr.y, 16, '#ef4444', 240, 'spark');
            this.projectiles.splice(i, 1);
            hitSomething = true;
            break;
          }
        }
        if (!hitSomething) {
          for (let si = this.bossStructures.length - 1; si >= 0; si--) {
            if (rectsOverlap(prRect, this.bossStructures[si])) {
              this.damageBossStructure(this.bossStructures[si], pr.damage);
              this.spawnStyledBurst(pr.x, pr.y, 14, '#fef08a', 220, 'spark');
              this.projectiles.splice(i, 1);
              hitSomething = true;
              break;
            }
          }
        }
        if (
          !hitSomething &&
          this.room.bossId &&
          this.boss.active &&
          !this.boss.defeated &&
          this.boss.state !== 'INTRO' &&
          this.boss.state !== 'PHASE_TRANSITION' &&
          !this.isBossInOrbSequence() &&
          rectsOverlap(prRect, this.boss)
        ) {
          this.damageBoss(pr.damage);
          this.hitstopTimer = 0.055;
          this.shakeTimer = 0.22;
          this.shakeIntensity = 7;
          this.spawnStyledBurst(pr.x, pr.y, 18, '#fef08a', 260, 'spark');
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (pr.reflected) {
        let hitReflected = false;
        for (const e of this.enemiesByRoom[this.roomId]) {
          if (e.state !== 'DEAD' && rectsOverlap(prRect, e)) {
            this.damageEnemy(e, pr.damage * 2, Math.sign(pr.vx) * 200, -90);
            this.projectiles.splice(i, 1);
            hitReflected = true;
            break;
          }
        }
        if (!hitReflected) {
          for (let si = this.bossStructures.length - 1; si >= 0; si--) {
            if (rectsOverlap(prRect, this.bossStructures[si])) {
              this.damageBossStructure(this.bossStructures[si], pr.damage * 2);
              this.projectiles.splice(i, 1);
              hitReflected = true;
              break;
            }
          }
        }
        if (
          !hitReflected &&
          this.room.bossId &&
          this.boss.active &&
          !this.boss.defeated &&
          !this.isBossInOrbSequence() &&
          rectsOverlap(prRect, this.boss)
        ) {
          this.damageBoss(pr.damage * 2);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (rectsOverlap(prRect, this.player)) {
        const p = this.player;
        if (p.state === 'PARRYING' && p.parryTimer > 0 && pr.parrable) {
          pr.reflected = true;
          pr.vx = -pr.vx * 1.45;
          pr.vy = -pr.vy * 1.45;
          pr.color = '#fde047';
          pr.life = 2.0;
          p.parrySuccessFlash = 0.28;
          p.essence = Math.min(p.maxEssence, p.essence + 15);
          soundEngine.playParrySuccess();
          this.addFloatingText(p.x + p.w / 2, p.y - 18, 'REFLETIDO!', '#fde047');
          this.spawnStyledBurst(pr.x, pr.y, 12, '#fde047', 200, 'spark');
        } else {
          const hit = this.tryHitPlayer(pr.damage, pr.x, pr.parrable);
          if (hit) {
            this.projectiles.splice(i, 1);
          }
        }
      }
    }
  }

  private updateEffects(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.gravity) pt.vy += pt.gravity * dt;
      pt.alpha = Math.max(0, pt.life / pt.maxLife);
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].life -= dt;
      if (this.slashes[i].life <= 0) this.slashes.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  private updateCharacterAttachments(dt: number) {
    const p = this.player;
    const targetAng = clamp(-p.vx * 0.0028, -0.75, 0.75);
    const spring = 45;
    const damp = 6.5;
    const accelL = (targetAng - p.shackleAngleL) * spring - p.shackleVelL * damp;
    p.shackleVelL += accelL * dt;
    p.shackleAngleL += p.shackleVelL * dt;

    const swingOffset = p.state === 'RUNNING' ? Math.sin(p.animTime * 14) * 0.35 : 0;
    const accelR = (targetAng + swingOffset - p.shackleAngleR) * spring - p.shackleVelR * damp;
    p.shackleVelR += accelR * dt;
    p.shackleAngleR += p.shackleVelR * dt;

    const headX = p.x + p.w / 2 - p.facing * 4;
    const headY = p.y + 11;
    p.hairNodes[0] = { x: headX, y: headY };
    for (let i = 1; i < p.hairNodes.length; i++) {
      const prev = p.hairNodes[i - 1];
      const cur = p.hairNodes[i];
      const wave = Math.sin(p.animTime * 5 + i * 0.7) * 18;
      const targetX = prev.x - p.facing * 5.5 + wave * dt;
      const targetY = prev.y + 5.5 - clamp(p.vy * 0.008, -3, 3);
      cur.x += (targetX - cur.x) * Math.min(1, dt * 16);
      cur.y += (targetY - cur.y) * Math.min(1, dt * 16);
    }
  }

  private moveAndCollidePlayer(dt: number) {
    this.moveAndCollideEntity(this.player, dt, true);
  }

  private moveAndCollideEntity(
    ent: { x: number; y: number; w: number; h: number; vx: number; vy: number; grounded: boolean },
    dt: number,
    collideWithPlatforms: boolean
  ) {
    const platforms: Platform[] = this.room.platforms;

    ent.x += ent.vx * dt;
    if (collideWithPlatforms) {
      for (const plat of platforms) {
        if (plat.kind === 'oneway') continue;
        if (rectsOverlap(ent, plat)) {
          if (ent.vx > 0) {
            ent.x = plat.x - ent.w;
            ent.vx = 0;
          } else if (ent.vx < 0) {
            ent.x = plat.x + plat.w;
            ent.vx = 0;
          }
        }
      }
    }
    ent.x = clamp(ent.x, 48, this.room.width - 48 - ent.w);

    ent.y += ent.vy * dt;
    ent.grounded = false;
    if (collideWithPlatforms) {
      for (const plat of platforms) {
        if (rectsOverlap(ent, plat)) {
          if (ent.vy > 0) {
            ent.y = plat.y - ent.h;
            ent.vy = 0;
            ent.grounded = true;
          } else if (ent.vy < 0) {
            ent.y = plat.y + plat.h;
            ent.vy = 0;
          }
        }
      }
    }
    ent.y = clamp(ent.y, 44, this.room.height - ent.h);
  }

  private approach(val: number, target: number, delta: number): number {
    if (val < target) return Math.min(target, val + delta);
    if (val > target) return Math.max(target, val - delta);
    return target;
  }

  private spawnStyledBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number,
    shape: Particle['shape']
  ) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      const life = shape === 'smoke' ? 0.4 + Math.random() * 0.3 : 0.25 + Math.random() * 0.32;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (shape === 'smoke' ? 25 : 35),
        size: shape === 'smoke' ? 5 + Math.random() * 4 : 2.5 + Math.random() * 3,
        color,
        alpha: 0.9,
        life,
        maxLife: life,
        gravity: shape === 'smoke' ? -40 : 320,
        shape,
      });
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, large = false) {
    this.floatingTexts.push({
      x,
      y,
      vy: -38,
      text,
      color,
      life: large ? 1.25 : 0.75,
      maxLife: large ? 1.25 : 0.75,
      large,
    });
  }

  private snapCamera() {
    this.cameraX = clamp(this.player.x - 420, 0, Math.max(0, this.room.width - 1100));
    this.cameraY = clamp(this.player.y - 450, 0, Math.max(0, this.room.height - 650));
  }

  private updateCamera(dt: number, vw: number, vh: number) {
    this.cameraZoom += (this.targetCameraZoom - this.cameraZoom) * Math.min(1, dt * 4.5);

    if (this.cameraFocusTarget) {
      const targetX = this.cameraFocusTarget.x - vw / 2;
      const targetY = this.cameraFocusTarget.y - vh / 2;
      this.cameraX += (targetX - this.cameraX) * Math.min(1, dt * 8.0);
      this.cameraY += (targetY - this.cameraY) * Math.min(1, dt * 8.0);
      return;
    }

    const targetX = clamp(
      this.player.x + this.player.w / 2 - vw / 2 + this.player.facing * 55,
      0,
      Math.max(0, this.room.width - vw)
    );
    const targetY = clamp(
      this.player.y + this.player.h / 2 - vh * 0.56,
      0,
      Math.max(0, this.room.height - vh)
    );
    this.cameraX += (targetX - this.cameraX) * Math.min(1, dt * 8.5);
    this.cameraY += (targetY - this.cameraY) * Math.min(1, dt * 7);
  }

  public getHudSnapshot(): HudSnapshot {
    const door = this.getNearbyDoorway();
    const doorLocked = Boolean(door?.lockedByBoss && this.room.bossId && !this.boss.defeated);
    const room2Enemies = this.enemiesByRoom.combat_arena;
    const swarmEnemies = this.enemiesByRoom.swarm_crypt;
    const colossusEnemies = this.enemiesByRoom.colossus_hall;
    const healProgress =
      this.player.state === 'HEALING'
        ? clamp(1 - this.player.healTimer / this.config.stats.healDuration, 0, 1)
        : 0;

    return {
      roomId: this.roomId,
      roomName: this.room.name,
      roomSubtitle: this.room.subtitle,
      characterId: this.characterId,
      characterName: this.config.name,
      health: Math.ceil(this.player.health),
      maxHealth: this.player.maxHealth,
      essence: Math.floor(this.player.essence),
      maxEssence: this.player.maxEssence,
      healCost: this.config.stats.healCost,
      playerState: this.player.state,
      dashCooldown: this.player.dashCooldownTimer,
      dashCooldownMax: this.config.stats.dashCooldown,
      parryCooldown: this.player.parryCooldownTimer,
      healProgress,
      abyssalTeleportCooldown: this.player.abyssalTeleportCooldown,
      abyssalEmpoweredTimer: this.player.abyssalEmpoweredTimer,
      rage: Math.round(this.player.rage),
      maxRage: this.player.maxRage,
      revolverReady:
        this.characterId === 'abyssal' &&
        this.player.rage >= this.player.maxRage &&
        this.player.revolverState === 'NONE',
      revolverActive: this.player.revolverPoseTimer > 0,
      comboCount: this.player.comboCount,
      ultimateCharge: Math.round(this.player.ultimateCharge),
      maxUltimateCharge: this.player.maxUltimateCharge,
      celestialReviveAvailable: this.player.celestialReviveAvailable,
      canDoubleJump: this.player.canDoubleJump,
      nearbyDoorLabel: door ? door.label : null,
      nearbyDoorLocked: doorLocked,
      room2EnemiesAlive: room2Enemies.filter((e) => e.state !== 'DEAD').length,
      room2EnemiesTotal: ROOMS.combat_arena.enemySpawns.length,
      swarmCryptEnemiesAlive: swarmEnemies.filter((e) => e.state !== 'DEAD').length,
      swarmCryptEnemiesTotal: ROOMS.swarm_crypt.enemySpawns.length,
      colossusHallEnemiesAlive: colossusEnemies.filter((e) => e.state !== 'DEAD').length,
      colossusHallEnemiesTotal: ROOMS.colossus_hall.enemySpawns.length,
      orbCountdown:
        this.ignisOrb && this.ignisOrb.phase === 'CHARGING' ? this.ignisOrb.chargeTime : null,
      orbPhase: this.ignisOrb ? this.ignisOrb.phase : null,
      structuresRemaining: this.bossStructures.length,
      structuresTotal: this.ignisOrb ? 4 : 0,
      boss: {
        id: this.boss.id,
        visible: Boolean(this.room.bossId && (this.boss.active || this.boss.defeated)),
        name: this.boss.name,
        title: this.boss.title,
        health: Math.ceil(this.boss.health),
        displayHealth: this.boss.displayHealth,
        maxHealth: this.boss.maxHealth,
        phase: this.boss.phase,
        state: this.boss.state,
        defeated: this.boss.defeated,
      },
      bossIntroBanner: {
        active: Boolean(this.room.bossId && this.boss.state === 'INTRO'),
        name: this.boss.name,
        title: this.boss.title,
        progress: this.boss.introProgress,
      },
      fallenJudgmentDefeated: this.bossesById.fallen_judgment.defeated,
      ashenSovereignDefeated: this.bossesById.ashen_sovereign.defeated,
      victoryBannerTimer: this.victoryBannerTimer,
      victoryBossName: this.victoryBossName,
      isDead: this.player.state === 'DEAD',
    };
  }

  public getDebugSnapshot(): DebugSnapshot {
    const p = this.player;
    const b = this.boss;
    const distToBoss = Math.hypot(b.x + b.w / 2 - (p.x + p.w / 2), b.y + b.h / 2 - (p.y + p.h / 2));
    return {
      fps: Math.round(this.fps),
      roomId: this.roomId,
      vx: Math.round(p.vx * 10) / 10,
      vy: Math.round(p.vy * 10) / 10,
      state: p.state,
      x: Math.round(p.x),
      y: Math.round(p.y),
      grounded: p.grounded,
      dashing: p.state === 'DASHING',
      dashCooldown: Number(p.dashCooldownTimer.toFixed(2)),
      health: Math.ceil(p.health),
      essence: Math.floor(p.essence),
      parryWindowActive: p.state === 'PARRYING' && p.parryTimer > 0,
      invulnActive: p.dashInvulnTimer > 0 || p.invulnTimer > 0,
      boss: {
        id: b.id,
        active: b.active,
        health: Math.ceil(b.health),
        maxHealth: b.maxHealth,
        phase: b.phase,
        state: b.state,
        currentAttack: b.currentAttack ?? 'nenhum',
        attackCooldown: Number(b.attackCooldown.toFixed(2)),
        targetX: Math.round(b.targetX),
        targetY: Math.round(b.targetY),
        distanceToPlayer: Math.round(distToBoss),
        staggered: b.state === 'STAGGERED',
        aiPaused: b.aiPaused,
      },
    };
  }
}
