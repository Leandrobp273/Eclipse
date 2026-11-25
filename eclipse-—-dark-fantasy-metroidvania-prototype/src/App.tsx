/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { DebugPanel } from './components/DebugPanel';
import { GameHUD } from './components/GameHUD';
import { WorldMapModal } from './components/WorldMapModal';
import { soundEngine } from './game/audio';
import { GameEngine, InputState } from './game/engine';
import { renderGame } from './game/renderer';
import { CharacterId, DebugOptions, DebugSnapshot, GameScreen, HudSnapshot, RoomId } from './game/types';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('CHARACTER_SELECT');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('abyssal');
  const [debugOpen, setDebugOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [debugOptions, setDebugOptions] = useState<DebugOptions>({
    showHitboxes: false,
    showDetectionRanges: false,
    godMode: false,
  });

  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine('abyssal');
  }

  const [hud, setHud] = useState<HudSnapshot>(() => engineRef.current!.getHudSnapshot());
  const [debugSnap, setDebugSnap] = useState<DebugSnapshot>(() => engineRef.current!.getDebugSnapshot());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());
  const justPressedRef = useRef<Set<string>>(new Set());
  const justReleasedRef = useRef<Set<string>>(new Set());

  const syncSnapshots = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setHud(engine.getHudSnapshot());
    setDebugSnap(engine.getDebugSnapshot());
  }, []);

  const handleConfirmCharacter = useCallback(() => {
    const engine = engineRef.current!;
    engine.setCharacter(selectedCharacter, false);
    engine.transitionToRoom('movement_lab');
    keysHeldRef.current.clear();
    justPressedRef.current.clear();
    justReleasedRef.current.clear();
    syncSnapshots();
    setScreen('PLAYING');
  }, [selectedCharacter, syncSnapshots]);

  const handleToggleMap = useCallback(() => {
    keysHeldRef.current.clear();
    justPressedRef.current.clear();
    justReleasedRef.current.clear();
    setScreen((prev) => (prev === 'PLAYING' ? 'MAP_PAUSED' : prev === 'MAP_PAUSED' ? 'PLAYING' : prev));
  }, []);

  const handleTravelToRoom = useCallback(
    (roomId: RoomId) => {
      const engine = engineRef.current!;
      engine.transitionToRoom(roomId);
      syncSnapshots();
      setScreen('PLAYING');
    },
    [syncSnapshots]
  );

  const handleResetRoom = useCallback(() => {
    const engine = engineRef.current!;
    engine.resetCurrentRoom();
    syncSnapshots();
    setScreen('PLAYING');
  }, [syncSnapshots]);

  const handleSwitchCharacter = useCallback(() => {
    keysHeldRef.current.clear();
    setScreen('CHARACTER_SELECT');
  }, []);

  const handleRespawn = useCallback(() => {
    const engine = engineRef.current!;
    engine.respawnPlayer();
    syncSnapshots();
  }, [syncSnapshots]);

  const handleToggleDebugOption = useCallback((key: keyof DebugOptions) => {
    const engine = engineRef.current!;
    engine.debugOptions[key] = !engine.debugOptions[key];
    setDebugOptions({ ...engine.debugOptions });
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.muted = !soundEngine.muted;
    setMuted(soundEngine.muted);
  }, []);

  // Keyboard listeners (ESC -> Map, F3 -> Debug, gameplay keys)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      if (code === 'Escape') {
        if (screen === 'PLAYING' || screen === 'MAP_PAUSED') {
          e.preventDefault();
          handleToggleMap();
        }
        return;
      }

      if (code === 'F3') {
        e.preventDefault();
        setDebugOpen((prev) => !prev);
        return;
      }

      if (screen !== 'PLAYING') return;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }

      if (!keysHeldRef.current.has(code)) {
        keysHeldRef.current.add(code);
        justPressedRef.current.add(code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (keysHeldRef.current.has(code)) {
        keysHeldRef.current.delete(code);
        justReleasedRef.current.add(code);
      }
    };

    const onBlur = () => {
      keysHeldRef.current.clear();
      justPressedRef.current.clear();
      justReleasedRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [screen, handleToggleMap]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    if (screen === 'CHARACTER_SELECT') return;
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudAccumulator = 0;
    let fpsFrames = 0;
    let fpsTimer = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      fpsFrames += 1;
      fpsTimer += dt;
      if (fpsTimer >= 0.4) {
        engine.fps = fpsFrames / fpsTimer;
        fpsFrames = 0;
        fpsTimer = 0;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (screen === 'PLAYING') {
        const held = keysHeldRef.current;
        const pressed = justPressedRef.current;
        const released = justReleasedRef.current;

        const input: InputState = {
          left: held.has('KeyA') || held.has('ArrowLeft'),
          right: held.has('KeyD') || held.has('ArrowRight'),
          up: held.has('KeyW') || held.has('ArrowUp'),
          down: held.has('KeyS') || held.has('ArrowDown'),
          jumpHeld: held.has('Space') || held.has('KeyW'),
          jumpJustPressed: pressed.has('Space') || pressed.has('KeyW'),
          jumpJustReleased: released.has('Space') || released.has('KeyW'),
          dashJustPressed: pressed.has('ShiftLeft') || pressed.has('ShiftRight'),
          attackJustPressed: pressed.has('KeyJ'),
          parryJustPressed: pressed.has('KeyK'),
          healJustPressed: pressed.has('KeyL'),
          abilityJustPressed: pressed.has('KeyU'),
          revolverJustPressed: pressed.has('KeyI') || pressed.has('KeyR'),
          ultimateJustPressed: pressed.has('KeyO') || pressed.has('KeyQ'),
          interactJustPressed: pressed.has('KeyE'),
        };

        pressed.clear();
        released.clear();

        engine.update(dt, input, vw, vh);
      }

      renderGame(ctx, engine, vw, vh);

      hudAccumulator += dt;
      if (hudAccumulator >= 0.05) {
        hudAccumulator = 0;
        setHud(engine.getHudSnapshot());
        setDebugSnap(engine.getDebugSnapshot());
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [screen]);

  if (screen === 'CHARACTER_SELECT') {
    return (
      <CharacterSelect
        selectedId={selectedCharacter}
        onSelect={setSelectedCharacter}
        onConfirm={handleConfirmCharacter}
      />
    );
  }

  const engine = engineRef.current!;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#09080d]">
      <canvas ref={canvasRef} className="block w-full h-full" />

      <GameHUD
        hud={hud}
        debugOpen={debugOpen}
        muted={muted}
        onOpenMap={handleToggleMap}
        onToggleDebug={() => setDebugOpen((prev) => !prev)}
        onToggleMute={handleToggleMute}
        onRespawn={handleRespawn}
      />

      {debugOpen && (
        <DebugPanel
          debug={debugSnap}
          options={debugOptions}
          onToggleOption={handleToggleDebugOption}
          onResetBoss={() => {
            engine.resetBossEncounter(true);
            syncSnapshots();
          }}
          onBossFullHp={() => {
            engine.boss.health = engine.boss.maxHealth;
            engine.boss.displayHealth = engine.boss.maxHealth;
            engine.boss.phase = 1;
            engine.boss.phase2Triggered = false;
            engine.boss.phase3Triggered = false;
            engine.boss.phase3PortalsUsed = false;
            engine.boss.defeated = false;
            engine.boss.burnTimer = 0;
            if (engine.boss.active) engine.boss.state = 'IDLE';
            engine.bossPortals = [];
            engine.summonedSwords = [];
            engine.bossStructures = [];
            engine.ignisOrb = null;
            engine.cameraFocusTarget = null;
            engine.targetCameraZoom = 1;
            engine.cameraZoom = 1;
            syncSnapshots();
          }}
          onForceBossPhase={() => {
            engine.forceBossPhaseTransition();
            syncSnapshots();
          }}
          onToggleBossAI={() => {
            engine.boss.aiPaused = !engine.boss.aiPaused;
            syncSnapshots();
          }}
        />
      )}

      {screen === 'MAP_PAUSED' && (
        <WorldMapModal
          hud={hud}
          playerX={engine.player.x}
          playerY={engine.player.y}
          onClose={handleToggleMap}
          onTravelToRoom={handleTravelToRoom}
          onResetRoom={handleResetRoom}
          onSwitchCharacter={handleSwitchCharacter}
        />
      )}
    </main>
  );
}
