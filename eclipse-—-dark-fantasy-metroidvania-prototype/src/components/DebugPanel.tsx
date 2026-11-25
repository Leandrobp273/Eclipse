import React from 'react';
import { DebugOptions, DebugSnapshot } from '../game/types';

interface DebugPanelProps {
  debug: DebugSnapshot;
  options: DebugOptions;
  onToggleOption: (key: keyof DebugOptions) => void;
  onResetBoss: () => void;
  onBossFullHp: () => void;
  onForceBossPhase: () => void;
  onToggleBossAI: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  debug,
  options,
  onToggleOption,
  onResetBoss,
  onBossFullHp,
  onForceBossPhase,
  onToggleBossAI,
}) => {
  return (
    <aside
      aria-label="Painel de Debug"
      className="fixed top-20 right-4 z-20 w-76 bg-[#0a0b12]/92 backdrop-blur-md border border-sky-400/30 rounded-lg p-3.5 text-xs font-mono-tabular text-slate-200 shadow-2xl max-h-[76vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
        <span className="font-semibold text-sky-300">Telemetria &amp; Debug (F3)</span>
        <span className="text-emerald-400">{debug.fps} FPS</span>
      </div>

      {/* Player Physics & State */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Estado:</span>
          <span className="text-amber-300">{debug.state}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Vel. Horizontal (vx):</span>
          <span>{debug.vx.toFixed(1)} px/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Vel. Vertical (vy):</span>
          <span>{debug.vy.toFixed(1)} px/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Posição (x, y):</span>
          <span>
            {debug.x}, {debug.y}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">No Chão (grounded):</span>
          <span className={debug.grounded ? 'text-emerald-400' : 'text-slate-400'}>
            {debug.grounded ? 'true' : 'false'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Dash Ativo:</span>
          <span className={debug.dashing ? 'text-amber-300' : 'text-slate-400'}>
            {debug.dashing ? 'true' : 'false'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Recarga Dash:</span>
          <span>{debug.dashCooldown.toFixed(2)}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Vida / Essência:</span>
          <span>
            {debug.health} HP / {debug.essence} ESS
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Janela Parry / Invuln:</span>
          <span>
            {debug.parryWindowActive ? 'PARRY' : '-'} / {debug.invulnActive ? 'INVULN' : '-'}
          </span>
        </div>
      </div>

      {/* Visual Debug Toggles */}
      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
        <div className="text-[11px] text-slate-400 mb-1">Ferramentas Visuais</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onToggleOption('showHitboxes')}
            className={`px-2 py-1.5 rounded border text-[11px] cursor-pointer ${
              options.showHitboxes
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'border-white/10 hover:bg-white/5 text-slate-300'
            }`}
          >
            Hitboxes: {options.showHitboxes ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => onToggleOption('showDetectionRanges')}
            className={`px-2 py-1.5 rounded border text-[11px] cursor-pointer ${
              options.showDetectionRanges
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'border-white/10 hover:bg-white/5 text-slate-300'
            }`}
          >
            Alcance IA: {options.showDetectionRanges ? 'ON' : 'OFF'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onToggleOption('godMode')}
          className={`w-full px-2 py-1.5 rounded border text-[11px] cursor-pointer ${
            options.godMode
              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
              : 'border-white/10 hover:bg-white/5 text-slate-300'
          }`}
        >
          Modo Invulnerável (Teste): {options.godMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Boss Telemetry & Dev Controls (Rooms 3 & 4) */}
      {(debug.roomId === 'boss_arena' || debug.roomId === 'ember_sanctum') && (
        <div className="mt-3 pt-2.5 border-t border-red-500/20 space-y-1 text-[11px]">
          <div className="text-red-300 font-semibold mb-1">
            Chefe · {debug.boss.id === 'ashen_sovereign' ? 'Ignis, Soberano das Cinzas' : 'The Fallen Judgment'}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">HP / Fase:</span>
            <span>
              {debug.boss.health}/{debug.boss.maxHealth} (Fase {debug.boss.phase})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Estado IA:</span>
            <span className="text-amber-300">{debug.boss.state}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Ataque:</span>
            <span>{debug.boss.currentAttack}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Recarga / Distância:</span>
            <span>
              {debug.boss.attackCooldown.toFixed(2)}s / {debug.boss.distanceToPlayer}px
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Atordoado / Pausado:</span>
            <span>
              {debug.boss.staggered ? 'SIM' : 'NÃO'} / {debug.boss.aiPaused ? 'SIM' : 'NÃO'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2">
            <button
              type="button"
              onClick={onResetBoss}
              className="px-2 py-1.5 rounded border border-white/10 hover:bg-white/5 text-slate-200 cursor-pointer"
            >
              Resetar Chefe
            </button>
            <button
              type="button"
              onClick={onBossFullHp}
              className="px-2 py-1.5 rounded border border-white/10 hover:bg-white/5 text-slate-200 cursor-pointer"
            >
              HP Chefe 100%
            </button>
            <button
              type="button"
              onClick={onForceBossPhase}
              className="px-2 py-1.5 rounded border border-white/10 hover:bg-white/5 text-slate-200 cursor-pointer"
            >
              Forçar Fase
            </button>
            <button
              type="button"
              onClick={onToggleBossAI}
              className={`px-2 py-1.5 rounded border cursor-pointer ${
                debug.boss.aiPaused
                  ? 'bg-red-500/20 border-red-400 text-red-200'
                  : 'border-white/10 hover:bg-white/5 text-slate-200'
              }`}
            >
              {debug.boss.aiPaused ? 'Retomar IA' : 'Pausar IA'}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
