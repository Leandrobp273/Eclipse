import React from 'react';
import { Map, Terminal, Volume2, VolumeX } from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  debugOpen: boolean;
  muted: boolean;
  onOpenMap: () => void;
  onToggleDebug: () => void;
  onToggleMute: () => void;
  onRespawn: () => void;
}

const STATE_LABELS: Record<string, string> = {
  IDLE: 'Parado',
  RUNNING: 'Correndo',
  JUMPING: 'Pulando',
  FALLING: 'Caindo',
  DASHING: 'Dash',
  ATTACKING: 'Atacando',
  PARRYING: 'Parry',
  HEALING: 'Curando',
  HURT: 'Ferido',
  DEAD: 'Caído',
};

function SoulVesselOrb({
  essencePct,
  essence,
  isAbyssal,
  healReady,
}: {
  essencePct: number;
  essence: number;
  isAbyssal: boolean;
  healReady: boolean;
}) {
  const fillY = 58 - (essencePct / 100) * 52;
  const liquidTop = isAbyssal ? '#ef4444' : '#fde047';
  const liquidBot = isAbyssal ? '#7f1d1d' : '#d97706';
  const rimStroke = healReady ? (isAbyssal ? '#fca5a5' : '#fef08a') : '#94a3b8';

  return (
    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 64 64" className="w-16 h-16" aria-hidden="true">
        <defs>
          <clipPath id="soul-vessel-clip">
            <circle cx="32" cy="32" r="24" />
          </clipPath>
          <linearGradient id="soul-liquid-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={liquidTop} />
            <stop offset="100%" stopColor={liquidBot} />
          </linearGradient>
        </defs>

        {/* Outer wrought-iron / bone vessel ring */}
        <circle cx="32" cy="32" r="28" fill="#070a0f" stroke="#334155" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="24.5" fill="#0d131a" stroke={rimStroke} strokeWidth="1.8" />

        {/* Liquid Essence Fill */}
        <g clipPath="url(#soul-vessel-clip)">
          <rect x="6" y={fillY} width="52" height="56" fill="url(#soul-liquid-grad)" opacity="0.88" />
          <ellipse
            cx="32"
            cy={fillY}
            rx="24"
            ry="3.2"
            fill="#ffffff"
            opacity="0.45"
          />
        </g>

        {/* Hollow Knight-inspired carved crest mask inside vessel */}
        {isAbyssal ? (
          <g opacity="0.9">
            <path
              d="M23 22 C19 15, 14 16, 15 23 M41 22 C45 15, 50 16, 49 23"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M22 25 Q32 21 42 25 L40 40 Q32 45 24 40 Z"
              fill="#f1f5f9"
              stroke="#0f172a"
              strokeWidth="1.4"
            />
            <ellipse cx="27.5" cy="32.5" rx="2.4" ry="3.2" fill="#09080d" />
            <ellipse cx="36.5" cy="32.5" rx="2.4" ry="3.2" fill="#09080d" />
          </g>
        ) : (
          <g opacity="0.92">
            <circle cx="32" cy="32" r="11" fill="none" stroke="#ffffff" strokeWidth="1.6" />
            <path
              d="M32 17 L34.8 29.2 L47 32 L34.8 34.8 L32 47 L29.2 34.8 L17 32 L29.2 29.2 Z"
              fill="#ffffff"
            />
          </g>
        )}

        {/* Decorative horn wings extending right from vessel */}
        <path
          d="M54 22 L62 18 L57 28 Z M54 42 L62 46 L57 36 Z"
          fill="#cbd5e1"
          stroke="#1e293b"
          strokeWidth="1"
        />
      </svg>
      <span className="absolute -bottom-1 bg-[#070a0f]/95 border border-slate-600/70 px-1.5 py-px rounded text-[10px] font-mono-tabular font-semibold text-slate-100">
        {essence}
      </span>
    </div>
  );
}

function HealthMaskSlot({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 22 26" className="w-4 h-5 shrink-0" aria-hidden="true">
      <path
        d="M11 2 L19 7 L17 18 L11 24 L5 18 L3 7 Z"
        fill={filled ? '#f1f5f9' : '#11161f'}
        stroke={filled ? '#94a3b8' : '#334155'}
        strokeWidth="1.5"
      />
      {filled && (
        <>
          <ellipse cx="8.2" cy="12" rx="1.6" ry="2.2" fill="#090a0f" />
          <ellipse cx="13.8" cy="12" rx="1.6" ry="2.2" fill="#090a0f" />
        </>
      )}
    </svg>
  );
}

function AbilityIcon({
  kind,
}: {
  kind: 'dash' | 'parry' | 'heal' | 'teleport' | 'revive' | 'wings' | 'revolver' | 'ultimate';
}) {
  if (kind === 'dash') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M4 12 L18 12 M13 6 L20 12 L13 18 M3 8 L9 8 M3 16 L8 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'parry') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M12 3 L19 6.5 V12.5 C19 17 15.5 20 12 21.5 C8.5 20 5 17 5 12.5 V6.5 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M9 12 L11.5 14.5 L15.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'heal') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M12 3.5 C9.5 8 7 10.8 7 14 A5 5 0 0 0 17 14 C17 10.8 14.5 8 12 3.5 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="M12 11 V17 M9 14 H15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'teleport') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2" />
        <path d="M8 15 L16 9 M16 9 L11.5 8.5 M16 9 L15.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'wings') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M12 15 C9 10, 4 6, 2 7 C4 11, 5 13, 8 14 C5 15, 4 17, 6 18 C9 18, 11 16, 12 15 Z M12 15 C15 10, 20 6, 22 7 C20 11, 19 13, 16 14 C19 15, 20 17, 18 18 C15 18, 13 16, 12 15 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'revolver') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M3 10 H19 V12.5 H11 L9 18 H6 L7.5 12.5 H3 Z M13 7.5 H16 V10 H13 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'ultimate') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M12 2.5 L15 9 L21.5 12 L15 15 L12 21.5 L9 15 L2.5 12 L9 9 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        d="M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  debugOpen,
  muted,
  onOpenMap,
  onToggleDebug,
  onToggleMute,
  onRespawn,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const essPct = Math.max(0, Math.min(100, (hud.essence / hud.maxEssence) * 100));
  const ragePct = Math.max(0, Math.min(100, (hud.rage / Math.max(1, hud.maxRage)) * 100));
  const ultPct = Math.max(0, Math.min(100, (hud.ultimateCharge / Math.max(1, hud.maxUltimateCharge)) * 100));
  const ultReady = hud.ultimateCharge >= hud.maxUltimateCharge;
  const dashReady = hud.dashCooldown <= 0.01;
  const parryReady = hud.parryCooldown <= 0.01;
  const healReady = hud.essence >= hud.healCost && hud.health < hud.maxHealth;
  const teleportReady = hud.abyssalTeleportCooldown <= 0.05;
  const isAbyssal = hud.characterId === 'abyssal';

  const totalMasks = 6;
  const filledMasks = Math.ceil((hud.health / hud.maxHealth) * totalMasks);

  const bossPhaseLabel =
    hud.boss.id === 'ashen_sovereign'
      ? hud.boss.phase === 1
        ? 'Fase I · Soberano da Espada'
        : hud.boss.phase === 2
        ? 'Fase II · Chama Profana'
        : 'Fase III · Último Suspiro'
      : hud.boss.phase === 1
      ? 'Fase I · Guardião Celestial'
      : hud.boss.phase === 2
      ? 'Fase II · Guardião Corrompido'
      : 'Fase III · Julgamento Abissal';

  const introOpacity = hud.bossIntroBanner.active
    ? hud.bossIntroBanner.progress < 0.15
      ? hud.bossIntroBanner.progress / 0.15
      : hud.bossIntroBanner.progress > 0.78
      ? Math.max(0, (1 - hud.bossIntroBanner.progress) / 0.22)
      : 1
    : 0;

  return (
    <>
      {hud.bossIntroBanner.active && introOpacity > 0.01 && (
        <div
          className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[2px] px-6 text-center transition-opacity duration-150"
          style={{ opacity: introOpacity }}
        >
          <div className="w-56 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent mb-5" />
          <p className="text-xs md:text-sm uppercase tracking-[0.38em] text-amber-300/90 font-medium">
            {hud.bossIntroBanner.title}
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-[0.12em] text-white mt-3 drop-shadow-[0_4px_26px_rgba(239,68,68,0.5)]">
            {hud.bossIntroBanner.name}
          </h2>
          <div className="w-72 h-px bg-gradient-to-r from-transparent via-red-500/80 to-transparent mt-5" />
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 md:p-5 select-none">
        {/* Top Row */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: Hollow Knight-Inspired Soul Vessel + Masks + Ira / Asas Frame */}
          <div className="bg-[#070a0f]/88 backdrop-blur-md border border-slate-500/25 rounded-xl px-4 py-3.5 min-w-[325px] max-w-[385px] shadow-[0_14px_36px_rgba(0,0,0,0.72)]">
            <div className="flex items-center gap-3.5">
              <SoulVesselOrb
                essencePct={essPct}
                essence={hud.essence}
                isAbyssal={isAbyssal}
                healReady={healReady}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-white tracking-wider truncate">
                    {hud.characterName}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-slate-300 shrink-0">
                    {hud.health} / {hud.maxHealth}
                  </span>
                </div>

                {/* Sculpted Health Masks + Precision Bar */}
                <div className="flex items-center gap-1 mt-1.5">
                  {Array.from({ length: totalMasks }).map((_, idx) => (
                    <HealthMaskSlot key={idx} filled={idx < filledMasks} />
                  ))}
                  <span className="ml-auto text-[10px] font-mono-tabular text-slate-400">
                    {STATE_LABELS[hud.playerState] ?? hud.playerState}
                  </span>
                </div>

                <div className="mt-1.5 relative h-2 w-full bg-[#0f131a] rounded-sm overflow-hidden border border-slate-700/70">
                  <div
                    className={`h-full transition-all duration-150 ${
                      isAbyssal
                        ? 'bg-gradient-to-r from-red-800 via-red-500 to-rose-300'
                        : 'bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200'
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Abyssal Rage Bar ("Barra de Ira") OR Celestial Wings Indicator */}
            {isAbyssal ? (
              <div className="mt-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] font-mono-tabular mb-1">
                  <span className="flex items-center gap-1.5 text-amber-200 uppercase tracking-wider font-semibold">
                    <AbilityIcon kind="revolver" />
                    <span>Barra de Ira · Revólver [I]</span>
                  </span>
                  <span
                    className={
                      hud.revolverActive || hud.revolverReady ? 'text-yellow-300 font-bold' : 'text-red-300'
                    }
                  >
                    {hud.revolverActive
                      ? 'DISPARANDO!'
                      : hud.revolverReady
                      ? 'PRONTO [I]'
                      : `${hud.rage} / ${hud.maxRage}`}
                  </span>
                </div>
                <div className="relative h-2.5 w-full bg-[#13080b] rounded-sm overflow-hidden border border-red-900/70">
                  <div
                    className={`h-full transition-all duration-150 ${
                      hud.revolverActive || hud.revolverReady
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-200 to-white'
                        : 'bg-gradient-to-r from-orange-700 via-red-500 to-amber-400'
                    }`}
                    style={{ width: `${hud.revolverActive ? 100 : ragePct}%` }}
                  />
                  <div className="absolute inset-0 flex justify-evenly pointer-events-none">
                    <span className="w-px h-full bg-black/40" />
                    <span className="w-px h-full bg-black/40" />
                    <span className="w-px h-full bg-black/40" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono-tabular">
                <span className="flex items-center gap-1.5 text-amber-200 uppercase tracking-wider font-semibold">
                  <AbilityIcon kind="wings" />
                  <span>Asas Celestiais (Pulo Duplo)</span>
                </span>
                <span className={hud.canDoubleJump ? 'text-yellow-300 font-semibold' : 'text-slate-500'}>
                  {hud.canDoubleJump ? 'DISPONÍVEL' : 'NO AR'}
                </span>
              </div>
            )}

            {/* Combo & Ultimate Charge Bar */}
            <div className="mt-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-mono-tabular mb-1">
                <span className="flex items-center gap-1.5 text-slate-200 uppercase tracking-wider font-semibold">
                  <AbilityIcon kind="ultimate" />
                  <span>{isAbyssal ? 'Ultimate · Cérbero [O]' : 'Ultimate · Bíblia [O]'}</span>
                </span>
                <span className={ultReady ? 'text-yellow-300 font-bold' : 'text-slate-300'}>
                  {hud.comboCount > 0 ? `${hud.comboCount}x · ` : ''}
                  {ultReady ? 'PRONTA [O]' : `${ultPct}%`}
                </span>
              </div>
              <div className="relative h-2 w-full bg-[#0d1018] rounded-sm overflow-hidden border border-slate-700/70">
                <div
                  className={`h-full transition-all duration-150 ${
                    ultReady
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-200 to-white'
                      : isAbyssal
                      ? 'bg-gradient-to-r from-rose-800 via-red-500 to-amber-400'
                      : 'bg-gradient-to-r from-amber-700 via-amber-400 to-yellow-200'
                  }`}
                  style={{ width: `${ultPct}%` }}
                />
              </div>
            </div>

            {/* Ability Icons Strip */}
            <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-5 gap-1.5">
              <div
                className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-[10px] font-mono-tabular ${
                  dashReady
                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                    : 'border-white/10 bg-black/30 text-slate-500'
                }`}
              >
                <AbilityIcon kind="dash" />
                <span className="mt-0.5">{dashReady ? 'SHIFT' : `${hud.dashCooldown.toFixed(1)}s`}</span>
              </div>

              <div
                className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-[10px] font-mono-tabular ${
                  parryReady
                    ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                    : 'border-white/10 bg-black/30 text-slate-500'
                }`}
              >
                <AbilityIcon kind="parry" />
                <span className="mt-0.5">{parryReady ? 'K' : `${hud.parryCooldown.toFixed(1)}s`}</span>
              </div>

              <div
                className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-[10px] font-mono-tabular ${
                  healReady
                    ? 'border-emerald-400/45 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-black/30 text-slate-500'
                }`}
              >
                <AbilityIcon kind="heal" />
                <span className="mt-0.5">
                  {hud.healProgress > 0 ? `${Math.round(hud.healProgress * 100)}%` : 'L'}
                </span>
              </div>

              {isAbyssal ? (
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-[10px] font-mono-tabular ${
                    hud.abyssalEmpoweredTimer > 0
                      ? 'border-red-400 bg-red-500/25 text-red-200'
                      : teleportReady
                      ? 'border-red-400/50 bg-red-500/10 text-red-300'
                      : 'border-white/10 bg-black/30 text-slate-500'
                  }`}
                >
                  <AbilityIcon kind="teleport" />
                  <span className="mt-0.5">
                    {hud.abyssalEmpoweredTimer > 0
                      ? 'STUN'
                      : teleportReady
                      ? 'U'
                      : `${hud.abyssalTeleportCooldown.toFixed(0)}s`}
                  </span>
                </div>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-[10px] font-mono-tabular ${
                    hud.celestialReviveAvailable
                      ? 'border-amber-300/60 bg-amber-400/15 text-amber-200'
                      : 'border-white/10 bg-black/30 text-slate-600'
                  }`}
                >
                  <AbilityIcon kind="revive" />
                  <span className="mt-0.5">{hud.celestialReviveAvailable ? 'GRAÇA' : 'USADA'}</span>
                </div>
              )}

              <div
                className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-[10px] font-mono-tabular ${
                  ultReady
                    ? 'border-yellow-300 bg-amber-400/20 text-yellow-200'
                    : 'border-white/10 bg-black/30 text-slate-500'
                }`}
              >
                <AbilityIcon kind="ultimate" />
                <span className="mt-0.5">{ultReady ? 'O' : `${ultPct}%`}</span>
              </div>
            </div>
          </div>

          {/* Center: Sanctum / Room Crest */}
          <div className="hidden lg:flex flex-col items-center text-center bg-[#070a0f]/84 backdrop-blur-md border border-slate-500/25 rounded-xl px-6 py-2.5 shadow-lg">
            <span className="font-display text-sm font-semibold text-amber-200 tracking-wider">
              {hud.roomName}
            </span>
            <span className="text-xs text-slate-400 mt-0.5">
              {hud.roomId === 'combat_arena'
                ? `${hud.roomSubtitle} · Inimigos restantes: ${hud.room2EnemiesAlive}/${hud.room2EnemiesTotal}`
                : hud.roomId === 'swarm_crypt'
                ? `${hud.roomSubtitle} · Crias restantes: ${hud.swarmCryptEnemiesAlive}/${hud.swarmCryptEnemiesTotal}`
                : hud.roomId === 'colossus_hall'
                ? `${hud.roomSubtitle} · Inimigos restantes: ${hud.colossusHallEnemiesAlive}/${hud.colossusHallEnemiesTotal}`
                : hud.roomSubtitle}
            </span>
          </div>

          {/* Right: Interactive Controls */}
          <div className="pointer-events-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenMap}
              className="px-3.5 py-2 rounded-lg bg-[#070a0f]/90 hover:bg-slate-800/90 border border-amber-500/25 text-xs font-medium text-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-md"
            >
              <Map className="w-3.5 h-3.5 text-amber-300" />
              <span>Mapa (ESC)</span>
            </button>
            <button
              type="button"
              onClick={onToggleDebug}
              className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-md ${
                debugOpen
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-[#070a0f]/90 hover:bg-slate-800/90 border-white/15 text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Debug (F3)</span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
              className="p-2 rounded-lg bg-[#070a0f]/90 hover:bg-slate-800/90 border border-white/15 text-slate-200 transition-colors cursor-pointer shadow-md"
            >
              {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
            </button>
          </div>
        </div>

        {/* Center Prompts */}
        <div className="flex flex-col items-center justify-center gap-3">
          {hud.orbCountdown !== null && (
            <div className="bg-[#16070a]/92 backdrop-blur-md border border-red-500/70 rounded-xl px-7 py-3 text-center shadow-[0_0_32px_rgba(239,68,68,0.45)]">
              <p className="text-[11px] uppercase tracking-[0.26em] text-amber-300 font-semibold">
                Orbe do Cataclisma · Quebre as 4 Estruturas nas Plataformas
              </p>
              <div className="flex items-baseline justify-center gap-5 mt-1">
                <span className="font-mono-tabular text-4xl font-bold text-red-400">
                  {hud.orbCountdown.toFixed(1)}s
                </span>
                <span className="font-mono-tabular text-sm text-amber-200">
                  Estruturas restantes: {hud.structuresRemaining} / {hud.structuresTotal}
                </span>
              </div>
            </div>
          )}

          {hud.victoryBannerTimer > 0 && (
            <div className="bg-[#0a0c12]/95 border border-amber-400/60 rounded-xl px-8 py-4 text-center shadow-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-300">Vitória Conquistada</p>
              <h2 className="font-display text-2xl font-semibold text-white mt-1">
                {hud.victoryBossName} DERROTADO
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                +50 Essência restaurada · Passagens da sala liberadas
              </p>
            </div>
          )}

          {hud.nearbyDoorLabel && !hud.isDead && (
            <div className="bg-[#070a0f]/92 border border-amber-400/45 rounded-lg px-4 py-2 text-xs text-amber-100 font-medium shadow-lg">
              {hud.nearbyDoorLocked
                ? 'Porta selada até que o chefe da sala seja derrotado'
                : `Pressione E para entrar em ${hud.nearbyDoorLabel}`}
            </div>
          )}

          {hud.isDead && (
            <div className="pointer-events-auto bg-[#0f090e]/95 border border-red-500/50 rounded-xl px-8 py-6 text-center max-w-sm shadow-2xl">
              <h2 className="font-display text-2xl font-semibold text-red-400">VOCÊ CAIU</h2>
              <p className="text-sm text-slate-300 mt-1.5">
                Sua essência retornará à entrada desta sala para tentar novamente.
              </p>
              <button
                type="button"
                onClick={onRespawn}
                className="mt-4 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Renascer na Sala
              </button>
            </div>
          )}
        </div>

        {/* Bottom: Ornate Boss Bar + Controls Strip */}
        <div className="flex flex-col items-center gap-2.5">
          {hud.boss.visible && !hud.boss.defeated && hud.boss.state !== 'INTRO' && (
            <div className="w-full max-w-2xl bg-[#070a0f]/92 backdrop-blur-md border border-red-500/35 rounded-xl px-5 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <span className="font-display text-sm font-semibold text-red-100 tracking-[0.12em]">
                  {hud.boss.name}
                </span>
                <span className="text-xs font-mono-tabular text-amber-300">
                  {bossPhaseLabel} · {hud.boss.health}/{hud.boss.maxHealth}
                </span>
              </div>
              <div className="relative h-3.5 w-full bg-[#13080d] rounded-sm overflow-hidden border border-white/15">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-300/60"
                  style={{ width: `${Math.max(0, (hud.boss.displayHealth / hud.boss.maxHealth) * 100)}%` }}
                />
                <div
                  className={`relative h-full transition-all duration-75 ${
                    hud.boss.phase === 3
                      ? 'bg-gradient-to-r from-red-800 via-red-600 to-rose-400'
                      : hud.boss.phase === 2
                      ? 'bg-gradient-to-r from-purple-800 via-purple-500 to-fuchsia-400'
                      : 'bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-300'
                  }`}
                  style={{ width: `${Math.max(0, (hud.boss.health / hud.boss.maxHealth) * 100)}%` }}
                />
                {/* Phase Threshold Notches (30% & 65%) */}
                <div className="absolute inset-y-0 w-0.5 bg-white/40" style={{ left: '30%' }} />
                <div className="absolute inset-y-0 w-0.5 bg-white/40" style={{ left: '65%' }} />
              </div>
            </div>
          )}

          <div className="bg-[#070a0f]/84 backdrop-blur-md border border-white/10 rounded-lg px-4 py-1.5 text-[11px] font-mono-tabular text-slate-300 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>A/D Mover</span>
            <span aria-hidden="true">·</span>
            <span>Espaço / W Pular</span>
            <span aria-hidden="true">·</span>
            <span>Shift + WASD Dash</span>
            <span aria-hidden="true">·</span>
            <span>J Combo</span>
            <span aria-hidden="true">·</span>
            <span>K Parry</span>
            <span aria-hidden="true">·</span>
            <span>L Curar</span>
            <span aria-hidden="true">·</span>
            <span>U Habilidade</span>
            <span aria-hidden="true">·</span>
            {isAbyssal && (
              <>
                <span>I Revólver</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>O Ultimate</span>
            <span aria-hidden="true">·</span>
            <span>E Entrar</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300">ESC Mapa</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-300">F3 Debug</span>
          </div>
        </div>
      </div>
    </>
  );
};
