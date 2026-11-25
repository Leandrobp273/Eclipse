import React, { useEffect, useRef } from 'react';
import { CHARACTER_CONFIGS } from '../game/characters';
import { drawCharacterSprite } from '../game/renderer';
import { CharacterConfig, CharacterId } from '../game/types';

interface CharacterSelectProps {
  selectedId: CharacterId;
  onSelect: (id: CharacterId) => void;
  onConfirm: () => void;
}

function CharacterPreviewCanvas({ characterId, active }: { characterId: CharacterId; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Subtle atmospheric pedestal backdrop
      const grad = ctx.createRadialGradient(w / 2, h * 0.52, 8, w / 2, h * 0.52, 110);
      if (characterId === 'abyssal') {
        grad.addColorStop(0, active ? 'rgba(220, 38, 38, 0.24)' : 'rgba(220, 38, 38, 0.08)');
        grad.addColorStop(1, 'rgba(9, 8, 13, 0)');
      } else {
        grad.addColorStop(0, active ? 'rgba(245, 158, 11, 0.24)' : 'rgba(56, 189, 248, 0.08)');
        grad.addColorStop(1, 'rgba(9, 8, 13, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Stone plinth line
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.22, h * 0.8);
      ctx.lineTo(w * 0.78, h * 0.8);
      ctx.stroke();

      // Periodic attack showcase when active
      const cycle = t % 4.0;
      const isAttacking = active && cycle > 2.8 && cycle < 3.4;
      const isRunning = active && cycle > 1.2 && cycle <= 2.4;

      ctx.save();
      const scale = 2.05;
      const spriteW = 28;
      const spriteH = characterId === 'abyssal' ? 62 : 56;
      const drawX = w / (2 * scale) - spriteW / 2;
      const drawY = (h * 0.8) / scale - spriteH;
      ctx.scale(scale, scale);

      const hairNodes = Array.from({ length: 6 }, (_, i) => ({
        x: drawX + spriteW / 2 - 4 - i * (isRunning ? 5.5 : 3.2),
        y: drawY + 11 + i * 5 + Math.sin(t * 4 + i * 0.7) * 1.4,
      }));

      drawCharacterSprite(ctx, characterId, {
        x: drawX,
        y: drawY,
        w: spriteW,
        h: spriteH,
        facing: 1,
        state: isAttacking ? 'ATTACKING' : isRunning ? 'RUNNING' : 'IDLE',
        animTime: t,
        vx: isRunning ? 190 : 0,
        vy: 0,
        shackleAngleL: isRunning ? Math.sin(t * 10) * 0.45 : Math.sin(t * 2.2) * 0.12,
        shackleAngleR: isRunning ? -Math.sin(t * 10) * 0.45 : Math.cos(t * 2.2) * 0.12,
        hairNodes,
        attackProgress: isAttacking ? (cycle - 2.8) / 0.6 : 0,
        comboStage: 2,
      });
      ctx.restore();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [characterId, active]);

  return <canvas ref={canvasRef} width={260} height={220} className="w-full h-[210px] block" />;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  selectedId,
  onSelect,
  onConfirm,
}) => {
  const configs: CharacterConfig[] = [CHARACTER_CONFIGS.abyssal, CHARACTER_CONFIGS.celestial];
  const selected = CHARACTER_CONFIGS[selectedId];

  return (
    <div className="min-h-screen w-full bg-[#07060b] text-[#ede9f2] flex flex-col justify-between px-6 py-8 md:px-12 overflow-y-auto relative">
      <div
        className="pointer-events-none fixed inset-0 opacity-45"
        style={{
          background:
            'radial-gradient(circle at 50% 18%, rgba(245, 158, 11, 0.12), transparent 55%), radial-gradient(circle at 18% 82%, rgba(220, 38, 38, 0.12), transparent 50%)',
        }}
      />
      <div className="relative z-10 max-w-5xl w-full mx-auto flex flex-col gap-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-amber-500/20 pb-5">
          <div>
            <p className="text-xs tracking-[0.26em] uppercase text-amber-400/90 font-medium">
              4 Salas Interconectadas · Combate &amp; 2 Chefes
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-[0.08em] text-white mt-1">
              ECLIPSE
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Escolha seu protagonista entre as duas forças primordiais. Os atributos, animações e efeitos acompanham você por todas as arenas.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {configs.map((char) => {
            const isSelected = char.id === selectedId;
            const isAbyssal = char.id === 'abyssal';
            const borderClass = isSelected
              ? isAbyssal
                ? 'border-red-500/80 bg-[#140d13] shadow-[0_0_32px_rgba(220,38,38,0.16)]'
                : 'border-amber-400/80 bg-[#10131e] shadow-[0_0_32px_rgba(245,158,11,0.16)]'
              : 'border-white/10 bg-[#0d0c14]/90 hover:border-white/25';

            return (
              <button
                key={char.id}
                type="button"
                onClick={() => onSelect(char.id)}
                className={`text-left rounded-xl border transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${borderClass}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 36 36" className="w-9 h-9 shrink-0" aria-hidden="true">
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill={isAbyssal ? '#180c12' : '#0f1322'}
                          stroke={isAbyssal ? '#dc2626' : '#f59e0b'}
                          strokeWidth="1.5"
                        />
                        {isAbyssal ? (
                          <>
                            <path
                              d="M12 13 C9 7, 5 8, 6 14 M24 13 C27 7, 31 8, 30 14"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path d="M12 14 L24 14 L22 24 L18 28 L14 24 Z" fill="#e5ddd0" />
                            <circle cx="15.5" cy="19" r="1.4" fill="#dc2626" />
                            <circle cx="20.5" cy="19" r="1.4" fill="#dc2626" />
                          </>
                        ) : (
                          <>
                            <circle cx="18" cy="18" r="9" fill="none" stroke="#fde047" strokeWidth="1.4" />
                            <path d="M18 6 L19.8 14 L28 18 L19.8 22 L18 30 L16.2 22 L8 18 L16.2 14 Z" fill="#fef08a" />
                          </>
                        )}
                      </svg>
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-white tracking-wide">
                          {char.name}
                        </h2>
                        <p className={`text-xs mt-0.5 font-medium ${isAbyssal ? 'text-red-400' : 'text-amber-300'}`}>
                          {char.subtitle} · Força {isAbyssal ? 'Abissal' : 'Celestial'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                        isSelected
                          ? isAbyssal
                            ? 'text-red-400'
                            : 'text-amber-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {isSelected ? 'Selecionado' : 'Selecionar'}
                    </span>
                  </div>

                  <div className="my-3 rounded-lg bg-[#08070c] border border-white/10 overflow-hidden">
                    <CharacterPreviewCanvas characterId={char.id} active={isSelected} />
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">{char.description}</p>
                  <p className="text-sm text-slate-400 leading-relaxed mt-2">{char.gameplayIdentity}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 shrink-0">Mobilidade</span>
                    <span className="text-slate-200 text-right font-mono-tabular">
                      {char.movementSummary}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 shrink-0">Combate</span>
                    <span className="text-slate-200 text-right font-mono-tabular">
                      {char.combatSummary}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-1 border-t border-white/5">
                    <span className="text-slate-400 shrink-0">Habilidade</span>
                    <span className={`text-right ${isAbyssal ? 'text-red-300' : 'text-amber-200'}`}>
                      {char.specialAbilitySummary}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/10">
          <div className="text-xs text-slate-400 font-mono-tabular">
            Controles: A/D Mover · Espaço / W Pular · Shift Dash · J Combo · K Parry · L Curar · U Habilidade · E Porta · ESC Mapa · F3 Debug
          </div>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              selected.id === 'abyssal'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            Iniciar como {selected.name}
          </button>
        </footer>
      </div>
    </div>
  );
};
