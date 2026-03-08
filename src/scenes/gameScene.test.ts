// Tests for scenes/GameScene.ts (matches file-under-test).
// Tests the orchestration of systems (player, combat, enemies, UI, collectibles).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';  // Mocked in setup
import GameScene from './GameScene.js';

describe('scenes/GameScene.ts', () => {
    let scene: GameScene;

    beforeEach(() => {
        // Use unknown for constructor (super Scene mock in setup).
        scene = new (GameScene as any)();
    });

    it('init resets state correctly', () => {
        scene.init();
        expect(scene.gameOver).toBe(false);
        expect(scene.victory).toBe(false);
    });

    it('create sets up world and initializes systems', () => {
        const buildTilemapSpy = vi.spyOn(scene as any, '_buildTilemap');
        const createStructuresSpy = vi.spyOn(scene as any, '_createStructures');
        const initSystemsSpy = vi.spyOn(scene as any, '_initSystems');
        const setupTouchSpy = vi.spyOn(scene as any, '_setupTouchControls');

        scene.create();

        expect(buildTilemapSpy).toHaveBeenCalled();
        expect(createStructuresSpy).toHaveBeenCalled();
        expect(initSystemsSpy).toHaveBeenCalled();
        expect(setupTouchSpy).toHaveBeenCalled();
    });

    it('update handles restart when game over', () => {
        scene.init();
        scene.gameOver = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true);
        const restartSpy = vi.spyOn(scene.scene, 'restart').mockImplementation(() => scene.scene);

        scene.update(1000, 16);

        expect(restartSpy).toHaveBeenCalled();
    });

    it('update returns early when gameOver or victory', () => {
        scene.gameOver = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(false);
        
        expect(() => scene.update(1000, 16)).not.toThrow();
    });

    it('_initSystems creates all game systems', () => {
        scene.obstacleLayer = {} as any;
        
        scene._initSystems();
        
        expect(scene.playerController).toBeDefined();
        expect(scene.enemySystem).toBeDefined();
        expect(scene.combatSystem).toBeDefined();
        expect(scene.uiSystem).toBeDefined();
        expect(scene.collectiblesSystem).toBeDefined();
    });

    it('_showGameOver sets state and shows UI', () => {
        scene.init();
        scene.playerController = { stop: vi.fn(), player: { setTint: vi.fn() } } as any;
        scene.uiSystem = { showGameOver: vi.fn() } as any;

        scene._showGameOver();

        expect(scene.gameOver).toBe(true);
        expect(scene.playerController.stop).toHaveBeenCalled();
        expect(scene.uiSystem.showGameOver).toHaveBeenCalled();
    });

    it('_showVictory sets state and shows UI', () => {
        scene.init();
        scene.playerController = { stop: vi.fn() } as any;
        scene.uiSystem = { showVictory: vi.fn() } as any;

        scene._showVictory();

        expect(scene.victory).toBe(true);
        expect(scene.playerController.stop).toHaveBeenCalled();
        expect(scene.uiSystem.showVictory).toHaveBeenCalled();
    });

    it('_onTriforceComplete upgrades HP and shows effects', () => {
        scene.init();
        scene.playerController = { setHP: vi.fn() } as any;
        scene.uiSystem = { 
            rebuildHearts: vi.fn(), 
            flashCamera: vi.fn(), 
            shakeCamera: vi.fn(),
            showFlashText: vi.fn(),
        } as any;

        scene._onTriforceComplete();

        expect(scene.playerController.setHP).toHaveBeenCalled();
        expect(scene.uiSystem.rebuildHearts).toHaveBeenCalled();
        expect(scene.uiSystem.flashCamera).toHaveBeenCalled();
        expect(scene.uiSystem.shakeCamera).toHaveBeenCalled();
        expect(scene.uiSystem.showFlashText).toHaveBeenCalled();
    });

    it('_updateUI updates all UI elements', () => {
        scene.init();
        scene.playerController = { getHP: vi.fn().mockReturnValue(96), getPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }) } as any;
        scene.enemySystem = { getRemaining: vi.fn().mockReturnValue(5), getLivingEnemies: vi.fn().mockReturnValue([]) } as any;
        scene.collectiblesSystem = { getHasCompass: vi.fn().mockReturnValue(false) } as any;
        scene.uiSystem = { 
            updateHearts: vi.fn(), 
            updateEnemyCounter: vi.fn(),
        } as any;

        scene._updateUI();

        expect(scene.uiSystem.updateHearts).toHaveBeenCalledWith(96);
        expect(scene.uiSystem.updateEnemyCounter).toHaveBeenCalledWith(5);
    });

    it('_updateUI triggers victory when all enemies defeated', () => {
        scene.init();
        scene.playerController = { getHP: vi.fn().mockReturnValue(96), getPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }), stop: vi.fn() } as any;
        scene.enemySystem = { getRemaining: vi.fn().mockReturnValue(0), getLivingEnemies: vi.fn().mockReturnValue([]) } as any;
        scene.collectiblesSystem = { getHasCompass: vi.fn().mockReturnValue(false) } as any;
        scene.uiSystem = { 
            updateHearts: vi.fn(), 
            updateEnemyCounter: vi.fn(),
            showVictory: vi.fn(),
        } as any;

        scene._updateUI();

        expect(scene.victory).toBe(true);
        expect(scene.uiSystem.showVictory).toHaveBeenCalled();
    });

    it('_buildTilemap creates obstacle layer', () => {
        scene._buildTilemap();
        expect(scene.obstacleLayer).toBeDefined();
    });

    it('_createStructures places decorative structures', () => {
        expect(() => scene._createStructures()).not.toThrow();
    });

    it('preload loads all required assets', () => {
        const loadSpriteSheetSpy = vi.fn();
        const loadImageSpy = vi.fn();
        const onSpy = vi.fn();
        
        scene.load = {
            spritesheet: loadSpriteSheetSpy,
            image: loadImageSpy,
            on: onSpy,
        } as any;

        scene.preload();

        expect(onSpy).toHaveBeenCalledWith('loaderror', expect.any(Function));
        expect(loadSpriteSheetSpy).toHaveBeenCalledWith('player', 'player_sheet.png', { frameWidth: 32, frameHeight: 32 });
        expect(loadImageSpy).toHaveBeenCalledWith('grass', 'grass.png');
    });
});
