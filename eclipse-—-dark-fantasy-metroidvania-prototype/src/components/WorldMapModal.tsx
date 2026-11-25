import React, { useState } from 'react';
import { Compass, RotateCcw, Users, X } from 'lucide-react';
import { ROOMS } from '../game/rooms';
import { HudSnapshot, RoomId } from '../game/types';

interface WorldMapModalProps {
  hud: HudSnapshot;
  playerX: number;
  playerY: number;
  onClose: () => void;
  onTravelToRoom: (roomId: RoomId) => void;
  onResetRoom: () => void;
  onSwitchCharacter: () => void;
}

const ROOM_ORDER: RoomId[] = [
  'movement_lab',
  'combat_arena',
  'boss_arena',
  'swarm_crypt',
  'colossus_hall',
  'ember_sanctum',
];

const ROOM_DESCRIPTIONS: Record<RoomId, { details: string; hazard: string }> = {
  movement_lab: {
    details:
      'Santuário neutro projetado para calibrar aceleração, desaceleração, pulo variável, coyote time, dash de 8 direções e controle aéreo através das estações A–H.',
    hazard: 'Nenhum inimigo · Zona segura',
  },
  combat_arena: {
    details:
      'Catacumbas subterrâneas com plataformas em múltiplos níveis. Ideal para praticar combos de 3 golpes, parry cronometrado, canalização de cura e o Passo Sombrio.',
    hazard: '3 tipos de inimigos: Lacaio Abissal, Caçador Abissal e Vigia Abissal',
  },
  boss_arena: {
    details:
      'Catedral profanada onde aguarda The Fallen Judgment (1080 HP). Possui 3 fases com teletransporte aéreo ao centro, mudança cromática da arena e portais abissais únicos na fase final que exigem abrigo sob as plataformas.',
    hazard: 'Chefe I: The Fallen Judgment (3 Fases)',
  },
  swarm_crypt: {
    details:
      'Cripta infestada por 10 Crias Abissais pequenas, frágeis, voadoras e extremamente rápidas. Excelente setor para carregar combos de Ultimate e limpar enxames aéreos.',
    hazard: '10 Crias Abissais Voadoras (baixa vida, ataques velozes)',
  },
  colossus_hall: {
    details:
      'Salão guardado por 3 Colossos de Ferro pesados e um Sacerdote Sombrio que conjura magia de cura em área com alta recarga e magia de fortalecimento nos aliados.',
    hazard: '3 Colossos de Ferro + 1 Sacerdote Sombrio',
  },
  ember_sanctum: {
    details:
      'Forja ancestral marcada por uma espada colossal cravada na pedra. Lar de Ignis, o Soberano das Cinzas, que invoca espadas teleguiadas a partir da Fase II e um Orbe do Cataclisma de 15s na Fase III.',
    hazard: 'Chefe Final: Ignis, o Soberano das Cinzas (3 Fases)',
  },
};

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  hud,
  playerX,
  playerY,
  onClose,
  onTravelToRoom,
  onResetRoom,
  onSwitchCharacter,
}) => {
  const [inspectedRoom, setInspectedRoom] = useState<RoomId>(hud.roomId);
  const activeDef = ROOMS[inspectedRoom];
  const meta = ROOM_DESCRIPTIONS[inspectedRoom];

  const currentRoomDef = ROOMS[hud.roomId];
  const normX = Math.max(0.05, Math.min(0.95, playerX / currentRoomDef.width));
  const normY = Math.max(0.15, Math.min(0.85, playerY / currentRoomDef.height));

  return (
    <div
      className="fixed inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Mapa do Mundo"
    >
      <div className="w-full max-w-5xl bg-[#0c0a13] border border-amber-500/25 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/15">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-xl font-semibold text-white tracking-wide">
                Mapa do Mundo · Jogo Pausado
              </h2>
              <p className="text-xs text-slate-400">
                Pressione ESC novamente ou clique em Continuar para retornar ao combate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mapa"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-[#08070c] border border-white/10 rounded-lg p-5 md:p-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
              <span>Setores Interconectados de ECLIPSE</span>
              <span className="font-mono-tabular text-amber-300">
                Localização atual: {ROOMS[hud.roomId].name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center relative">
              {ROOM_ORDER.map((rid, idx) => {
                const def = ROOMS[rid];
                const isCurrent = hud.roomId === rid;
                const isInspected = inspectedRoom === rid;

                const statusText =
                  rid === 'movement_lab'
                    ? 'Zona Segura'
                    : rid === 'combat_arena'
                    ? `${hud.room2EnemiesAlive}/${hud.room2EnemiesTotal} Inimigos`
                    : rid === 'swarm_crypt'
                    ? `${hud.swarmCryptEnemiesAlive}/${hud.swarmCryptEnemiesTotal} Crias`
                    : rid === 'colossus_hall'
                    ? `${hud.colossusHallEnemiesAlive}/${hud.colossusHallEnemiesTotal} Inimigos`
                    : rid === 'boss_arena'
                    ? hud.fallenJudgmentDefeated
                      ? 'Derrotado'
                      : 'Chefe I'
                    : hud.ashenSovereignDefeated
                    ? 'Derrotado'
                    : 'Chefe Final';

                const isBossRoomUndefeated =
                  (rid === 'boss_arena' && !hud.fallenJudgmentDefeated) ||
                  (rid === 'ember_sanctum' && !hud.ashenSovereignDefeated);

                return (
                  <div key={rid} className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => setInspectedRoom(rid)}
                      className={`w-full text-left rounded-lg border p-3.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isInspected
                          ? 'border-amber-400/80 bg-[#171423]'
                          : isCurrent
                          ? 'border-sky-400/50 bg-[#12131f]'
                          : 'border-white/10 bg-[#0f0e17] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-2">
                        <span className="text-[11px] font-mono-tabular text-slate-400">
                          SALA 0{idx + 1}
                        </span>
                        <span
                          className={`text-[11px] font-mono-tabular ${
                            isBossRoomUndefeated
                              ? 'text-red-400'
                              : isCurrent
                              ? 'text-amber-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>

                      <div className="relative h-24 w-full rounded bg-[#07060a] border border-white/10 overflow-hidden mb-2.5">
                        {def.platforms.slice(3, 10).map((plat, pIdx) => (
                          <div
                            key={pIdx}
                            className="absolute bg-slate-600/60"
                            style={{
                              left: `${(plat.x / def.width) * 100}%`,
                              top: `${(plat.y / def.height) * 100}%`,
                              width: `${Math.max(3, (plat.w / def.width) * 100)}%`,
                              height: `${Math.max(3, (plat.h / def.height) * 100)}%`,
                            }}
                          />
                        ))}
                        {def.giantSwordMonument && (
                          <div
                            className="absolute bottom-2 w-1.5 h-10 bg-orange-400/60 -ml-0.5"
                            style={{ left: '50%' }}
                          />
                        )}
                        <div className="absolute bottom-0 inset-x-0 h-2 bg-slate-700/70" />

                        {isCurrent && (
                          <div
                            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-amber-400 ring-2 ring-amber-200 shadow"
                            style={{
                              left: `${normX * 100}%`,
                              top: `${normY * 100}%`,
                            }}
                            title="Sua posição atual"
                          />
                        )}
                      </div>

                      <div className="font-display text-sm font-semibold text-white truncate">
                        {def.name.replace(/^Sala \d+ · /, '')}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {isCurrent ? 'Você está aqui' : 'Clique para inspecionar'}
                      </div>
                    </button>

                    {idx % 3 !== 2 && idx < ROOM_ORDER.length - 1 && (
                      <div
                        className="hidden lg:block w-4 h-0.5 bg-amber-500/40 shrink-0 -mr-4 z-10"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 rounded-lg p-4 bg-[#11101a]">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                <span>{activeDef.name}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">{meta.hazard}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{meta.details}</p>
            </div>
            <button
              type="button"
              onClick={() => onTravelToRoom(inspectedRoom)}
              disabled={inspectedRoom === hud.roomId}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                inspectedRoom === hud.roomId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {inspectedRoom === hud.roomId ? 'Sala Atual' : 'Viajar para Sala'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-[#0b0a11]">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onResetRoom}
              className="px-3.5 py-2 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Sala</span>
            </button>
            <button
              type="button"
              onClick={onSwitchCharacter}
              className="px-3.5 py-2 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Trocar Personagem</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            Continuar Jogo
          </button>
        </div>
      </div>
    </div>
  );
};
