import { GameEngine } from './engine';
import {
  BossEntity,
  BossPortal,
  BossStructure,
  CerberusSummon,
  CharacterId,
  EnemyEntity,
  GiantBibleSummon,
  IgnisOrbState,
  Particle,
  Platform,
  PlayerState,
  SummonedSword,
} from './types';

export interface CharacterRenderParams {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  state: PlayerState;
  animTime: number;
  vx: number;
  vy: number;
  shackleAngleL: number;
  shackleAngleR: number;
  hairNodes: { x: number; y: number }[];
  alpha?: number;
  parryFlash?: number;
  parryFailFlash?: number;
  attackProgress?: number;
  comboStage?: number;
  healProgress?: number;
  empowered?: boolean;
  reviveFlash?: number;
  wingFlapTimer?: number;
  revolverPoseTimer?: number;
  revolverDrawing?: boolean;
}

export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  characterId: CharacterId,
  p: CharacterRenderParams
) {
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 1;

  const cx = p.x + p.w / 2;
  const bottomY = p.y + p.h;
  const runBob =
    p.state === 'RUNNING'
      ? Math.abs(Math.sin(p.animTime * 14)) * -3.5
      : p.state === 'DEAD'
      ? 0
      : Math.sin(p.animTime * 2.6) * 1.4;
  const lean =
    p.state === 'DEAD'
      ? 0
      : p.state === 'DASHING'
      ? p.facing * 0.34
      : p.state === 'HURT'
      ? -p.facing * 0.24
      : Math.max(-0.22, Math.min(0.22, (p.vx / 320) * 0.16));

  // Ground contact shadow beneath feet
  if (p.state !== 'DEAD') {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx, bottomY - 1, 16, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Celestial Revive Pillar
  if (p.reviveFlash && p.reviveFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.75, p.reviveFlash);
    const beamGrad = ctx.createLinearGradient(cx - 34, 0, cx + 34, 0);
    beamGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
    beamGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.52)');
    beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(cx - 34, p.y - 420, 68, p.h + 420);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(cx - 7, p.y - 420, 14, p.h + 420);
    ctx.restore();
  }

  // Abyssal Empowered Teleport Aura
  if (characterId === 'abyssal' && p.empowered) {
    ctx.save();
    const auraR = 30 + Math.sin(p.animTime * 12) * 3;
    const auraGrad = ctx.createRadialGradient(cx, p.y + p.h * 0.5, 6, cx, p.y + p.h * 0.5, auraR);
    auraGrad.addColorStop(0, 'rgba(220, 38, 38, 0.22)');
    auraGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, p.y + p.h * 0.5, auraR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(cx, p.y + p.h * 0.5, auraR - 2, p.animTime * 4, p.animTime * 4 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Parry Rune Ward (properly oriented for BOTH facing === 1 and facing === -1 + full circle protection ring)
  if (p.state === 'PARRYING') {
    ctx.save();
    const parryY = p.y + p.h * 0.46;
    const wardColor = p.parryFlash && p.parryFlash > 0 ? '#fde047' : '#38bdf8';
    const arcCenter = p.facing === 1 ? 0 : Math.PI;

    // Omnidirectional protective aura
    const wardGrad = ctx.createRadialGradient(cx, parryY, 6, cx, parryY, 34);
    wardGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
    wardGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.22)');
    wardGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = wardGrad;
    ctx.beginPath();
    ctx.arc(cx, parryY, 34, 0, Math.PI * 2);
    ctx.fill();

    // Subtle full-circle deflection ring (shows omnidirectional parry works from left or right)
    ctx.strokeStyle = p.parryFlash && p.parryFlash > 0 ? 'rgba(253, 224, 71, 0.55)' : 'rgba(56, 189, 248, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, parryY, 27, 0, Math.PI * 2);
    ctx.stroke();

    // Crisp directional rune crest on faced side (correctly mirrored for left & right!)
    ctx.strokeStyle = wardColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + p.facing * 8, parryY, 29, arcCenter - 1.15, arcCenter + 1.15);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx + p.facing * 10, parryY, 24, arcCenter - 0.8, arcCenter + 0.8);
    ctx.stroke();
    ctx.restore();
  }

  if (p.parryFailFlash && p.parryFailFlash > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(148, 163, 184, ${Math.min(1, p.parryFailFlash * 4)})`;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, p.y + p.h * 0.46, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Healing channel circle & rising runes
  if (p.state === 'HEALING') {
    const prog = p.healProgress ?? 0.5;
    ctx.save();
    const healColor = characterId === 'celestial' ? '#fde047' : '#ef4444';
    const auraGrad = ctx.createLinearGradient(cx, bottomY, cx, p.y - 18);
    auraGrad.addColorStop(0, characterId === 'celestial' ? 'rgba(253,224,71,0.28)' : 'rgba(239,68,68,0.24)');
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(cx - 18, p.y - 18, 36, p.h + 18);

    ctx.strokeStyle = healColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY - 2, 24, 7, 0, 0, Math.PI * 2 * prog);
    ctx.stroke();
    ctx.restore();
  }

  if (characterId === 'abyssal') {
    drawAbyssalBody(ctx, p, cx, bottomY, runBob, lean);
  } else {
    drawCelestialBody(ctx, p, cx, bottomY, runBob, lean);
  }

  ctx.restore();
}

function drawAbyssalBody(
  ctx: CanvasRenderingContext2D,
  p: CharacterRenderParams,
  cx: number,
  bottomY: number,
  runBob: number,
  lean: number
) {
  const f = p.facing;
  const isDead = p.state === 'DEAD';
  const isHurt = p.state === 'HURT';
  const isRunning = p.state === 'RUNNING';
  const isAir = p.state === 'JUMPING' || p.state === 'FALLING';
  const prog = p.attackProgress ?? 0;

  // Compute anticipation vs strike curve for attacks
  let atkSweep = 0;
  let atkWindup = 0;
  if (p.state === 'ATTACKING') {
    if (prog < 0.25) {
      atkWindup = prog / 0.25; // Coiling back
    } else if (prog < 0.65) {
      atkSweep = Math.sin(((prog - 0.25) / 0.4) * Math.PI); // Explosive whip
    } else {
      atkSweep = (1 - (prog - 0.65) / 0.35) * 0.25; // Follow-through
    }
  }

  ctx.save();
  ctx.translate(cx, bottomY);
  if (isDead) {
    ctx.translate(0, -10);
    ctx.rotate(-f * 1.32);
  } else {
    ctx.rotate(lean + atkSweep * f * 0.14 - atkWindup * f * 0.16);
  }

  const hipY = isDead ? -14 : -28 + runBob;
  const shoulderY = isDead ? -32 : -51 + runBob;

  // 1. Fractured Ancient Halo behind head
  ctx.save();
  ctx.translate(-f * 2, shoulderY - 12);
  ctx.rotate(p.animTime * 0.45);
  ctx.strokeStyle = isHurt ? '#ffffff' : '#7f1d1d';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0.25, Math.PI * 1.28);
  ctx.stroke();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 15, Math.PI * 1.48, Math.PI * 1.98);
  ctx.stroke();
  // Floating halo shard
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(Math.cos(2.3) * 18, Math.sin(2.3) * 18, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Tattered Obsidian/Crimson Mantle (layered flowing cloak)
  const cloakWave = Math.sin(p.animTime * (isRunning ? 14 : 3.5)) * (isRunning ? 5 : 2);
  const cloakLag = -f * (isRunning ? 18 : 10) - p.vx * 0.028;
  ctx.fillStyle = isHurt ? '#450a0a' : '#151019';
  ctx.strokeStyle = '#581c28';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-f * 3, shoulderY + 1);
  ctx.quadraticCurveTo(cloakLag * 0.7, shoulderY + 18, cloakLag - f * 8, hipY + 14 + cloakWave);
  ctx.lineTo(cloakLag - f * 2, hipY + 21 - cloakWave * 0.5);
  ctx.lineTo(cloakLag + f * 6, hipY + 15 + cloakWave * 0.5);
  ctx.quadraticCurveTo(f * 3, shoulderY + 16, f * 3, shoulderY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Articulated Skeletal Legs (Hip -> Knee -> Ankle)
  const stridePhase = isRunning ? p.animTime * 13 : 0;
  const kneeL = isAir
    ? { x: -f * 4, y: hipY + 12 }
    : isRunning
    ? { x: Math.sin(stridePhase) * 9 + f * 3, y: hipY + 13 - Math.max(0, Math.cos(stridePhase)) * 4 }
    : { x: -4, y: hipY + 14 };
  const footL = isAir
    ? { x: -f * 7, y: hipY + 22 }
    : isRunning
    ? { x: Math.sin(stridePhase) * 12, y: Math.min(0, -Math.max(0, Math.sin(stridePhase + 0.5)) * 6) }
    : { x: -6, y: 0 };

  const kneeR = isAir
    ? { x: f * 6, y: hipY + 10 }
    : isRunning
    ? { x: Math.sin(stridePhase + Math.PI) * 9 + f * 3, y: hipY + 13 - Math.max(0, Math.cos(stridePhase + Math.PI)) * 4 }
    : { x: 5, y: hipY + 14 };
  const footR = isAir
    ? { x: f * 4, y: hipY + 20 }
    : isRunning
    ? { x: Math.sin(stridePhase + Math.PI) * 12, y: Math.min(0, -Math.max(0, Math.sin(stridePhase + Math.PI + 0.5)) * 6) }
    : { x: 6, y: 0 };

  // Back leg
  drawBoneLimb(ctx, -2, hipY, kneeL.x, kneeL.y, footL.x, footL.y, '#1f1a24', '#9e958a');
  // Front leg
  drawBoneLimb(ctx, 2, hipY, kneeR.x, kneeR.y, footR.x, footR.y, '#2b2430', '#d6cdc0');

  // Heavy Leg Shackles & Iron Balls
  drawLegShackleBall(ctx, footL.x, footL.y - 3, p.shackleAngleL);
  drawLegShackleBall(ctx, footR.x, footR.y - 3, p.shackleAngleR);

  // 4. Gaunt Skeletal Torso & Ribcage
  ctx.fillStyle = isHurt ? '#ffffff' : '#1b1620';
  ctx.beginPath();
  ctx.moveTo(-6, shoulderY);
  ctx.lineTo(6, shoulderY);
  ctx.lineTo(3.5, hipY + 2);
  ctx.lineTo(-3.5, hipY + 2);
  ctx.closePath();
  ctx.fill();

  // Pelvis & Spine
  ctx.strokeStyle = isHurt ? '#ffffff' : '#d6cdc0';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, shoulderY + 2);
  ctx.lineTo(0, hipY);
  ctx.stroke();
  for (let r = 0; r < 3; r++) {
    const ry = shoulderY + 5 + r * 4.5;
    const rw = 5.2 - r * 0.7;
    ctx.beginPath();
    ctx.moveTo(-rw, ry);
    ctx.quadraticCurveTo(0, ry + 1.5, rw, ry);
    ctx.stroke();
  }

  // Pauldron armor scraps
  ctx.fillStyle = '#332b38';
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(f * 5, shoulderY + 2, 4.5, 3, f * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5. Articulated Arms & Whip Chains OR Revolver Shot Stance
  const revolverActive = (p.revolverPoseTimer ?? 0) > 0;
  if (revolverActive && !isDead) {
    const recoilLift = p.revolverDrawing ? 0.14 : -Math.max(0, ((p.revolverPoseTimer ?? 0) - 0.34) * 1.4);
    const armAngle = f * recoilLift;
    const gunShoulderX = f * 4;
    const gunShoulderY = shoulderY + 3;
    const handBackX = -f * 8;
    const handBackY = shoulderY + 15;
    drawBoneLimb(ctx, -f * 4, shoulderY + 2, -f * 7, shoulderY + 10, handBackX, handBackY, '#261f29', '#a89f94');
    drawChainWrap(ctx, handBackX, handBackY, -f, 10);

    ctx.save();
    ctx.translate(gunShoulderX, gunShoulderY);
    ctx.rotate(armAngle);
    drawBoneLimb(ctx, 0, 0, f * 9, 1, f * 17, 0, '#140f17', '#e5ddd0');

    // Ornate Dark-Iron Six-Shooter Revolver
    ctx.translate(f * 17, -1);
    // Bone grip
    ctx.fillStyle = '#d6cdc0';
    ctx.strokeStyle = '#09080d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-f * 4, 7.5);
    ctx.lineTo(f * 0.5, 8);
    ctx.lineTo(f * 3, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cylinder + Long Iron Barrel
    ctx.fillStyle = '#3f3f46';
    ctx.strokeStyle = '#09080d';
    ctx.fillRect(f === 1 ? 1 : -17, -4.5, 16, 3.6);
    ctx.strokeRect(f === 1 ? 1 : -17, -4.5, 16, 3.6);
    ctx.fillStyle = '#71717a';
    ctx.fillRect(f === 1 ? 1 : -7, -4, 6, 4.5);
    // Crimson rune sight on barrel
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(f === 1 ? 14 : -16, -5.8, 2.5, 2);

    // Muzzle flash star right after firing
    if (!p.revolverDrawing && (p.revolverPoseTimer ?? 0) > 0.38) {
      const flashAlpha = Math.min(1, ((p.revolverPoseTimer ?? 0) - 0.38) / 0.15);
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      const tipX = f * 18;
      const tipY = -2.8;
      const flashGrad = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, 22);
      flashGrad.addColorStop(0, '#ffffff');
      flashGrad.addColorStop(0.4, '#fde047');
      flashGrad.addColorStop(0.75, 'rgba(239, 68, 68, 0.7)');
      flashGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY - 9);
      ctx.lineTo(tipX + f * 3, tipY - 2);
      ctx.lineTo(tipX + f * 18, tipY);
      ctx.lineTo(tipX + f * 3, tipY + 2);
      ctx.lineTo(tipX, tipY + 9);
      ctx.lineTo(tipX - f * 2, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  } else {
    const reach = atkSweep * (p.comboStage === 2 ? 44 : 30) - atkWindup * 11;
    const elbowFrontX = f * (7 + reach * 0.45);
    const elbowFrontY = shoulderY + 8 - atkSweep * 4;
    const handFrontX = f * (11 + reach);
    const handFrontY = shoulderY + 13 - atkSweep * 7 - atkWindup * 4;

    const handBackX = -f * (9 + atkWindup * 6);
    const handBackY = shoulderY + 16 + (isRunning ? Math.sin(stridePhase) * 4 : 0);

    drawBoneLimb(ctx, -f * 4, shoulderY + 2, -f * 7, shoulderY + 10, handBackX, handBackY, '#261f29', '#a89f94');
    drawBoneLimb(ctx, f * 4, shoulderY + 2, elbowFrontX, elbowFrontY, handFrontX, handFrontY, '#332b38', '#ddd4c8');

    drawChainWrap(ctx, handBackX, handBackY, -f, 11);
    drawChainWrap(
      ctx,
      handFrontX,
      handFrontY,
      f,
      p.state === 'ATTACKING' ? 28 + Math.max(0, reach) : 13
    );
  }

  // 6. Sculpted Goat Skull + Curved Ridged Horns
  ctx.save();
  ctx.translate(f * 2.5, shoulderY - 9);
  ctx.rotate(atkWindup * -f * 0.14 + atkSweep * f * 0.12);

  // Back horn
  ctx.strokeStyle = '#1f1921';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-f * 2, -6);
  ctx.bezierCurveTo(-f * 10, -18, -f * 18, -17, -f * 21, -6);
  ctx.stroke();

  // Front horn with ridge highlight
  ctx.strokeStyle = '#3b313e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(f * 1.5, -6.5);
  ctx.bezierCurveTo(-f * 5, -22, -f * 16, -21, -f * 18, -10);
  ctx.stroke();
  ctx.strokeStyle = '#736576';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(f * 1, -8);
  ctx.bezierCurveTo(-f * 5, -20, -f * 13, -19, -f * 16, -12);
  ctx.stroke();

  // Skull cranium & elongated goat snout
  ctx.fillStyle = isHurt ? '#ffffff' : '#e5ddd0';
  ctx.strokeStyle = '#3b303a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-f * 5.5, -7);
  ctx.quadraticCurveTo(f * 1, -10, f * 6.5, -6);
  ctx.lineTo(f * 12, 0.5);
  ctx.lineTo(f * 9.5, 4.5);
  ctx.lineTo(f * 2, 4.5);
  ctx.lineTo(-f * 4.5, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dark eye socket + glowing crimson iris
  ctx.fillStyle = '#181018';
  ctx.beginPath();
  ctx.ellipse(f * 4.2, -2, 2.7, 1.9, f * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(f * 4.6, -2, 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawBoneLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  outerColor: string,
  boneColor: string
) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outerColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = boneColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawLegShackleBall(ctx: CanvasRenderingContext2D, ax: number, ay: number, angle: number) {
  ctx.save();
  ctx.translate(ax, ay);
  // Ankle cuff
  ctx.fillStyle = '#3f3f46';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.fillRect(-3.5, -2.5, 7, 4.5);
  ctx.strokeRect(-3.5, -2.5, 7, 4.5);

  const len = 13.5;
  const bx = Math.sin(angle) * len;
  const by = Math.cos(angle) * len * 0.45 + 3;
  // Chain links
  ctx.strokeStyle = '#71717a';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([2.5, 2]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);

  // Shaded iron ball
  const ballGrad = ctx.createRadialGradient(bx - 1.5, by + 2.5, 1, bx, by + 4, 5.8);
  ballGrad.addColorStop(0, '#71717a');
  ballGrad.addColorStop(0.6, '#27272a');
  ballGrad.addColorStop(1, '#09090b');
  ctx.fillStyle = ballGrad;
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(bx, by + 4, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawChainWrap(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  dir: number,
  tailLen: number
) {
  ctx.save();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(hx, hy, 3.4, 0, Math.PI * 2);
  ctx.stroke();

  // Crimson-infused whip chain
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([3.5, 2.5]);
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(hx + dir * tailLen * 0.55, hy - 2, hx + dir * tailLen, hy + 4);
  ctx.stroke();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(hx + dir * tailLen * 0.55, hy - 1, hx + dir * tailLen, hy + 4);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCelestialBody(
  ctx: CanvasRenderingContext2D,
  p: CharacterRenderParams,
  cx: number,
  bottomY: number,
  runBob: number,
  lean: number
) {
  const f = p.facing;
  const isDead = p.state === 'DEAD';
  const isHurt = p.state === 'HURT';
  const isRunning = p.state === 'RUNNING';
  const prog = p.attackProgress ?? 0;

  let atkSweep = 0;
  let atkWindup = 0;
  if (p.state === 'ATTACKING') {
    if (prog < 0.22) {
      atkWindup = prog / 0.22;
    } else if (prog < 0.65) {
      atkSweep = Math.sin(((prog - 0.22) / 0.43) * Math.PI);
    }
  }

  ctx.save();

  // 1. Ornate Multi-Ring Sun Halo above head
  if (!isDead) {
    const haloY = p.y - 8 + runBob;
    ctx.save();
    ctx.translate(cx, haloY);
    const pulse = 1 + Math.sin(p.animTime * 4) * 0.06;
    const haloGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * pulse);
    haloGlow.addColorStop(0, 'rgba(253, 224, 71, 0.32)');
    haloGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = haloGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 4.8, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 3.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Small solar points
    for (let i = 0; i < 4; i++) {
      const ang = p.animTime * 2 + (i * Math.PI) / 2;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * 15, Math.sin(ang) * 5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 2. Flowing Multi-Strand Silver Hair
  if (p.hairNodes && p.hairNodes.length > 1 && !isDead) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#94a3b8';
    for (let i = 0; i < p.hairNodes.length - 1; i++) {
      ctx.lineWidth = Math.max(2.5, 9 - i * 1.2);
      ctx.beginPath();
      ctx.moveTo(p.hairNodes[i].x, p.hairNodes[i].y);
      ctx.lineTo(p.hairNodes[i + 1].x, p.hairNodes[i + 1].y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f8fafc';
    for (let i = 0; i < p.hairNodes.length - 1; i++) {
      ctx.lineWidth = Math.max(1.5, 6 - i * 0.9);
      ctx.beginPath();
      ctx.moveTo(p.hairNodes[i].x, p.hairNodes[i].y - 1);
      ctx.lineTo(p.hairNodes[i + 1].x, p.hairNodes[i + 1].y - 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.translate(cx, bottomY);
  if (isDead) {
    ctx.translate(0, -8);
    ctx.rotate(-f * 1.25);
  } else {
    ctx.rotate(lean + atkSweep * f * 0.1 - atkWindup * f * 0.14);
  }

  const sway =
    (isRunning ? Math.sin(p.animTime * 13) * 4.5 : Math.sin(p.animTime * 3) * 1.5) -
    p.vx * 0.025;
  const dressTopY = -40 + runBob;

  // 2b. Angelic Feathered Wings during Double Jump (wingFlapTimer > 0)
  const wingTimer = p.wingFlapTimer ?? 0;
  if (wingTimer > 0 && !isDead) {
    const progWing = Math.min(1, wingTimer / 0.68);
    const wingAlpha = Math.min(1, progWing * 1.55);
    const flapBeat = Math.sin((1 - progWing) * Math.PI * 2.4) * 0.32;
    ctx.save();
    ctx.globalAlpha *= wingAlpha;

    // Soft golden radiance behind wings
    const wingGlow = ctx.createRadialGradient(0, dressTopY + 8, 4, 0, dressTopY + 8, 58);
    wingGlow.addColorStop(0, 'rgba(254, 240, 138, 0.36)');
    wingGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = wingGlow;
    ctx.beginPath();
    ctx.arc(0, dressTopY + 8, 58, 0, Math.PI * 2);
    ctx.fill();

    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(side * 4, dressTopY + 8);
      ctx.rotate(side * (-0.35 + flapBeat));

      // Outer luminous feathered wing silhouette
      const wGrad = ctx.createLinearGradient(0, 0, side * 52, -26);
      wGrad.addColorStop(0, '#ffffff');
      wGrad.addColorStop(0.55, '#fef9c3');
      wGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = wGrad;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * 24, -30, side * 54, -22);
      ctx.lineTo(side * 42, -9);
      ctx.lineTo(side * 50, -3);
      ctx.lineTo(side * 35, 6);
      ctx.lineTo(side * 42, 13);
      ctx.lineTo(side * 24, 16);
      ctx.quadraticCurveTo(side * 10, 14, 0, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner crisp feather ribs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(side * 6, 0);
      ctx.lineTo(side * 40, -14);
      ctx.moveTo(side * 6, 3);
      ctx.lineTo(side * 35, -3);
      ctx.moveTo(side * 5, 6);
      ctx.lineTo(side * 26, 9);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 3. Inner Deep Indigo Shadow Mantle (adds Hollow Knight silhouette depth)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(-f * 5, dressTopY + 2);
  ctx.quadraticCurveTo(-f * 14 + sway * 0.6, -18, -f * 15 + sway, -1);
  ctx.lineTo(f * 11 + sway, -1);
  ctx.lineTo(f * 5, dressTopY + 2);
  ctx.closePath();
  ctx.fill();

  // 4. Sculpted Ivory Cathedral Dress with Pleated Folds
  const dressGrad = ctx.createLinearGradient(-10, dressTopY, 12, 0);
  dressGrad.addColorStop(0, isHurt ? '#ffffff' : '#f8fafc');
  dressGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = dressGrad;
  ctx.beginPath();
  ctx.moveTo(-5, dressTopY);
  ctx.lineTo(5, dressTopY);
  ctx.quadraticCurveTo(11 + sway * 0.4, -18, 13 + sway, -2);
  ctx.lineTo(3 + sway * 0.6, -4);
  ctx.lineTo(0 + sway * 0.5, -1);
  ctx.lineTo(-4 + sway * 0.6, -4);
  ctx.lineTo(-13 + sway, -2);
  ctx.quadraticCurveTo(-10 + sway * 0.4, -18, -5, dressTopY);
  ctx.closePath();
  ctx.fill();

  // Gold filigree trim & sash
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12 + sway, -3);
  ctx.lineTo(12 + sway, -3);
  ctx.moveTo(-4.5, dressTopY + 9);
  ctx.lineTo(4.5, dressTopY + 9);
  ctx.stroke();

  // Flowing golden sash ribbon
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-f * 2, dressTopY + 9);
  ctx.quadraticCurveTo(-f * 8 + sway * 0.5, -15, -f * 11 + sway * 1.1, -6);
  ctx.stroke();

  // 5. Arms & Radiant Dawn Spear/Blade
  const handX = f * (8 + atkSweep * 17 - atkWindup * 6);
  const handY = dressTopY + 10 - atkSweep * 6 - atkWindup * 3;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(f * 3, dressTopY + 3);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  if (p.state === 'ATTACKING') {
    ctx.save();
    ctx.translate(handX, handY);
    const spearLen = p.comboStage === 2 ? 42 : 30;
    const spearAng = atkWindup > 0 ? -f * 0.5 : p.comboStage === 1 ? -f * 0.2 : f * 0.15;
    ctx.rotate(spearAng);
    // Golden hilt
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-f * 8, 0);
    ctx.lineTo(f * 4, 0);
    ctx.stroke();
    // Luminous white-gold blade
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(f * 3, 0);
    ctx.lineTo(f * spearLen, 0);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f * 3, 0);
    ctx.lineTo(f * (spearLen + 4), 0);
    ctx.stroke();
    ctx.restore();
  }

  // 6. Porcelain Visage & Golden Circlet
  ctx.fillStyle = isHurt ? '#ffffff' : '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(f * 1, dressTopY - 7.5, 6.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Golden crown circlet
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(f * 1, dressTopY - 8.5, 6.4, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Luminous golden eye
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.ellipse(f * 4, dressTopY - 7.5, 1.8, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function renderGame(ctx: CanvasRenderingContext2D, engine: GameEngine, width: number, height: number) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const shakeX = engine.shakeTimer > 0 ? (Math.random() - 0.5) * engine.shakeIntensity * 2 : 0;
  const shakeY = engine.shakeTimer > 0 ? (Math.random() - 0.5) * engine.shakeIntensity * 2 : 0;
  const camX = engine.cameraX + shakeX;
  const camY = engine.cameraY + shakeY;

  // 1. Multi-layer atmospheric background & parallax ruins
  drawRoomBackground(ctx, engine, camX, camY, width, height);

  const zoom = engine.cameraZoom || 1;
  ctx.save();
  if (Math.abs(zoom - 1) > 0.002) {
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
  }
  ctx.translate(-camX, -camY);

  // 1b. Giant Sword Monument in Ember Sanctum (Room 4)
  if (engine.room.giantSwordMonument) {
    drawGiantSwordMonument(
      ctx,
      engine.room.giantSwordMonument.x,
      engine.room.giantSwordMonument.y,
      engine.boss.phase,
      engine.player.animTime
    );
  }

  // 1c. Shelter Highlight beneath stone platforms when Phase 3 Portals are active
  const portalsActive = engine.bossPortals.length > 0;
  if (portalsActive) {
    drawPortalShelterZones(ctx, engine.room.platforms, engine.player.animTime);
  }

  // 2. Room 1 Carved Test Obelisks (A-H)
  for (const m of engine.room.testMarkers) {
    drawTestMarker(ctx, m.code, m.title, m.hint, m.x, m.y, engine.player.animTime);
  }

  // 3. Ornate Gothic Doorways
  for (const d of engine.room.doorways) {
    const locked = Boolean(d.lockedByBoss && engine.room.bossId && !engine.boss.defeated);
    drawDoorway(ctx, d.x, d.y, d.w, d.h, d.label, locked, engine.player.animTime);
  }

  // 4. Weathered Masonry Platforms & Moss / Runes
  for (const plat of engine.room.platforms) {
    drawPlatform(ctx, plat, engine.room.theme, engine.boss.phase);
  }

  // 5. Boss Celestial Descent Floor Warning
  if (engine.room.bossId && engine.boss.active && !engine.boss.defeated) {
    const b = engine.boss;
    if (
      b.currentAttack === 'celestial_descent' &&
      (b.state === 'TELEGRAPH' || (b.state === 'ATTACK' && b.descentPhase === 'crashing'))
    ) {
      ctx.save();
      const warnGrad = ctx.createLinearGradient(0, 720, 0, 800);
      warnGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      warnGrad.addColorStop(1, 'rgba(239, 68, 68, 0.34)');
      ctx.fillStyle = warnGrad;
      ctx.fillRect(b.descentWarningX - 95, 720, 190, 80);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(b.descentWarningX - 95, 797);
      ctx.lineTo(b.descentWarningX + 95, 797);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 5b. Boss Phase 3 Portals (The Fallen Judgment)
  for (const pt of engine.bossPortals) {
    drawBossPortal(ctx, pt, engine.player.animTime);
  }

  // 5c. Ignis Phase 3 Destructible Conduit Structures & Cataclysm Orb
  for (const st of engine.bossStructures) {
    drawBossStructure(ctx, st, engine.ignisOrb, engine.player.animTime);
  }
  if (engine.ignisOrb) {
    drawIgnisOrb(ctx, engine.ignisOrb, engine.boss, engine.player.animTime);
  }

  // 6. Enemies
  for (const e of engine.enemiesByRoom[engine.roomId]) {
    drawEnemy(ctx, e, engine.debugOptions.showDetectionRanges);
  }

  // 7. Boss
  if (engine.room.bossId) {
    drawBoss(ctx, engine.boss, engine.debugOptions.showDetectionRanges);
  }

  // 7b. Player Ultimates (Cerberus & Giant Sacred Bible)
  if (engine.cerberus) {
    drawCerberusSummon(ctx, engine.cerberus);
  }
  if (engine.giantBible) {
    drawGiantBibleSummon(ctx, engine.giantBible);
  }

  // 8. Player Afterimages
  for (const ghost of engine.player.afterimages) {
    drawCharacterSprite(ctx, engine.characterId, {
      x: ghost.x,
      y: ghost.y,
      w: engine.player.w,
      h: engine.player.h,
      facing: ghost.facing,
      state: ghost.state,
      animTime: engine.player.animTime,
      vx: engine.player.vx,
      vy: engine.player.vy,
      shackleAngleL: engine.player.shackleAngleL,
      shackleAngleR: engine.player.shackleAngleR,
      hairNodes: engine.player.hairNodes,
      alpha: ghost.alpha * (engine.characterId === 'celestial' ? 0.5 : 0.38),
    });
  }

  // 9. Player
  const p = engine.player;
  const invulnBlink = p.invulnTimer > 0 && Math.floor(p.invulnTimer * 24) % 2 === 0;
  const atkProgress =
    p.state === 'ATTACKING' && p.attackTotalTime > 0 ? 1 - p.attackTimer / p.attackTotalTime : 0;
  const healProgress =
    p.state === 'HEALING' ? 1 - p.healTimer / engine.config.stats.healDuration : 0;

  drawCharacterSprite(ctx, engine.characterId, {
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    facing: p.facing,
    state: p.state,
    animTime: p.animTime,
    vx: p.vx,
    vy: p.vy,
    shackleAngleL: p.shackleAngleL,
    shackleAngleR: p.shackleAngleR,
    hairNodes: p.hairNodes,
    alpha: invulnBlink ? 0.55 : 1,
    parryFlash: p.parrySuccessFlash,
    parryFailFlash: p.parryFailFlash,
    attackProgress: atkProgress,
    comboStage: p.comboStage,
    healProgress,
    empowered: p.abyssalEmpoweredTimer > 0,
    reviveFlash: p.celestialReviveFlash,
    wingFlapTimer: p.wingFlapTimer,
    revolverPoseTimer: p.revolverPoseTimer,
    revolverDrawing: p.revolverState === 'DRAW',
  });

  // 10. Weapon Slashes, Razor-Sharp Combat Streaks & Shockwaves (Hollow Knight screenshot aesthetic)
  for (const sl of engine.slashes) {
    const t = sl.life / sl.maxLife;
    ctx.save();
    ctx.globalAlpha = t;
    if (sl.kind === 'parry') {
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 6 * t;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius * (1.22 - t * 0.42), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = sl.glow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius * (1.16 - t * 0.36), 0, Math.PI * 2);
      ctx.stroke();
    } else if (sl.kind === 'shockwave') {
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 7 * t;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius * (1.18 - t * 0.65), Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius * (1.06 - t * 0.6), Math.PI, Math.PI * 2);
      ctx.stroke();
    } else if (sl.kind === 'chain' || sl.kind === 'celestial') {
      const base = sl.facing === 1 ? 0 : Math.PI;
      const isChain = sl.kind === 'chain';
      const bloomColor = isChain ? 'rgba(239, 68, 68, 0.45)' : 'rgba(251, 146, 60, 0.5)';
      const edgeColor = isChain ? '#f87171' : '#fde047';

      // Warm central impact bloom matching reference screenshot
      const flareGrad = ctx.createRadialGradient(sl.x, sl.y, 2, sl.x, sl.y, sl.radius * 0.95);
      flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      flareGrad.addColorStop(0.35, bloomColor);
      flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // Razor-sharp tapering crescent body
      const midA = base + (sl.angleStart + sl.angleEnd) * 0.5;
      const a0 = base + sl.angleStart;
      const a1 = base + sl.angleEnd;
      const rOuter = sl.radius * (1.06 + (1 - t) * 0.14);
      const rInner = sl.radius * 0.62;
      ctx.fillStyle = edgeColor;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, rOuter, a0, a1, a1 < a0);
      ctx.quadraticCurveTo(
        sl.x + Math.cos(midA) * rInner,
        sl.y + Math.sin(midA) * rInner,
        sl.x + Math.cos(a0) * rOuter,
        sl.y + Math.sin(a0) * rOuter
      );
      ctx.closePath();
      ctx.fill();

      // Blinding white-hot razor core crescent + cross-lance streak
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, rOuter * 0.96, a0 + (a1 - a0) * 0.08, a1 - (a1 - a0) * 0.08, a1 < a0);
      ctx.quadraticCurveTo(
        sl.x + Math.cos(midA) * (rInner * 1.08),
        sl.y + Math.sin(midA) * (rInner * 1.08),
        sl.x + Math.cos(a0 + (a1 - a0) * 0.08) * rOuter * 0.96,
        sl.y + Math.sin(a0 + (a1 - a0) * 0.08) * rOuter * 0.96
      );
      ctx.closePath();
      ctx.fill();

      // Diagonal piercing lance glint (signature Hollow Knight slash flare)
      const tilt = sl.facing * (isChain ? -0.24 : 0.22);
      const lanceLen = sl.radius * (1.75 + (1 - t) * 0.35);
      ctx.save();
      ctx.translate(sl.x, sl.y);
      ctx.rotate(tilt);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-lanceLen, 0);
      ctx.lineTo(0, -4.5 * t);
      ctx.lineTo(lanceLen, 0);
      ctx.lineTo(0, 4.5 * t);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      const base = sl.facing === 1 ? 0 : Math.PI;
      ctx.strokeStyle = sl.glow;
      ctx.lineWidth = (sl.kind === 'greatsword' ? 16 : 11) * t;
      ctx.globalAlpha = t * 0.4;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius, base + sl.angleStart, base + sl.angleEnd);
      ctx.stroke();
      ctx.globalAlpha = t;
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = sl.kind === 'greatsword' ? 8 : 6;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius, base + sl.angleStart, base + sl.angleEnd);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4 * t;
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.radius + 2, base + sl.angleStart * 0.85, base + sl.angleEnd * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 11. Projectiles (Orbs, Ash Rain, Fire Waves, Portal Rain, Revolver Bullet)
  for (const pr of engine.projectiles) {
    ctx.save();
    if (pr.kind === 'revolver_bullet') {
      const dir = Math.sign(pr.vx) || 1;
      // Blazing crimson-gold tracer streak
      const wakeGrad = ctx.createLinearGradient(pr.x - dir * 68, pr.y, pr.x + dir * 16, pr.y);
      wakeGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      wakeGrad.addColorStop(0.65, 'rgba(239, 68, 68, 0.9)');
      wakeGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = wakeGrad;
      ctx.beginPath();
      ctx.moveTo(pr.x + dir * 18, pr.y);
      ctx.lineTo(pr.x - dir * 14, pr.y - 5);
      ctx.lineTo(pr.x - dir * 68, pr.y);
      ctx.lineTo(pr.x - dir * 14, pr.y + 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(pr.x + dir * 8, pr.y, 11, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(pr.x + dir * 10, pr.y, 6, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (pr.kind === 'fire_wave') {
      const w = pr.w ?? 42;
      const h = pr.h ?? 34;
      const fGrad = ctx.createLinearGradient(pr.x, pr.y - h / 2, pr.x, pr.y + h / 2);
      fGrad.addColorStop(0, '#fef08a');
      fGrad.addColorStop(0.45, '#f97316');
      fGrad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(pr.x - w / 2, pr.y + h / 2);
      ctx.lineTo(pr.x - w * 0.28, pr.y - h * 0.45);
      ctx.lineTo(pr.x - w * 0.05, pr.y - h * 0.12);
      ctx.lineTo(pr.x + w * 0.15, pr.y - h * 0.56);
      ctx.lineTo(pr.x + w * 0.5, pr.y + h / 2);
      ctx.closePath();
      ctx.fill();
    } else if (pr.kind === 'portal_rain') {
      // Abyssal Rift Lance-Drop falling from Phase 3 portals
      const tailGrad = ctx.createLinearGradient(pr.x, pr.y - 24, pr.x, pr.y + 12);
      tailGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
      tailGrad.addColorStop(1, pr.color);
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y + 13);
      ctx.lineTo(pr.x - 5.5, pr.y - 10);
      ctx.lineTo(pr.x, pr.y - 24);
      ctx.lineTo(pr.x + 5.5, pr.y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y + 5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (pr.kind === 'ash_rain') {
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y + pr.radius + 3);
      ctx.lineTo(pr.x - pr.radius * 0.65, pr.y - pr.radius * 1.5);
      ctx.lineTo(pr.x + pr.radius * 0.65, pr.y - pr.radius * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y + 2, pr.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const orbGrad = ctx.createRadialGradient(pr.x, pr.y, 1, pr.x, pr.y, pr.radius * 1.8);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.45, pr.color);
      orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 11b. Ignis Phase 3 Summoned Homing Swords
  for (const sw of engine.summonedSwords) {
    drawSummonedSword(ctx, sw, engine.player.animTime);
  }

  // 12. Particles
  for (const pt of engine.particles) {
    drawParticle(ctx, pt);
  }

  // 13. Floating Combat Numbers
  for (const ft of engine.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.font = ft.large ? '700 15px "Cinzel", serif' : '600 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#09080d';
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  // 14. Debug Hitbox Overlay (F3 toggle)
  if (engine.debugOptions.showHitboxes) {
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    if (p.state === 'ATTACKING') {
      const hb = engine.getPlayerAttackHitbox();
      ctx.strokeStyle = '#facc15';
      ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
      ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
    }
    for (const e of engine.enemiesByRoom[engine.roomId]) {
      ctx.strokeStyle = '#f87171';
      ctx.strokeRect(e.x, e.y, e.w, e.h);
    }
    if (engine.room.bossId && !engine.boss.defeated && engine.boss.active) {
      ctx.strokeStyle = '#fb7185';
      ctx.strokeRect(engine.boss.x, engine.boss.y, engine.boss.w, engine.boss.h);
    }
    for (const st of engine.bossStructures) {
      ctx.strokeStyle = '#fde047';
      ctx.strokeRect(st.x, st.y, st.w, st.h);
    }
    for (const sw of engine.summonedSwords) {
      if (sw.state === 'CHASING') {
        ctx.strokeStyle = '#fb923c';
        ctx.strokeRect(sw.x - 12, sw.y - 12, 24, 24);
      }
    }
    ctx.restore();
  }

  ctx.restore(); // End world camera space

  // 15. Foreground Gothic Silhouette Framing & Atmospheric Vignette + Screen Impact Pulse
  drawForegroundAndVignette(ctx, engine, camX, width, height);

  ctx.restore();
}

function drawPortalShelterZones(ctx: CanvasRenderingContext2D, platforms: Platform[], time: number) {
  ctx.save();
  const pulse = 0.14 + Math.sin(time * 7) * 0.05;
  for (const plat of platforms) {
    if (plat.kind !== 'stone' || plat.w < 140) continue;
    const floorTop = 800;
    const h = floorTop - (plat.y + plat.h);
    if (h <= 40) continue;
    const shGrad = ctx.createLinearGradient(0, plat.y + plat.h, 0, floorTop);
    shGrad.addColorStop(0, `rgba(56, 189, 248, ${pulse + 0.08})`);
    shGrad.addColorStop(1, `rgba(56, 189, 248, ${pulse * 0.35})`);
    ctx.fillStyle = shGrad;
    ctx.fillRect(plat.x + 8, plat.y + plat.h, plat.w - 16, h);

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(plat.x + 8, plat.y + plat.h);
    ctx.lineTo(plat.x + 8, floorTop);
    ctx.moveTo(plat.x + plat.w - 8, plat.y + plat.h);
    ctx.lineTo(plat.x + plat.w - 8, floorTop);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawBossPortal(ctx: CanvasRenderingContext2D, pt: BossPortal, time: number) {
  ctx.save();
  if (pt.side === 'sky') {
    // High-altitude dimensional tear across the cathedral vault
    const openAlpha = Math.min(1, pt.life * 2.2) * (pt.telegraphTime > 0 ? 0.55 : 0.9);
    ctx.globalAlpha = openAlpha;
    const skyGrad = ctx.createLinearGradient(0, pt.y - 12, 0, pt.y + pt.h);
    skyGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
    skyGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.45)');
    skyGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(pt.x, pt.y - 12, pt.w, pt.h + 12);

    ctx.strokeStyle = pt.telegraphTime > 0 ? '#fde047' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = pt.x; x <= pt.x + pt.w; x += 40) {
      const jy = pt.y + Math.sin(x * 0.04 + time * 10) * 6;
      if (x === pt.x) ctx.moveTo(x, jy);
      else ctx.lineTo(x, jy);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Flanking Abyssal Vortex Portals beside The Fallen Judgment
  const cx = pt.x + pt.w / 2;
  const cy = pt.y + pt.h / 2;
  const openScale = Math.min(1, (pt.maxLife - pt.life) * 3.5) * Math.min(1, pt.life * 2.5);
  const rx = (pt.w * 0.48) * openScale;
  const ry = (pt.h * 0.5) * openScale;

  // Outer crimson-violet vortex glow
  const vGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(10, ry * 1.15));
  vGrad.addColorStop(0, '#09020a');
  vGrad.addColorStop(0.55, '#4c0519');
  vGrad.addColorStop(0.82, pt.color);
  vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = vGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(4, rx * 1.4), Math.max(8, ry * 1.15), 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner abyssal void
  ctx.fillStyle = '#070209';
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(2, rx * 0.72), Math.max(4, ry * 0.8), 0, 0, Math.PI * 2);
  ctx.fill();

  // Swirling rune border
  ctx.strokeStyle = pt.telegraphTime > 0 ? '#fde047' : pt.color;
  ctx.lineWidth = 2.6;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 48;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(3, rx * 0.96), Math.max(6, ry * 0.96), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Energy arc streaming from flanking portal up toward sky rift
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry * 0.7);
  ctx.quadraticCurveTo(
    cx + (pt.side === 'left' ? -70 : 70),
    (cy + 100) * 0.5,
    cx + (pt.side === 'left' ? -180 : 180),
    100
  );
  ctx.stroke();
  ctx.restore();
}

function drawSummonedSword(ctx: CanvasRenderingContext2D, sw: SummonedSword, time: number) {
  ctx.save();
  ctx.translate(sw.x, sw.y);

  const scale = sw.state === 'SUMMONING' ? 0.35 + sw.summonProgress * 0.65 : 1;
  ctx.globalAlpha = sw.state === 'SUMMONING' ? Math.max(0.25, sw.summonProgress) : 1;

  // Summoning rune ring behind sword during materialize/aim
  if (sw.state === 'SUMMONING') {
    ctx.save();
    ctx.strokeStyle = sw.chargeTimer < 0.32 ? '#fde047' : '#f97316';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.rotate(time * 3);
    ctx.beginPath();
    ctx.arc(0, 0, 18 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.rotate(sw.angle);
  ctx.scale(scale, scale);

  // Fiery flight wake when chasing
  if (sw.state === 'CHASING') {
    const wakeGrad = ctx.createLinearGradient(-34, 0, 10, 0);
    wakeGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
    wakeGrad.addColorStop(1, 'rgba(249, 115, 22, 0.55)');
    ctx.fillStyle = wakeGrad;
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
  }

  // Molten blade silhouette pointing along +X
  ctx.fillStyle = '#140c10';
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-14, -4.5);
  ctx.lineTo(14, -4.5);
  ctx.lineTo(24, 0);
  ctx.lineTo(14, 4.5);
  ctx.lineTo(-14, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing golden fuller
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(17, 0);
  ctx.stroke();

  // Crossguard & Pommel
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(-16, -9, 3.5, 18);
  ctx.fillStyle = '#1f1215';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.2;
  ctx.fillRect(-23, -2, 7, 4);
  ctx.strokeRect(-23, -2, 7, 4);

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, pt: Particle) {
  ctx.save();
  ctx.globalAlpha = pt.alpha;
  ctx.fillStyle = pt.color;
  if (pt.shape === 'smoke') {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  } else if (pt.shape === 'spark') {
    ctx.strokeStyle = pt.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(pt.x - pt.vx * 0.02, pt.y - pt.vy * 0.02);
    ctx.lineTo(pt.x + pt.vx * 0.02, pt.y + pt.vy * 0.02);
    ctx.stroke();
  } else if (pt.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * 0.65, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.restore();
}

function drawGiantSwordMonument(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  bossPhase: 1 | 2 | 3,
  time: number
) {
  ctx.save();
  const glowColor = bossPhase === 3 ? '#ef4444' : bossPhase === 2 ? '#fb923c' : '#f59e0b';

  // Cracked basalt altar pedestal at base
  ctx.fillStyle = '#140e12';
  ctx.strokeStyle = '#3b2528';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 135, floorY);
  ctx.lineTo(x - 105, floorY - 38);
  ctx.lineTo(x + 115, floorY - 34);
  ctx.lineTo(x + 145, floorY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.translate(x, floorY - 12);
  ctx.rotate(-0.13);

  // Blade metallic shading
  const bladeGrad = ctx.createLinearGradient(-28, 0, 28, 0);
  bladeGrad.addColorStop(0, '#0f0c12');
  bladeGrad.addColorStop(0.45, '#2b222c');
  bladeGrad.addColorStop(0.55, '#19141d');
  bladeGrad.addColorStop(1, '#0c090e');
  ctx.fillStyle = bladeGrad;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-24, 10);
  ctx.lineTo(-29, -355);
  ctx.lineTo(29, -355);
  ctx.lineTo(24, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Notches on colossal blade edge
  ctx.fillStyle = '#180d10';
  ctx.beginPath();
  ctx.moveTo(-27, -140);
  ctx.lineTo(-17, -148);
  ctx.lineTo(-28, -158);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(27, -230);
  ctx.lineTo(18, -238);
  ctx.lineTo(28, -246);
  ctx.closePath();
  ctx.fill();

  // Ornate Crossguard & Pommel
  ctx.fillStyle = '#241b24';
  ctx.beginPath();
  ctx.moveTo(-88, -352);
  ctx.lineTo(-74, -372);
  ctx.lineTo(74, -372);
  ctx.lineTo(88, -352);
  ctx.lineTo(66, -342);
  ctx.lineTo(-66, -342);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillRect(-12, -448, 24, 78);
  ctx.strokeRect(-12, -448, 24, 78);
  ctx.beginPath();
  ctx.arc(0, -460, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glowing ancient runes along fuller
  ctx.strokeStyle = glowColor;
  ctx.globalAlpha = 0.5 + Math.sin(time * 3) * 0.28;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(0, -328);
  ctx.stroke();

  for (let ry = -60; ry >= -300; ry -= 48) {
    ctx.beginPath();
    ctx.moveTo(-10, ry);
    ctx.lineTo(0, ry - 12);
    ctx.lineTo(10, ry);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoomBackground(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  camX: number,
  camY: number,
  width: number,
  height: number
) {
  const theme = engine.room.theme;
  const bossPhase = engine.boss.phase;
  const time = engine.player.animTime;

  // Layer 1: Hollow Knight-Inspired Deep Smoky Slate-Teal / Cathedral Mist Sky Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  let accentGlow = 'rgba(251, 146, 60, 0.22)';
  let fogColor = 'rgba(20, 42, 48, 0.42)';
  let monolithFar = '#0c171e';
  let monolithMid = '#13222b';
  let lanternWarm = '#fb923c';

  if (theme === 'lab') {
    grad.addColorStop(0, '#070e14');
    grad.addColorStop(0.55, '#0f2027');
    grad.addColorStop(1, '#182f37');
    accentGlow = 'rgba(251, 146, 60, 0.2)';
    fogColor = 'rgba(28, 58, 64, 0.38)';
    monolithFar = '#0c1920';
    monolithMid = '#13252d';
  } else if (theme === 'combat') {
    grad.addColorStop(0, '#090e16');
    grad.addColorStop(0.55, '#13222b');
    grad.addColorStop(1, '#1d2d35');
    accentGlow = 'rgba(245, 158, 11, 0.22)';
    fogColor = 'rgba(30, 52, 58, 0.42)';
    monolithFar = '#0e1721';
    monolithMid = '#162430';
  } else if (theme === 'ember') {
    if (bossPhase === 1) {
      grad.addColorStop(0, '#0d090b');
      grad.addColorStop(0.58, '#1e1518');
      grad.addColorStop(1, '#2b1812');
      accentGlow = 'rgba(251, 146, 60, 0.25)';
      fogColor = 'rgba(54, 28, 20, 0.42)';
      monolithFar = '#140c0f';
      monolithMid = '#1f1214';
    } else if (bossPhase === 2) {
      grad.addColorStop(0, '#10060d');
      grad.addColorStop(0.58, '#26101b');
      grad.addColorStop(1, '#3b131d');
      accentGlow = 'rgba(249, 115, 22, 0.28)';
      fogColor = 'rgba(72, 22, 28, 0.44)';
      monolithFar = '#170911';
      monolithMid = '#240d17';
      lanternWarm = '#f97316';
    } else {
      grad.addColorStop(0, '#120306');
      grad.addColorStop(0.58, '#2c080e');
      grad.addColorStop(1, '#480a10');
      accentGlow = 'rgba(239, 68, 68, 0.3)';
      fogColor = 'rgba(92, 16, 20, 0.46)';
      monolithFar = '#1a0509';
      monolithMid = '#29070d';
      lanternWarm = '#ef4444';
    }
  } else {
    if (bossPhase === 1) {
      grad.addColorStop(0, '#070c13');
      grad.addColorStop(0.55, '#111e27');
      grad.addColorStop(1, '#1a2832');
      accentGlow = 'rgba(251, 146, 60, 0.24)';
      fogColor = 'rgba(26, 49, 58, 0.42)';
      monolithFar = '#0c151d';
      monolithMid = '#14212c';
    } else if (bossPhase === 2) {
      grad.addColorStop(0, '#0c0615');
      grad.addColorStop(0.55, '#1b112c');
      grad.addColorStop(1, '#2b163d');
      accentGlow = 'rgba(192, 132, 252, 0.25)';
      fogColor = 'rgba(48, 26, 68, 0.44)';
      monolithFar = '#120920';
      monolithMid = '#1c102f';
      lanternWarm = '#c084fc';
    } else {
      grad.addColorStop(0, '#110308');
      grad.addColorStop(0.55, '#290813');
      grad.addColorStop(1, '#440916');
      accentGlow = 'rgba(239, 68, 68, 0.28)';
      fogColor = 'rgba(85, 16, 28, 0.45)';
      monolithFar = '#18050b';
      monolithMid = '#260811';
      lanternWarm = '#ef4444';
    }
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Layer 1b: Eclipsed Cathedral Halo & Warm Horizon Bloom (0.08x parallax)
  ctx.save();
  const moonX = width * 0.52 - camX * 0.08;
  const moonY = height * 0.26 - camY * 0.06;
  const moonGrad = ctx.createRadialGradient(moonX, moonY, 18, moonX, moonY, 260);
  moonGrad.addColorStop(0, accentGlow);
  moonGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Layer 2: Distant Catacomb Alcoves, Spirit Silhouettes & Tiered Colosseum Arches (0.16x parallax)
  ctx.save();
  const farX = -camX * 0.16;
  const farY = -camY * 0.08;
  for (let i = -1; i < 12; i++) {
    const bx = farX + i * 210;
    const baseY = farY + height * 0.64;

    // Distant horned stone spire
    ctx.fillStyle = monolithFar;
    ctx.beginPath();
    ctx.moveTo(bx + 10, height);
    ctx.lineTo(bx + 26, baseY - 120);
    ctx.lineTo(bx + 42, baseY - 165);
    ctx.lineTo(bx + 54, baseY - 122);
    ctx.lineTo(bx + 76, baseY - 122);
    ctx.lineTo(bx + 88, baseY - 165);
    ctx.lineTo(bx + 104, baseY - 120);
    ctx.lineTo(bx + 124, height);
    ctx.closePath();
    ctx.fill();

    // Soft glowing catacomb spirit-mask alcoves in the misty tiers (matching screenshot crowd)
    const tierY = baseY + 18 + (i % 2) * 16;
    ctx.fillStyle = 'rgba(186, 230, 224, 0.09)';
    ctx.beginPath();
    ctx.ellipse(bx + 150, tierY, 24, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(241, 245, 249, 0.2)';
    ctx.beginPath();
    ctx.arc(bx + 143, tierY - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(bx + 156, tierY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Layer 2b: Swirling Smoky Mist Band separating far & mid depths
  ctx.save();
  const mistGrad = ctx.createLinearGradient(0, height * 0.42, 0, height);
  mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  mistGrad.addColorStop(0.55, fogColor);
  mistGrad.addColorStop(1, 'rgba(5, 8, 12, 0.65)');
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, height * 0.42, width, height * 0.58);
  ctx.restore();

  // Layer 3: Mid Parallax Horned Stone Monoliths, Diagonal Chains & Warm Hanging Lanterns (0.34x)
  ctx.save();
  const midX = -camX * 0.34;
  const midY = -camY * 0.14;
  for (let i = -1; i < 11; i++) {
    const ax = midX + i * 310;
    const ay = midY + 45;

    // Towering carved obsidian monolith with horned crest (matching screenshot center)
    ctx.fillStyle = monolithMid;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax + 12, height);
    ctx.lineTo(ax + 24, ay + 65);
    ctx.lineTo(ax + 38, ay + 12);
    ctx.lineTo(ax + 52, ay + 62);
    ctx.lineTo(ax + 78, ay + 62);
    ctx.lineTo(ax + 92, ay + 12);
    ctx.lineTo(ax + 106, ay + 65);
    ctx.lineTo(ax + 118, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Diagonal tension chains across cavern
    ctx.strokeStyle = 'rgba(15, 23, 32, 0.72)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(ax + 150, 0);
    ctx.lineTo(ax + 280, height * 0.68);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hanging Wrought-Iron Lantern Cage with Warm Amber Bloom
    const sway = Math.sin(time * 1.4 + i * 1.7) * 5;
    const lx = ax + 215 + sway;
    const ly = midY + (i % 2 === 0 ? 225 : 165);

    ctx.strokeStyle = 'rgba(20, 26, 34, 0.9)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(ax + 215, 0);
    ctx.lineTo(lx, ly - 24);
    ctx.stroke();

    // Warm radial lantern light pool
    const pulse = 0.92 + Math.sin(time * 3.8 + i) * 0.08;
    const lGlow = ctx.createRadialGradient(lx, ly, 4, lx, ly, 125 * pulse);
    lGlow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    lGlow.addColorStop(0.35, accentGlow);
    lGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 125 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Wrought-iron lantern cage silhouette
    ctx.fillStyle = '#090b10';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(lx - 14, ly - 18);
    ctx.lineTo(lx, ly - 30);
    ctx.lineTo(lx + 14, ly - 18);
    ctx.lineTo(lx + 11, ly + 14);
    ctx.lineTo(lx, ly + 22);
    ctx.lineTo(lx - 11, ly + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing lantern core slit
    ctx.fillStyle = lanternWarm;
    ctx.beginPath();
    ctx.ellipse(lx, ly - 2, 6.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.ellipse(lx, ly - 1, 3.2, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss Sanctuary Sigil behind central altar
  if (theme === 'boss') {
    const sigilX = 1120 - camX * 0.52;
    const sigilY = 340 - camY * 0.3;
    ctx.strokeStyle = accentGlow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sigilX, sigilY, 165, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sigilX, sigilY, 120, 0, Math.PI * 2);
    ctx.stroke();
    for (let r = 0; r < 8; r++) {
      const a = time * 0.25 + (r * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(sigilX + Math.cos(a) * 120, sigilY + Math.sin(a) * 120);
      ctx.lineTo(sigilX + Math.cos(a) * 165, sigilY + Math.sin(a) * 165);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Layer 3b: World Ground Gothic Lamp Posts & Floating Luminous Spores (0.78x parallax)
  ctx.save();
  const postX = -camX * 0.78;
  const floorScreenY = 800 - camY;
  if (floorScreenY > 120 && floorScreenY < height + 160) {
    for (let i = 0; i < 8; i++) {
      const px = postX + 160 + i * 380;
      if (px < -180 || px > width + 180) continue;
      const lampY = floorScreenY - 78;

      const floorGlow = ctx.createRadialGradient(px, lampY, 3, px, lampY + 28, 130);
      floorGlow.addColorStop(0, 'rgba(254, 240, 138, 0.34)');
      floorGlow.addColorStop(0.45, accentGlow);
      floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = floorGlow;
      ctx.beginPath();
      ctx.arc(px, lampY + 22, 130, 0, Math.PI * 2);
      ctx.fill();

      // Ornate gothic lamp post
      ctx.strokeStyle = '#090b10';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, floorScreenY);
      ctx.lineTo(px, lampY + 12);
      ctx.stroke();
      ctx.fillStyle = '#090b10';
      ctx.beginPath();
      ctx.moveTo(px - 9, lampY - 4);
      ctx.lineTo(px, lampY - 16);
      ctx.lineTo(px + 9, lampY - 4);
      ctx.lineTo(px + 7, lampY + 12);
      ctx.lineTo(px - 7, lampY + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lanternWarm;
      ctx.fillRect(px - 3.5, lampY - 1, 7, 10);
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(px - 1.5, lampY + 1, 3, 6);
    }
  }

  // Drifting Luminous Spores / Ember Motes across viewport
  for (let m = 0; m < 28; m++) {
    const seed = m * 173.3;
    const mx = ((seed + time * (12 + (m % 5) * 3) - camX * 0.45) % width + width) % width;
    const my = ((seed * 1.7 + Math.sin(time * 0.9 + m) * 26 - camY * 0.3) % height + height) % height;
    const mr = 1.2 + (m % 3) * 0.7;
    const ma = 0.25 + Math.sin(time * 2.2 + m) * 0.2;
    ctx.fillStyle = m % 3 === 0 ? `rgba(254, 240, 138, ${ma})` : `rgba(186, 230, 224, ${ma})`;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  plat: Platform,
  theme: 'lab' | 'combat' | 'boss' | 'ember',
  bossPhase: 1 | 2 | 3
) {
  ctx.save();

  let bodyTop = '#141c24';
  let bodyBot = '#05070a';
  let trimColor = '#334a59';
  let detailColor = 'rgba(148, 163, 184, 0.16)';

  if (theme === 'combat') {
    bodyTop = '#191f28';
    bodyBot = '#06070b';
    trimColor = '#475569';
    detailColor = 'rgba(148, 163, 184, 0.18)';
  } else if (theme === 'boss') {
    bodyTop = bossPhase === 3 ? '#2c0c14' : bossPhase === 2 ? '#1f1230' : '#161e28';
    bodyBot = '#050509';
    trimColor = bossPhase === 3 ? '#ef4444' : bossPhase === 2 ? '#a855f7' : '#fb923c';
    detailColor = bossPhase === 3 ? 'rgba(239,68,68,0.22)' : 'rgba(251,146,60,0.18)';
  } else if (theme === 'ember') {
    bodyTop = bossPhase === 3 ? '#310a0e' : bossPhase === 2 ? '#291018' : '#211512';
    bodyBot = '#080506';
    trimColor = bossPhase === 3 ? '#ef4444' : bossPhase === 2 ? '#fb923c' : '#f59e0b';
    detailColor = 'rgba(249, 115, 22, 0.24)';
  }

  // Deep obsidian masonry fill
  const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
  grad.addColorStop(0, bodyTop);
  grad.addColorStop(1, bodyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

  // Carved stone block seams
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 1.4;
  const blockW = 48;
  for (let bx = plat.x + blockW; bx < plat.x + plat.w; bx += blockW) {
    ctx.beginPath();
    ctx.moveTo(bx, plat.y + 4);
    ctx.lineTo(bx, plat.y + Math.min(plat.h, 28));
    ctx.stroke();
  }

  // Organic Cobblestone Cap, Jagged Spikes & Rim Highlight (Hollow Knight terrain silhouette)
  if (plat.kind !== 'ceiling' && plat.kind !== 'wall') {
    // Rounded dark cobblestones along top surface
    for (let cx = plat.x + 12; cx < plat.x + plat.w - 10; cx += 24) {
      const rw = 13 + ((cx * 7) % 6);
      ctx.fillStyle = bodyTop;
      ctx.beginPath();
      ctx.ellipse(cx, plat.y + 2, rw, 5.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, plat.y + 2, rw, 5.5, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    // Subtle crisp top highlight line
    ctx.fillStyle = 'rgba(226, 232, 240, 0.2)';
    ctx.fillRect(plat.x, plat.y, plat.w, 1.2);

    // Jagged rocky floor spikes along floor edges (matching screenshot floor)
    if (plat.kind === 'floor') {
      ctx.fillStyle = '#07090e';
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1;
      for (let sx = plat.x + 85; sx < plat.x + plat.w - 85; sx += 170) {
        const leanSpike = (sx % 340 === 85 ? 1 : -1) * 7;
        ctx.beginPath();
        ctx.moveTo(sx - 9, plat.y + 2);
        ctx.lineTo(sx + leanSpike, plat.y - 16);
        ctx.lineTo(sx + 8, plat.y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Underside stalactite brackets & weathered stone ribs on floating platforms
    if (plat.kind === 'stone') {
      ctx.fillStyle = bodyBot;
      for (let vx = plat.x + 14; vx < plat.x + plat.w - 14; vx += 36) {
        const dropH = 10 + ((vx * 13) % 12);
        ctx.beginPath();
        ctx.moveTo(vx - 7, plat.y + plat.h);
        ctx.lineTo(vx, plat.y + plat.h + dropH);
        ctx.lineTo(vx + 7, plat.y + plat.h);
        ctx.closePath();
        ctx.fill();

        if (theme === 'lab' || theme === 'combat') {
          ctx.strokeStyle = theme === 'lab' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(148, 163, 184, 0.26)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(vx + 12, plat.y + plat.h);
          ctx.quadraticCurveTo(vx + 15, plat.y + plat.h + 10, vx + 11, plat.y + plat.h + 18);
          ctx.stroke();
        }
      }
    }
  }

  ctx.strokeStyle = detailColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(plat.x + 0.5, plat.y + 0.5, plat.w - 1, plat.h - 1);
  ctx.restore();
}

function drawTestMarker(
  ctx: CanvasRenderingContext2D,
  code: string,
  title: string,
  hint: string,
  x: number,
  y: number,
  time: number
) {
  ctx.save();
  // Carved Rune Obelisk Tablet instead of plain debug rectangle
  ctx.fillStyle = 'rgba(13, 17, 29, 0.88)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 86, y - 4);
  ctx.lineTo(x - 90, y - 42);
  ctx.lineTo(x - 76, y - 54);
  ctx.lineTo(x + 76, y - 54);
  ctx.lineTo(x + 90, y - 42);
  ctx.lineTo(x + 86, y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing lantern crystal atop tablet
  const glowA = 0.6 + Math.sin(time * 3.5 + x) * 0.25;
  ctx.fillStyle = `rgba(56, 189, 248, ${glowA})`;
  ctx.beginPath();
  ctx.moveTo(x, y - 62);
  ctx.lineTo(x + 5, y - 55);
  ctx.lineTo(x, y - 49);
  ctx.lineTo(x - 5, y - 55);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText(`${code} · ${title}`, x, y - 32);
  ctx.font = '400 10px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(hint, x, y - 15);
  ctx.restore();
}

function drawDoorway(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  locked: boolean,
  time: number
) {
  ctx.save();
  // Stone Gothic Archway Frame
  ctx.fillStyle = '#181420';
  ctx.strokeStyle = locked ? '#ef4444' : '#f59e0b';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + h);
  ctx.lineTo(x - 8, y + 26);
  ctx.quadraticCurveTo(x + w / 2, y - 18, x + w + 8, y + 26);
  ctx.lineTo(x + w + 8, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Swirling portal energy inside archway
  const glowAlpha = 0.24 + Math.sin(time * 3.2) * 0.08;
  const portalGrad = ctx.createLinearGradient(x, y + 18, x, y + h);
  portalGrad.addColorStop(0, locked ? `rgba(239, 68, 68, ${glowAlpha})` : `rgba(245, 158, 11, ${glowAlpha})`);
  portalGrad.addColorStop(1, 'rgba(9, 8, 13, 0.92)');
  ctx.fillStyle = portalGrad;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + h);
  ctx.lineTo(x + 6, y + 28);
  ctx.quadraticCurveTo(x + w / 2, y + 2, x + w - 6, y + 28);
  ctx.lineTo(x + w - 6, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.font = '600 11px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = locked ? '#fca5a5' : '#fde68a';
  ctx.fillText(locked ? 'SELADO' : label, x + w / 2, y - 14);
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyEntity, showRange: boolean) {
  ctx.save();
  const isDead = e.state === 'DEAD';
  if (isDead) {
    ctx.globalAlpha = Math.max(0, e.stateTimer / 0.45);
  }

  if (showRange && !isDead) {
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.25)';
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.type === 'ranged' ? 420 : 380, 0, Math.PI * 2);
    ctx.stroke();
  }

  const cx = e.x + e.w / 2;
  const bottomY = e.y + e.h;
  const f = e.facing;
  const flash = e.hitFlash > 0;
  const staggered = e.state === 'STAGGERED';
  const hurt = e.state === 'HURT';
  const walkSwing = Math.abs(e.vx) > 10 ? Math.sin(e.animTime * 11) * 5 : 0;

  if (!isDead && e.buffTimer > 0) {
    ctx.save();
    const buffPulse = 0.25 + Math.sin(e.animTime * 8) * 0.1;
    ctx.strokeStyle = `rgba(232, 121, 249, ${buffPulse + 0.45})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY - e.h * 0.48, e.w * 0.65, e.h * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (e.type === 'grunt') {
    // LACAIO ABISSAL: Armored Cathedral Husk with Jagged Cleaver
    ctx.save();
    ctx.translate(cx, bottomY);
    if (isDead) {
      ctx.translate(0, -8);
      ctx.rotate(-f * (1 - e.stateTimer / 0.45) * 1.4);
    } else if (hurt) {
      ctx.rotate(-f * 0.22);
    } else if (staggered) {
      ctx.translate(Math.sin(e.animTime * 28) * 1.8, 4);
    }

    ctx.strokeStyle = '#1e131b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.lineTo(-6 - walkSwing * 0.7, 0);
    ctx.moveTo(5, -20);
    ctx.lineTo(6 + walkSwing * 0.7, 0);
    ctx.stroke();

    ctx.fillStyle = flash ? '#ffffff' : staggered ? '#1e3a8a' : '#3d1526';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-13, -44);
    ctx.lineTo(13, -44);
    ctx.lineTo(15, -16);
    ctx.lineTo(4, -12);
    ctx.lineTo(-14, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#ffffff' : '#332934';
    ctx.beginPath();
    ctx.ellipse(f * 8, -42, 8, 5, f * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? '#ffffff' : '#1b141c';
    ctx.beginPath();
    ctx.arc(f * 2, -50, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-f * 2, -56);
    ctx.quadraticCurveTo(-f * 9, -65, -f * 11, -58);
    ctx.moveTo(f * 5, -56);
    ctx.quadraticCurveTo(f * 10, -64, f * 12, -57);
    ctx.stroke();
    ctx.fillStyle = '#f87171';
    ctx.fillRect(f * 4, -52, 5, 2.6);

    ctx.save();
    ctx.translate(f * 10, -34);
    const cleaverAng =
      e.state === 'TELEGRAPH' ? -f * 1.1 : e.state === 'ATTACK' ? f * 1.15 : f * 0.35;
    ctx.rotate(cleaverAng);
    ctx.fillStyle = e.state === 'TELEGRAPH' ? '#fde047' : '#64748b';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-4, -30);
    ctx.lineTo(9, -34);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  } else if (e.type === 'hunter') {
    // CAÇADOR ABISSAL: Crouched Twin-Scythe Shadow Stalker
    ctx.save();
    ctx.translate(cx, bottomY);
    if (isDead) {
      ctx.translate(0, -6);
      ctx.rotate(-f * (1 - e.stateTimer / 0.45) * 1.4);
    } else if (staggered) {
      ctx.translate(Math.sin(e.animTime * 28) * 1.8, 3);
    }

    ctx.strokeStyle = '#1d0d24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-f * 4, -18);
    ctx.lineTo(-f * 11, -8);
    ctx.lineTo(-f * 6 - walkSwing, 0);
    ctx.moveTo(f * 3, -18);
    ctx.lineTo(f * 9, -9);
    ctx.lineTo(f * 8 + walkSwing, 0);
    ctx.stroke();

    ctx.fillStyle = flash ? '#ffffff' : staggered ? '#1e3a8a' : '#2b1033';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-f * 16, -12);
    ctx.quadraticCurveTo(-f * 8, -42, f * 10, -34);
    ctx.lineTo(f * 14, -14);
    ctx.lineTo(f * 2, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#ffffff' : '#14091a';
    ctx.beginPath();
    ctx.ellipse(f * 9, -31, 8, 6.5, f * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(f * 12, -32, 2, 0, Math.PI * 2);
    ctx.fill();

    const scytheAng = e.state === 'TELEGRAPH' ? -f * 0.7 : e.state === 'ATTACK' ? f * 0.9 : 0;
    ctx.save();
    ctx.translate(f * 10, -24);
    ctx.rotate(scytheAng);
    ctx.strokeStyle = e.state === 'TELEGRAPH' ? '#fde047' : '#e879f9';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(f * 18, -10, f * 22, 8);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  } else if (e.type === 'swarmling') {
    // CRIA ABISSAL ALADA: Small flying bat/imp creature
    const flyBob = isDead ? 0 : Math.sin(e.animTime * 9) * 3.5;
    const flap = Math.sin(e.animTime * 22);
    ctx.save();
    ctx.translate(cx, e.y + e.h / 2 + flyBob);
    if (isDead) {
      ctx.rotate(-f * (1 - e.stateTimer / 0.45) * 1.6);
    } else if (staggered) {
      ctx.translate(Math.sin(e.animTime * 28) * 1.5, 2);
    }

    // Flapping shadow-crimson bat wings
    for (const wDir of [-1, 1]) {
      ctx.save();
      ctx.scale(wDir, 1);
      ctx.rotate(-0.35 + flap * 0.55);
      ctx.fillStyle = flash ? '#ffffff' : staggered ? '#1e3a8a' : '#240b16';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4, -2);
      ctx.quadraticCurveTo(14, -14, 21, -4);
      ctx.lineTo(15, 3);
      ctx.lineTo(11, 0);
      ctx.lineTo(7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Small spiked flying body
    ctx.fillStyle = flash ? '#ffffff' : staggered ? '#1e3a8a' : '#311020';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 1, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small horns & glowing eye
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, -6);
    ctx.lineTo(-6, -13);
    ctx.moveTo(3, -6);
    ctx.lineTo(6, -13);
    ctx.stroke();

    ctx.fillStyle = e.state === 'TELEGRAPH' ? '#fde047' : '#f87171';
    ctx.beginPath();
    ctx.arc(f * 3.5, -1, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (e.type === 'brute') {
    // COLOSSO DE FERRO: Towering heavy iron armored juggernaut with War-Maul
    ctx.save();
    ctx.translate(cx, bottomY);
    if (isDead) {
      ctx.translate(0, -12);
      ctx.rotate(-f * (1 - e.stateTimer / 0.45) * 1.4);
    } else if (hurt) {
      ctx.rotate(-f * 0.14);
    } else if (staggered) {
      ctx.translate(Math.sin(e.animTime * 22) * 2, 6);
    }

    // Thick iron greaves
    ctx.fillStyle = flash ? '#ffffff' : '#18141c';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.8;
    ctx.fillRect(-19, -32, 13, 32);
    ctx.strokeRect(-19, -32, 13, 32);
    ctx.fillRect(6, -32, 13, 32);
    ctx.strokeRect(6, -32, 13, 32);

    // Massive chest armor + molten rune core
    ctx.fillStyle = flash ? '#ffffff' : staggered ? '#1e3a8a' : '#261d26';
    ctx.strokeStyle = e.buffTimer > 0 ? '#e879f9' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-27, -78);
    ctx.lineTo(27, -78);
    ctx.lineTo(21, -30);
    ctx.lineTo(-21, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Iron horned helm
    ctx.fillStyle = flash ? '#ffffff' : '#171219';
    ctx.beginPath();
    ctx.roundRect(-14, -95, 28, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(f * 3 - 4, -86, 10, 3.2);

    // Spiked Pauldrons
    for (const sDir of [-1, 1]) {
      ctx.fillStyle = '#332934';
      ctx.beginPath();
      ctx.arc(sDir * 24, -72, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Heavy War-Maul (raises slowly on 0.96s telegraph windup)
    ctx.save();
    ctx.translate(f * 18, -56);
    const maulAng =
      e.state === 'TELEGRAPH' ? -f * 1.45 : e.state === 'ATTACK' ? f * 1.45 : f * 0.4;
    ctx.rotate(maulAng);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -54);
    ctx.stroke();

    ctx.fillStyle = e.state === 'TELEGRAPH' ? '#fde047' : '#3f3f46';
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.8;
    ctx.fillRect(-16, -72, 32, 20);
    ctx.strokeRect(-16, -72, 32, 20);
    ctx.restore();
    ctx.restore();
  } else if (e.type === 'mage') {
    // SACERDOTE SOMBRIO: Grounded Occult Support Mage casting Heal (green) & Buff (violet)
    const walkStride = Math.abs(e.vx) > 5 ? Math.sin(e.animTime * 10) * 4 : 0;
    ctx.save();
    ctx.translate(cx, bottomY);
    if (isDead) {
      ctx.translate(0, -8);
      ctx.rotate(-f * (1 - e.stateTimer / 0.45) * 1.4);
    } else if (hurt) {
      ctx.rotate(-f * 0.14);
    } else if (staggered) {
      ctx.translate(Math.sin(e.animTime * 22) * 1.5, 4);
    }

    // Spellcasting circle during TELEGRAPH / ATTACK
    if (!isDead && (e.state === 'TELEGRAPH' || e.state === 'ATTACK') && e.castingSpell) {
      const spellColor = e.castingSpell === 'heal' ? '#4ade80' : '#e879f9';
      ctx.save();
      ctx.strokeStyle = spellColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -34, 34 + Math.sin(e.animTime * 14) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Grounded boots
    ctx.fillStyle = '#0f0918';
    ctx.fillRect(-10 + walkStride, -8, 8, 8);
    ctx.fillRect(2 - walkStride, -8, 8, 8);

    // Layered Dark Priest Robes touching floor
    ctx.fillStyle = flash ? '#ffffff' : staggered ? '#1e3a8a' : '#1b1130';
    ctx.strokeStyle = e.castingSpell === 'heal' ? '#4ade80' : '#a855f7';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-13, -44);
    ctx.lineTo(13, -44);
    ctx.lineTo(19, -2);
    ctx.lineTo(-19, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tall Horned Miter Crown
    ctx.fillStyle = '#110a1f';
    ctx.beginPath();
    ctx.moveTo(-11, -44);
    ctx.lineTo(-7, -64);
    ctx.lineTo(0, -55);
    ctx.lineTo(7, -64);
    ctx.lineTo(11, -44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = e.castingSpell === 'heal' ? '#4ade80' : '#e879f9';
    ctx.beginPath();
    ctx.arc(f * 3, -48, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Ornate Staff resting on ground & Crystal Orb
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(f * 16, 0);
    ctx.lineTo(f * 16, -58);
    ctx.stroke();
    ctx.fillStyle = e.castingSpell === 'heal' ? '#4ade80' : '#c084fc';
    ctx.beginPath();
    ctx.arc(f * 16, -62, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // VIGIA ABISSAL: Levitating Occult Caster with Arcane Halo
    const bob = isDead ? 0 : Math.sin(e.animTime * 4) * 5;
    ctx.save();
    ctx.translate(cx, e.y + 24 + bob);

    ctx.fillStyle = flash ? '#ffffff' : staggered ? '#1e3a8a' : '#240d4a';
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(12, -8);
    ctx.lineTo(16, 26);
    ctx.lineTo(6, 18);
    ctx.lineTo(0, 29);
    ctx.lineTo(-7, 19);
    ctx.lineTo(-15, 27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#140726';
    ctx.beginPath();
    ctx.arc(0, -10, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(f * 4, -10, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = e.state === 'TELEGRAPH' ? '#fde047' : '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -e.animTime * 28;
    ctx.beginPath();
    ctx.arc(0, 2, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Hellfire Burn Indicator (from Abyssal Cerberus)
  if (!isDead && e.burnTimer > 0) {
    ctx.save();
    for (let fl = 0; fl < 3; fl++) {
      const fx = cx - e.w * 0.28 + fl * (e.w * 0.28);
      const fh = 10 + Math.sin(e.animTime * 18 + fl * 2) * 5;
      ctx.fillStyle = fl % 2 === 0 ? 'rgba(249, 115, 22, 0.85)' : 'rgba(253, 224, 71, 0.8)';
      ctx.beginPath();
      ctx.moveTo(fx - 4, bottomY - 2);
      ctx.lineTo(fx, bottomY - fh - 6);
      ctx.lineTo(fx + 4, bottomY - 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Telegraph Parry Spark
  if (!isDead && e.state === 'TELEGRAPH') {
    ctx.save();
    ctx.strokeStyle = e.castingSpell === 'heal' ? '#4ade80' : e.castingSpell === 'buff' ? '#e879f9' : '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, e.y - 12, 7.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, e.y - 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Staggered fracture ring
  if (!isDead && staggered) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(cx, e.y - 8, 12, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (!isDead && (e.health < e.maxHealth || staggered || e.buffTimer > 0)) {
    ctx.fillStyle = 'rgba(9, 8, 13, 0.85)';
    ctx.fillRect(e.x - 4, e.y - 12, e.w + 8, 5);
    ctx.fillStyle = staggered ? '#38bdf8' : e.buffTimer > 0 ? '#e879f9' : '#dc2626';
    ctx.fillRect(e.x - 4, e.y - 12, (e.w + 8) * (e.health / e.maxHealth), 5);
  }

  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, b: BossEntity, showRange: boolean) {
  if (b.state === 'WAITING') return;
  if (b.defeated && b.state === 'DEATH' && b.stateTimer <= 0) return;

  ctx.save();
  const cx = b.x + b.w / 2;
  const f = b.facing;
  const flash = b.hitFlash > 0;
  const fade = b.defeated ? Math.max(0, b.stateTimer / 2.2) : b.state === 'INTRO' ? b.introProgress : 1;
  ctx.globalAlpha = fade;

  if (showRange) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, b.y + b.h / 2, 320, 0, Math.PI * 2);
    ctx.stroke();
  }

  const phaseColor =
    b.id === 'ashen_sovereign'
      ? b.phase === 3
        ? '#ef4444'
        : b.phase === 2
        ? '#f97316'
        : '#f59e0b'
      : b.phase === 3
      ? '#ef4444'
      : b.phase === 2
      ? '#a855f7'
      : '#f59e0b';

  // Summoning Ritual Pillar during INTRO
  if (b.state === 'INTRO') {
    ctx.save();
    ctx.globalAlpha = Math.sin(b.introProgress * Math.PI) * 0.78;
    const beamW = 128 * (1 - b.introProgress * 0.35);
    const beamGrad = ctx.createLinearGradient(cx - beamW / 2, 0, cx + beamW / 2, 0);
    beamGrad.addColorStop(0, 'rgba(0,0,0,0)');
    beamGrad.addColorStop(0.5, phaseColor);
    beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(cx - beamW / 2, 48, beamW, 752);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, 798, 105 * b.introProgress, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Airborne Phase Transition Pillar & Ring OR Invulnerable Orb Levitation Barrier
  const isOrbFloat =
    b.state === 'ORB_INTRO' ||
    b.state === 'ORB_CHARGE' ||
    b.state === 'ORB_FOCUS' ||
    b.state === 'ORB_FALL';

  if (b.state === 'PHASE_TRANSITION' || isOrbFloat) {
    ctx.save();
    const tGrad = ctx.createLinearGradient(cx - 75, 0, cx + 75, 0);
    tGrad.addColorStop(0, 'rgba(0,0,0,0)');
    tGrad.addColorStop(
      0.5,
      isOrbFloat
        ? 'rgba(249, 115, 22, 0.24)'
        : b.phase === 3
        ? 'rgba(239, 68, 68, 0.32)'
        : 'rgba(168, 85, 247, 0.32)'
    );
    tGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tGrad;
    ctx.fillRect(cx - 75, 48, 150, 752);

    ctx.strokeStyle = isOrbFloat ? '#fb923c' : phaseColor;
    ctx.lineWidth = isOrbFloat ? 3 : 2.6;
    ctx.beginPath();
    ctx.arc(cx, b.y + b.h / 2, (isOrbFloat ? 86 : 74) + Math.sin(b.animTime * 10) * 8, 0, Math.PI * 2);
    ctx.stroke();

    if (isOrbFloat) {
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -b.animTime * 40;
      ctx.beginPath();
      ctx.arc(cx, b.y + b.h / 2, 100, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  const hoverY = b.state === 'PHASE_TRANSITION' || isOrbFloat ? Math.sin(b.animTime * 6) * 5 : 0;

  if (b.id === 'ashen_sovereign') {
    // IGNIS, O SOBERANO DAS CINZAS
    ctx.save();
    ctx.translate(cx, b.y + b.h + hoverY);
    if (b.state === 'STAGGERED') {
      ctx.translate(Math.sin(b.animTime * 26) * 2.5, 10);
      ctx.rotate(-f * 0.14);
    }

    // Flowing Cinder Cape
    ctx.fillStyle = b.phase === 3 ? '#450a0a' : '#211114';
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-f * 14, -124);
    ctx.quadraticCurveTo(-f * 45, -75, -f * 64, -4 + Math.sin(b.animTime * 4) * 5);
    ctx.lineTo(-f * 26, -12);
    ctx.lineTo(f * 14, -6);
    ctx.lineTo(f * 12, -120);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heavy Volcanic Greaves
    ctx.fillStyle = flash ? '#ffffff' : '#191216';
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-22, -48, 16, 48, 3);
    ctx.roundRect(6, -48, 16, 48, 3);
    ctx.fill();
    ctx.stroke();

    // Sculpted Volcanic Cuirass & Magma Chest Fissure
    ctx.fillStyle = flash ? '#ffffff' : b.state === 'STAGGERED' ? '#1e3a8a' : '#1b1418';
    ctx.beginPath();
    ctx.moveTo(-28, -124);
    ctx.lineTo(28, -124);
    ctx.lineTo(22, -46);
    ctx.lineTo(-22, -46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing magma fissure across chest
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-12, -108);
    ctx.lineTo(0, -90);
    ctx.lineTo(10, -96);
    ctx.moveTo(0, -90);
    ctx.lineTo(-2, -62);
    ctx.stroke();

    // Spiked Pauldrons
    for (const sDir of [-1, 1]) {
      ctx.fillStyle = '#291c22';
      ctx.beginPath();
      ctx.moveTo(sDir * 22, -126);
      ctx.lineTo(sDir * 40, -134);
      ctx.lineTo(sDir * 35, -108);
      ctx.lineTo(sDir * 20, -106);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Greathelm + Jagged Ember Crown
    ctx.fillStyle = flash ? '#ffffff' : '#241a1f';
    ctx.beginPath();
    ctx.moveTo(-16, -124);
    ctx.lineTo(-14, -148);
    ctx.lineTo(14, -148);
    ctx.lineTo(16, -124);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Burning visor slit
    ctx.fillStyle = phaseColor;
    ctx.fillRect(f * 2 - 4, -138, 13, 3.5);

    // Ember Crown spikes
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-17, -146);
    ctx.lineTo(-23, -168);
    ctx.lineTo(-7, -154);
    ctx.lineTo(0, -175);
    ctx.lineTo(7, -154);
    ctx.lineTo(23, -168);
    ctx.lineTo(17, -146);
    ctx.stroke();

    // Colossal Burning Greatsword
    ctx.save();
    ctx.translate(f * 24, -88);
    let bladeAngle = f * 0.42;
    if (b.state === 'ORB_INTRO' || b.state === 'ORB_CHARGE' || b.state === 'ORB_FOCUS') {
      bladeAngle = 0; // Raised straight skyward channeling energy into Cataclysm Orb!
    } else if (b.state === 'ORB_FALL') {
      bladeAngle = f * 1.45;
    } else if (b.state === 'TELEGRAPH') {
      if (b.currentAttack === 'chuva_de_cinzas') bladeAngle = 0;
      else if (b.currentAttack === 'ruptura') bladeAngle = -f * 1.45;
      else bladeAngle = -f * 1.2;
    } else if (b.state === 'ATTACK') {
      if (b.currentAttack === 'ruptura') bladeAngle = f * 1.65;
      else bladeAngle = f * 1.35;
    }
    ctx.rotate(bladeAngle);

    ctx.fillStyle = '#0d0a10';
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-12, -126);
    ctx.lineTo(0, -142);
    ctx.lineTo(12, -126);
    ctx.lineTo(9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing molten fuller
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -120);
    ctx.stroke();

    // Crossguard
    ctx.fillStyle = phaseColor;
    ctx.fillRect(-22, -4, 44, 8);
    ctx.restore();
    ctx.restore();
  } else {
    // THE FALLEN JUDGMENT: Corrupted Seraph Knight
    ctx.save();
    ctx.translate(cx, b.y + b.h + hoverY);
    if (b.state === 'STAGGERED') {
      ctx.translate(Math.sin(b.animTime * 26) * 2.5, 10);
      ctx.rotate(-f * 0.14);
    }

    // Shattered Rotating Halo behind head
    ctx.save();
    ctx.translate(0, -126);
    ctx.rotate(b.animTime * 0.55);
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0.25, Math.PI * 1.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 35, Math.PI * 1.65, Math.PI * 2.08);
    ctx.stroke();
    ctx.restore();

    // Tattered Asymmetrical Dark Feathered Wing
    const wingFlap = Math.sin(b.animTime * 3.5) * 6;
    ctx.fillStyle = b.phase === 3 ? '#450a0a' : '#1b162a';
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-f * 10, -104);
    ctx.quadraticCurveTo(-f * 52, -138 + wingFlap, -f * 84, -126 + wingFlap);
    ctx.lineTo(-f * 64, -92 + wingFlap * 0.6);
    ctx.lineTo(-f * 76, -72 + wingFlap * 0.4);
    ctx.lineTo(-f * 52, -56);
    ctx.lineTo(-f * 60, -40);
    ctx.lineTo(-f * 14, -64);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Greaves & Armored Boots
    ctx.fillStyle = flash ? '#ffffff' : '#16131f';
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-20, -46, 14, 46, 3);
    ctx.roundRect(6, -46, 14, 46, 3);
    ctx.fill();
    ctx.stroke();

    // Sculpted Seraph Cuirass
    ctx.fillStyle = flash ? '#ffffff' : b.state === 'STAGGERED' ? '#1e3a8a' : '#191423';
    ctx.beginPath();
    ctx.moveTo(-25, -114);
    ctx.lineTo(25, -114);
    ctx.lineTo(19, -45);
    ctx.lineTo(-19, -45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Corrupted Celestial Heart Core
    const coreR = 9 + Math.sin(b.animTime * 6) * 2;
    const coreGrad = ctx.createRadialGradient(0, -82, 1, 0, -82, coreR * 1.6);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, phaseColor);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -82, coreR * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Crowned Knight Helm
    ctx.fillStyle = flash ? '#ffffff' : '#261f33';
    ctx.beginPath();
    ctx.moveTo(-14, -114);
    ctx.lineTo(-12, -138);
    ctx.lineTo(0, -145);
    ctx.lineTo(12, -138);
    ctx.lineTo(14, -114);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Eye Slit
    ctx.fillStyle = phaseColor;
    ctx.fillRect(f * 3 - 3, -129, 8, 3.5);

    // Ornate Runed Judgment Greatsword
    ctx.save();
    ctx.translate(f * 22, -82);
    const bladeAngle =
      b.state === 'TELEGRAPH' ? -f * 1.15 : b.state === 'ATTACK' ? f * 1.28 : f * 0.35;
    ctx.rotate(bladeAngle);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-7, -92);
    ctx.lineTo(0, -104);
    ctx.lineTo(7, -92);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = phaseColor;
    ctx.fillRect(-16, -4, 32, 6);
    ctx.restore();
    ctx.restore();
  }

  // Boss Attack Telegraph Indicator
  if (b.state === 'TELEGRAPH') {
    ctx.save();
    ctx.strokeStyle = b.parrable ? '#38bdf8' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, b.y - 30, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = b.parrable ? '#7dd3fc' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(cx, b.y - 30, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const label =
      b.currentAttack === 'ruptura'
        ? 'PULE! [ESPAÇO/W]'
        : b.currentAttack === 'investida_sombria'
        ? 'PARRY LONGO [K]'
        : b.currentAttack === 'ultimo_suspiro'
        ? 'ÚLTIMO SUSPIRO [K]'
        : b.parrable
        ? 'PARRY [K]'
        : 'ESQUIVE [SHIFT]';
    ctx.fillText(label, cx, b.y - 50);
    ctx.restore();
  }

  // Boss Burn Indicator (from Abyssal Cerberus)
  if (!b.defeated && b.burnTimer > 0) {
    ctx.save();
    for (let fl = 0; fl < 5; fl++) {
      const fx = cx - 32 + fl * 16;
      const fh = 16 + Math.sin(b.animTime * 16 + fl * 1.5) * 7;
      ctx.fillStyle = fl % 2 === 0 ? 'rgba(249, 115, 22, 0.88)' : 'rgba(253, 224, 71, 0.82)';
      ctx.beginPath();
      ctx.moveTo(fx - 6, b.y + b.h - 2);
      ctx.lineTo(fx, b.y + b.h - fh - 10);
      ctx.lineTo(fx + 6, b.y + b.h - 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawBossStructure(
  ctx: CanvasRenderingContext2D,
  st: BossStructure,
  orb: IgnisOrbState | null,
  time: number
) {
  ctx.save();
  const cx = st.x + st.w / 2;
  const flash = st.hitFlash > 0;

  // Energy tether beam linking conduit structure to ceiling Cataclysm Orb
  if (orb && orb.phase === 'CHARGING') {
    ctx.save();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, st.y + 8);
    ctx.lineTo(orb.x, orb.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, st.y + 8);
    ctx.lineTo(orb.x, orb.y);
    ctx.stroke();
    ctx.restore();
  }

  // Carved obsidian volcanic obelisk
  ctx.fillStyle = flash ? '#ffffff' : '#181016';
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(st.x + 2, st.y + st.h);
  ctx.lineTo(st.x + 8, st.y + 14);
  ctx.lineTo(cx, st.y);
  ctx.lineTo(st.x + st.w - 8, st.y + 14);
  ctx.lineTo(st.x + st.w - 2, st.y + st.h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pulsing magma rune crystal inside obelisk
  const pulse = 0.7 + Math.sin(time * 8 + st.platformIndex) * 0.25;
  ctx.fillStyle = `rgba(251, 146, 60, ${pulse})`;
  ctx.beginPath();
  ctx.moveTo(cx, st.y + 14);
  ctx.lineTo(cx + 8, st.y + 34);
  ctx.lineTo(cx, st.y + 56);
  ctx.lineTo(cx - 8, st.y + 34);
  ctx.closePath();
  ctx.fill();

  // HP bar above structure
  ctx.fillStyle = 'rgba(9, 8, 13, 0.88)';
  ctx.fillRect(st.x - 4, st.y - 14, st.w + 8, 6);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(st.x - 4, st.y - 14, (st.w + 8) * (st.health / st.maxHealth), 6);
  ctx.restore();
}

function drawIgnisOrb(
  ctx: CanvasRenderingContext2D,
  orb: IgnisOrbState,
  boss: BossEntity,
  time: number
) {
  ctx.save();
  const bCx = boss.x + boss.w / 2;

  // Channeling skyward pillar from Ignis during ORB_INTRO or FOCUS
  if (orb.phase === 'RISING' || orb.phase === 'FOCUS') {
    ctx.save();
    const beamGrad = ctx.createLinearGradient(bCx, boss.y + 20, orb.x, orb.y);
    beamGrad.addColorStop(0, '#fde047');
    beamGrad.addColorStop(0.5, '#f97316');
    beamGrad.addColorStop(1, '#ef4444');
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = orb.phase === 'FOCUS' ? 14 : 9 * orb.beamProgress;
    ctx.beginPath();
    ctx.moveTo(bCx + boss.facing * 18, boss.y - 10);
    ctx.lineTo(orb.x, orb.y);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bCx + boss.facing * 18, boss.y - 10);
    ctx.lineTo(orb.x, orb.y);
    ctx.stroke();
    ctx.restore();
  }

  // Falling comet wake when plunging down
  if (orb.phase === 'FALLING') {
    const tailGrad = ctx.createLinearGradient(orb.x, orb.y - 190, orb.x, orb.y);
    tailGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
    tailGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.72)');
    tailGrad.addColorStop(1, '#fde047');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(orb.x - orb.radius * 0.9, orb.y);
    ctx.lineTo(orb.x, orb.y - 210);
    ctx.lineTo(orb.x + orb.radius * 0.9, orb.y);
    ctx.closePath();
    ctx.fill();
  }

  // Outer crimson-solar corona
  const coronaR = orb.radius * 2.3;
  const corona = ctx.createRadialGradient(orb.x, orb.y, orb.radius * 0.25, orb.x, orb.y, coronaR);
  corona.addColorStop(0, '#ffffff');
  corona.addColorStop(0.32, '#fde047');
  corona.addColorStop(0.65, 'rgba(239, 68, 68, 0.85)');
  corona.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, coronaR, 0, Math.PI * 2);
  ctx.fill();

  // Rotating occult rune rings around orb
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 45;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Core sphere
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCerberusSummon(ctx: CanvasRenderingContext2D, c: CerberusSummon) {
  ctx.save();
  const f = c.facing;
  const alpha = c.state === 'VANISH' ? Math.max(0, c.timer / 0.28) : 1;
  ctx.globalAlpha = alpha;
  ctx.translate(c.x, c.y);

  // Hellfire shadow aura beneath paws
  const aura = ctx.createRadialGradient(0, -34, 8, 0, -34, 84);
  aura.addColorStop(0, 'rgba(239, 68, 68, 0.42)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, -34, 84, 0, Math.PI * 2);
  ctx.fill();

  // Muscular obsidian hound torso & flaming mane
  ctx.fillStyle = '#14090e';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-f * 46, -24);
  ctx.quadraticCurveTo(-f * 26, -64, f * 18, -56);
  ctx.lineTo(f * 36, -38);
  ctx.lineTo(f * 22, -16);
  ctx.lineTo(-f * 28, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Spectral claws/legs
  ctx.strokeStyle = '#1f0c14';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-f * 28, -18);
  ctx.lineTo(-f * 40, 0);
  ctx.moveTo(f * 18, -20);
  ctx.lineTo(f * 34, 0);
  ctx.stroke();

  // Flame whip tail
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-f * 44, -26);
  ctx.quadraticCurveTo(-f * 74, -52 + Math.sin(c.animTime * 16) * 8, -f * 84, -36);
  ctx.stroke();

  // 3 Snarling Hellhound Heads!
  const jawOpen = c.state === 'BITE' ? 0.52 : 0.16;
  const headOffsets = [
    { ox: f * 24, oy: -66, scale: 0.86, rot: -0.22 * f },
    { ox: f * 38, oy: -50, scale: 1.05, rot: 0 },
    { ox: f * 22, oy: -36, scale: 0.84, rot: 0.18 * f },
  ];

  for (const hd of headOffsets) {
    ctx.save();
    ctx.translate(hd.ox, hd.oy);
    ctx.rotate(hd.rot);
    ctx.scale(hd.scale, hd.scale);

    // Upper skull & snout
    ctx.fillStyle = '#180c12';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-f * 14, -10);
    ctx.lineTo(f * 18, -8);
    ctx.lineTo(f * 28, 0);
    ctx.lineTo(f * 4, 2);
    ctx.lineTo(-f * 12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lower jaw snapping
    ctx.save();
    ctx.rotate(f * jawOpen);
    ctx.fillStyle = '#14090d';
    ctx.beginPath();
    ctx.moveTo(-f * 8, 2);
    ctx.lineTo(f * 24, 2);
    ctx.lineTo(f * 18, 8);
    ctx.lineTo(-f * 6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bone fangs
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(f * 16, 2);
    ctx.lineTo(f * 19, -4);
    ctx.lineTo(f * 22, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Upper fang + Glowing crimson eye
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(f * 18, 0);
    ctx.lineTo(f * 21, 6);
    ctx.lineTo(f * 24, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(f * 8, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawGiantBibleSummon(ctx: CanvasRenderingContext2D, gb: GiantBibleSummon) {
  ctx.save();
  const alpha = gb.state === 'LINGER' ? Math.min(1, gb.timer / 0.35) : 1;
  ctx.globalAlpha = alpha;

  // Vertical heavenly light pillar
  const pillarGrad = ctx.createLinearGradient(gb.x - gb.w * 0.5, 0, gb.x + gb.w * 0.5, 0);
  pillarGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
  pillarGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.24)');
  pillarGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = pillarGrad;
  ctx.fillRect(gb.x - gb.w * 0.5, 0, gb.w, gb.floorY);

  // Sacred Tome Body
  const left = gb.x - gb.w / 2;
  const top = gb.y;

  // Thick ivory parchment pages edge
  ctx.fillStyle = '#fefce8';
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(left + 8, top + 10, gb.w - 16, gb.h - 14, 8);
  ctx.fill();
  ctx.stroke();

  // Crimson-gold ornate leather cover plate
  const covGrad = ctx.createLinearGradient(left, top, left, top + gb.h - 16);
  covGrad.addColorStop(0, '#451a03');
  covGrad.addColorStop(0.5, '#78350f');
  covGrad.addColorStop(1, '#290f02');
  ctx.fillStyle = covGrad;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(left, top, gb.w, gb.h - 24, 10);
  ctx.fill();
  ctx.stroke();

  // Golden corner clasps & embossed Sacred Cross emblem in center
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.fillRect(gb.x - 10, top + 12, 20, gb.h - 48);
  ctx.fillRect(gb.x - 42, top + 30, 84, 18);

  // Page ribbing lines
  ctx.strokeStyle = 'rgba(161, 98, 7, 0.45)';
  ctx.lineWidth = 1.4;
  for (let py = top + gb.h - 20; py < top + gb.h - 5; py += 5) {
    ctx.beginPath();
    ctx.moveTo(left + 16, py);
    ctx.lineTo(left + gb.w - 16, py);
    ctx.stroke();
  }

  ctx.restore();
}

function drawForegroundAndVignette(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  camX: number,
  width: number,
  height: number
) {
  // Subtle dark Gothic foreground stone silhouettes at bottom corners (1.2x parallax)
  ctx.save();
  const fgX = (-camX * 1.2) % 900;
  ctx.fillStyle = 'rgba(5, 4, 9, 0.72)';
  for (let i = -1; i < 4; i++) {
    const px = fgX + i * 900;
    ctx.beginPath();
    ctx.moveTo(px, height);
    ctx.lineTo(px + 26, height - 85);
    ctx.lineTo(px + 65, height - 72);
    ctx.lineTo(px + 92, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Atmospheric dark vignette
  ctx.save();
  const vig = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    Math.min(width, height) * 0.34,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4, 3, 8, 0.58)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // Subtle screen pulse on heavy hits, parries & phase transformations
  if (engine.screenPulseTimer > 0) {
    const a = (engine.screenPulseTimer / engine.screenPulseMax) * 0.28;
    const pulseGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.25,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.75
    );
    pulseGrad.addColorStop(0, 'rgba(0,0,0,0)');
    pulseGrad.addColorStop(1, engine.screenPulseColor);
    ctx.globalAlpha = a;
    ctx.fillStyle = pulseGrad;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}
