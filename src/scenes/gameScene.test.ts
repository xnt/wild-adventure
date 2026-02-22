// Tests for scenes/GameScene.ts (matches file-under-test).
// Basic lifecycle/AI/damage tests (mocks Phaser UI for coverage; uses unknown for constructor).
// (UI-heavy; mocks enable low-hanging coverage bump.)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';  // Mocked in setup
import GameScene from './GameScene';

describe('scenes/GameScene.ts', () => {
    let scene: GameScene;

    beforeEach(() => {
        // Use unknown for constructor (super Scene mock in setup).
        scene = new (GameScene as any)();
        // Spy/mocks for methods.
        vi.spyOn(scene, 'anims', 'get').mockReturnValue({ exists: vi.fn().mockReturnValue(false), create: vi.fn(), play: vi.fn() } as any);
    });

    it('init resets state correctly', () => {
        scene.init();
        expect(scene.playerHP).toBe(96);  // MAX_HP
        expect(scene.gameOver).toBe(false);
        expect(scene.victory).toBe(false);
    });

    it('create sets up world/player/enemies/UI (mocks Phaser calls)', () => {
        // Mock scene methods for coverage (add, physics etc from setup).
        // (Avoid deep stubs; checks calls via spies.)
        const createSpy = vi.spyOn(scene as any, '_buildTilemap');
        const playerSpy = vi.spyOn(scene as any, '_createPlayer');
        const enemiesSpy = vi.spyOn(scene as any, '_createEnemies');

        scene.create();

        expect(createSpy).toHaveBeenCalled();
        expect(playerSpy).toHaveBeenCalled();
        expect(enemiesSpy).toHaveBeenCalled();
        // Verifies wrappers/UI setup; expand mocks for full.
    });

    it('update handles game loop and restart (mocks)', () => {
        scene.gameOver = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true);
        // In Phaser 4, ScenePlugin.restart returns the plugin itself (sig: (data?: object) => ScenePlugin).
        // Mock impl returns the plugin to match type (prevents TS error on spy).
        const restartSpy = vi.spyOn(scene.scene, 'restart').mockImplementation(() => scene.scene);

        scene.update(1000, 16);

        expect(restartSpy).toHaveBeenCalled();
    });

    it('damage methods update HP/knockback (uses utils)', () => {
        scene.playerHP = 96;
        scene.lastHitTime = 0;
        scene.player = { setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn() } as any;

        scene._damagePlayer({ x: 0, y: 0 } as any);  // PositionedObject

        expect(scene.playerHP).toBe(72);  // -24 ENEMY_DMG
        expect(scene.player.setVelocity).toHaveBeenCalled();
    });

    it('init resets compass state', () => {
        scene.init();
        expect(scene.hasCompass).toBe(false);
        expect(scene.triforcePieces).toBe(0);
    });

    it('update returns early when gameOver or victory', () => {
        scene.gameOver = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(false);
        
        // Should not throw and should return early
        expect(() => scene.update(1000, 16)).not.toThrow();
    });

    it('update returns early when victory', () => {
        scene.victory = true;
        scene.restartKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(false);
        
        expect(() => scene.update(1000, 16)).not.toThrow();
    });

    it('_damagePlayer respects iframes', () => {
        scene.playerHP = 96;
        scene.lastHitTime = 900;  // Recent hit
        scene.player = { setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn() } as any;
        // Mock time.now to be within iframes duration (800ms)
        scene.time = { now: 1000, delayedCall: vi.fn() } as any;

        scene._damagePlayer({ x: 0, y: 0 } as any);

        // HP should not change due to iframes
        expect(scene.playerHP).toBe(96);
    });

    it('_damagePlayer triggers game over when HP reaches 0', () => {
        scene.playerHP = 24;  // One hit from death
        scene.lastHitTime = 0;
        scene.player = { setVelocity: vi.fn(), setTint: vi.fn(), clearTint: vi.fn() } as any;
        const showGameOverSpy = vi.spyOn(scene as any, '_showGameOver').mockImplementation(() => {});

        scene._damagePlayer({ x: 0, y: 0 } as any);

        expect(scene.playerHP).toBe(0);
        expect(showGameOverSpy).toHaveBeenCalled();
    });

    it('_damageEnemy decrements HP and kills when depleted', () => {
        const mockEnemy = {
            hp: 1,
            type: 'goblin',
            isDying: false,
            setTint: vi.fn(),
            clearTint: vi.fn(),
            active: true,
        } as any;
        const killSpy = vi.spyOn(scene as any, '_killEnemy').mockImplementation(() => {});

        scene._damageEnemy(mockEnemy);

        expect(mockEnemy.hp).toBe(0);
        expect(killSpy).toHaveBeenCalledWith(mockEnemy);
    });

    it('_damageEnemy does not kill when HP remains', () => {
        const mockEnemy = {
            hp: 3,  // Lynel
            type: 'lynel',
            isDying: false,
            setTint: vi.fn(),
            clearTint: vi.fn(),
            active: true,
        } as any;
        const killSpy = vi.spyOn(scene as any, '_killEnemy').mockImplementation(() => {});

        scene._damageEnemy(mockEnemy);

        expect(mockEnemy.hp).toBe(2);
        expect(killSpy).not.toHaveBeenCalled();
    });

    it('_damageEnemy skips dying enemies', () => {
        const mockEnemy = {
            hp: 1,
            isDying: true,
            setTint: vi.fn(),
        } as any;

        scene._damageEnemy(mockEnemy);

        // HP should not change
        expect(mockEnemy.hp).toBe(1);
        expect(mockEnemy.setTint).not.toHaveBeenCalled();
    });

    it('_onPlayerHit skips dying enemies', () => {
        const mockEnemy = { isDying: true } as any;
        const damageSpy = vi.spyOn(scene as any, '_damagePlayer').mockImplementation(() => {});

        scene._onPlayerHit({} as any, mockEnemy);

        expect(damageSpy).not.toHaveBeenCalled();
    });

    it('_onPlayerHit calls _damagePlayer for active enemies', () => {
        const mockEnemy = { isDying: false, x: 10, y: 10 } as any;
        const damageSpy = vi.spyOn(scene as any, '_damagePlayer').mockImplementation(() => {});

        scene._onPlayerHit({} as any, mockEnemy);

        expect(damageSpy).toHaveBeenCalledWith(mockEnemy);
    });

    it('_onPlayerHitByProj calls _damagePlayer and destroys projectile', () => {
        const mockProj = { x: 10, y: 10, destroy: vi.fn() } as any;
        const damageSpy = vi.spyOn(scene as any, '_damagePlayer').mockImplementation(() => {});

        scene._onPlayerHitByProj({} as any, mockProj);

        expect(damageSpy).toHaveBeenCalled();
        expect(mockProj.destroy).toHaveBeenCalled();
    });

    // ===================================================================
    // preload
    // ===================================================================

    it('preload loads all assets and registers loaderror handler', () => {
        scene.preload();
        expect(scene.load.spritesheet).toHaveBeenCalledWith('player', 'player_sheet.png', expect.any(Object));
        expect(scene.load.image).toHaveBeenCalledWith('grass', 'grass.png');
        expect(scene.load.image).toHaveBeenCalledWith('goblin', 'goblin.png');
        expect(scene.load.image).toHaveBeenCalledWith('wizrobe', 'wizrobe.png');
        expect(scene.load.image).toHaveBeenCalledWith('lynel', 'lynel.png');
        expect(scene.load.image).toHaveBeenCalledWith('chest_closed', 'chest_closed.png');
        expect(scene.load.image).toHaveBeenCalledWith('compass', 'compass.png');
        expect(scene.load.image).toHaveBeenCalledWith('pyramid', 'pyramid.png');
        expect(scene.load.on).toHaveBeenCalledWith('loaderror', expect.any(Function));
    });

    // ===================================================================
    // update — normal game loop path
    // ===================================================================

    it('update calls all game loop methods when game is active', () => {
        scene.init();
        const moveSpy = vi.spyOn(scene as any, '_handlePlayerMovement').mockImplementation(() => {});
        const attackSpy = vi.spyOn(scene as any, '_handleAttack').mockImplementation(() => {});
        const enemySpy = vi.spyOn(scene as any, '_updateEnemies').mockImplementation(() => {});
        const chestSpy = vi.spyOn(scene as any, '_checkChests').mockImplementation(() => {});
        const uiSpy = vi.spyOn(scene as any, '_updateUI').mockImplementation(() => {});

        scene.update(1000, 16);

        expect(moveSpy).toHaveBeenCalledWith(1000);
        expect(attackSpy).toHaveBeenCalledWith(1000);
        expect(enemySpy).toHaveBeenCalledWith(1000);
        expect(chestSpy).toHaveBeenCalled();
        expect(uiSpy).toHaveBeenCalled();
    });

    // ===================================================================
    // _showGameOver / _showVictory
    // ===================================================================

    it('_showGameOver sets state and shows overlay', () => {
        scene.init();
        scene.player = { setVelocity: vi.fn(), setTint: vi.fn() } as any;
        scene.overlayBg = { setVisible: vi.fn() } as any;
        scene.overlayText = { setText: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() } as any;
        scene.overlaySubText = { setVisible: vi.fn() } as any;

        scene._showGameOver();

        expect(scene.gameOver).toBe(true);
        expect(scene.player.setVelocity).toHaveBeenCalledWith(0, 0);
        expect(scene.player.setTint).toHaveBeenCalledWith(0x666666);
        expect(scene.overlayBg.setVisible).toHaveBeenCalledWith(true);
        expect(scene.overlayText.setText).toHaveBeenCalledWith('Game Over');
        expect(scene.overlaySubText.setVisible).toHaveBeenCalledWith(true);
    });

    it('_showVictory sets state and schedules confetti', () => {
        scene.init();
        scene.player = { setVelocity: vi.fn() } as any;
        scene.overlayBg = { setVisible: vi.fn() } as any;
        scene.overlayText = { setText: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() } as any;
        scene.overlaySubText = { setVisible: vi.fn() } as any;

        scene._showVictory();

        expect(scene.victory).toBe(true);
        expect(scene.player.setVelocity).toHaveBeenCalledWith(0, 0);
        expect(scene.overlayBg.setVisible).toHaveBeenCalledWith(true);
        expect(scene.overlayText.setText).toHaveBeenCalledWith('Victory!');
        expect(scene.time.delayedCall).toHaveBeenCalledTimes(30);
    });

    // ===================================================================
    // _killEnemy
    // ===================================================================

    it('_killEnemy marks enemy as dying and increments kill count', () => {
        scene.init();
        const mockEnemy = {
            isDying: false, body: { enable: true },
            x: 100, y: 100, type: 'goblin', hp: 0,
        } as any;

        scene._killEnemy(mockEnemy);

        expect(mockEnemy.isDying).toBe(true);
        expect(mockEnemy.body.enable).toBe(false);
        expect(scene.enemiesKilled).toBe(1);
        expect(scene.tweens.add).toHaveBeenCalled();
    });

    it('_killEnemy returns early for already dying enemies', () => {
        scene.init();
        scene._killEnemy({ isDying: true } as any);
        expect(scene.enemiesKilled).toBe(0);
    });

    it('_killEnemy logs for lynel type', () => {
        scene.init();
        const spy = vi.spyOn(console, 'log');
        scene._killEnemy({
            isDying: false, body: { enable: true },
            x: 0, y: 0, type: 'lynel', hp: 0,
        } as any);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Lynel KILLED'));
    });

    // ===================================================================
    // _createUI / _updateUI
    // ===================================================================

    it('_createUI builds all HUD elements', () => {
        scene.init();
        scene._createUI();

        expect(scene.heartSprites.length).toBe(4);      // MAX_HP=96, HEART_HP=24
        expect(scene.enemyText).toBeDefined();
        expect(scene.triforceHudSprites.length).toBe(3); // NUM_TRIFORCE_PIECES
        expect(scene.compassHudSprite).toBeDefined();
        expect(scene.compassArrow).toBeDefined();
        expect(scene.overlayBg).toBeDefined();
        expect(scene.overlayText).toBeDefined();
        expect(scene.overlaySubText).toBeDefined();
    });

    it('_updateUI updates hearts, enemy text, and triforce HUD', () => {
        scene.init();
        scene.heartSprites = [{ setTexture: vi.fn() }, { setTexture: vi.fn() }] as any;
        scene.enemyText = { setText: vi.fn() } as any;
        scene.triforceHudSprites = [{ setTexture: vi.fn() }, { setTexture: vi.fn() }] as any;
        scene.compassArrow = { setVisible: vi.fn(), setRotation: vi.fn() } as any;
        scene.enemies = { getChildren: vi.fn().mockReturnValue([]) } as any;
        scene.player = { x: 0, y: 0 } as any;

        scene._updateUI();

        scene.heartSprites.forEach((h: any) => expect(h.setTexture).toHaveBeenCalled());
        expect(scene.enemyText.setText).toHaveBeenCalled();
        scene.triforceHudSprites.forEach((t: any) => expect(t.setTexture).toHaveBeenCalled());
    });

    it('_updateUI triggers victory when all enemies killed', () => {
        scene.init();
        scene.enemiesKilled = 5;  // NUM_ENEMIES
        scene.heartSprites = [{ setTexture: vi.fn() }] as any;
        scene.enemyText = { setText: vi.fn() } as any;
        scene.triforceHudSprites = [];
        scene.compassArrow = { setVisible: vi.fn() } as any;
        scene.enemies = { getChildren: vi.fn().mockReturnValue([]) } as any;
        scene.player = { x: 0, y: 0, setVelocity: vi.fn() } as any;
        scene.overlayBg = { setVisible: vi.fn() } as any;
        scene.overlayText = { setText: vi.fn().mockReturnThis(), setVisible: vi.fn().mockReturnThis(), setColor: vi.fn().mockReturnThis() } as any;
        scene.overlaySubText = { setVisible: vi.fn() } as any;

        scene._updateUI();

        expect(scene.victory).toBe(true);
    });

    // ===================================================================
    // _checkChests / _processChestContent
    // ===================================================================

    it('_checkChests opens nearby unopened chest', () => {
        scene.init();
        scene.player = { x: 10, y: 10 } as any;
        const processSpy = vi.spyOn(scene as any, '_processChestContent').mockImplementation(() => {});
        const mockChest = {
            opened: false, x: 15, y: 15,
            setTexture: vi.fn(),
            content: { type: 'triforce_piece', label: 'Test' },
            chestIndex: 0,
        } as any;
        scene.chests = [mockChest];

        scene._checkChests();

        expect(mockChest.opened).toBe(true);
        expect(mockChest.setTexture).toHaveBeenCalledWith('chest_opened');
        expect(processSpy).toHaveBeenCalledWith(mockChest);
    });

    it('_checkChests skips already opened chests', () => {
        scene.init();
        scene.player = { x: 10, y: 10 } as any;
        const processSpy = vi.spyOn(scene as any, '_processChestContent').mockImplementation(() => {});
        scene.chests = [{ opened: true, x: 15, y: 15 }] as any;

        scene._checkChests();

        expect(processSpy).not.toHaveBeenCalled();
    });

    it('_checkChests skips distant chests', () => {
        scene.init();
        scene.player = { x: 0, y: 0 } as any;
        const mockChest = { opened: false, x: 1000, y: 1000, setTexture: vi.fn() } as any;
        scene.chests = [mockChest];

        scene._checkChests();

        expect(mockChest.opened).toBeFalsy();
    });

    it('_processChestContent dispatches triforce piece', () => {
        const spy = vi.spyOn(scene as any, '_collectTriforcePiece').mockImplementation(() => {});
        const chest = { content: { type: 'triforce_piece', label: 'T' } } as any;
        scene._processChestContent(chest);
        expect(spy).toHaveBeenCalledWith(chest);
    });

    it('_processChestContent dispatches compass', () => {
        const spy = vi.spyOn(scene as any, '_collectCompass').mockImplementation(() => {});
        const chest = { content: { type: 'compass', label: 'C' } } as any;
        scene._processChestContent(chest);
        expect(spy).toHaveBeenCalledWith(chest);
    });

    // ===================================================================
    // _collectTriforcePiece / _collectCompass / _onTriforceComplete
    // ===================================================================

    it('_collectTriforcePiece increments pieces and shows flash', () => {
        scene.init();
        vi.spyOn(scene as any, '_showChestFlash').mockImplementation(() => {});
        const chest = { x: 100, y: 100, content: { type: 'triforce_piece', label: 'Courage' } } as any;

        scene._collectTriforcePiece(chest);

        expect(scene.triforcePieces).toBe(1);
        expect(scene.tweens.add).toHaveBeenCalled();
        expect(scene.cameras.main.flash).toHaveBeenCalled();
    });

    it('_collectTriforcePiece triggers triforce complete at 3 pieces', () => {
        scene.init();
        scene.triforcePieces = 2;
        vi.spyOn(scene as any, '_showChestFlash').mockImplementation(() => {});
        const completeSpy = vi.spyOn(scene as any, '_onTriforceComplete').mockImplementation(() => {});
        const chest = { x: 0, y: 0, content: { type: 'triforce_piece', label: 'Power' } } as any;

        scene._collectTriforcePiece(chest);

        expect(scene.triforcePieces).toBe(3);
        expect(completeSpy).toHaveBeenCalled();
    });

    it('_collectCompass enables compass and updates HUD', () => {
        scene.init();
        vi.spyOn(scene as any, '_showChestFlash').mockImplementation(() => {});
        scene.compassArrow = { setVisible: vi.fn() } as any;
        scene.compassHudSprite = { setTexture: vi.fn() } as any;
        const chest = { x: 50, y: 50, content: { type: 'compass', label: 'Compass' } } as any;

        scene._collectCompass(chest);

        expect(scene.hasCompass).toBe(true);
        expect(scene.compassArrow.setVisible).toHaveBeenCalledWith(true);
        expect(scene.compassHudSprite.setTexture).toHaveBeenCalledWith('compass_hud');
        expect(scene.cameras.main.flash).toHaveBeenCalled();
    });

    it('_onTriforceComplete upgrades HP and rebuilds HUD', () => {
        scene.init();
        const rebuildSpy = vi.spyOn(scene as any, '_rebuildHeartUI').mockImplementation(() => {});
        vi.spyOn(scene as any, '_showChestFlash').mockImplementation(() => {});

        scene._onTriforceComplete();

        expect(scene.playerHP).toBe(192);  // TRIFORCE_BONUS_HP
        expect(rebuildSpy).toHaveBeenCalledWith(192);
        expect(scene.cameras.main.flash).toHaveBeenCalled();
        expect(scene.cameras.main.shake).toHaveBeenCalled();
    });

    it('_rebuildHeartUI destroys old hearts and creates new ones', () => {
        scene.init();
        const oldHeart = { destroy: vi.fn() } as any;
        scene.heartSprites = [oldHeart, oldHeart];

        scene._rebuildHeartUI(192);  // 8 hearts (192/24)

        expect(oldHeart.destroy).toHaveBeenCalled();
        expect(scene.heartSprites.length).toBe(8);
    });

    // ===================================================================
    // _showChestFlash
    // ===================================================================

    it('_showChestFlash creates flash text with tween', () => {
        scene._showChestFlash('Test Label');
        expect(scene.add.text).toHaveBeenCalled();
        expect(scene.tweens.add).toHaveBeenCalled();
        expect(scene.chestFlashText).toBeDefined();
    });

    it('_showChestFlash destroys previous flash text', () => {
        const oldText = { destroy: vi.fn() } as any;
        scene.chestFlashText = oldText;

        scene._showChestFlash('New Label');

        expect(oldText.destroy).toHaveBeenCalled();
    });

    // ===================================================================
    // _updateCompassArrow
    // ===================================================================

    it('_updateCompassArrow returns early without compass', () => {
        scene.init();
        scene.compassArrow = { setVisible: vi.fn(), setRotation: vi.fn() } as any;

        scene._updateCompassArrow();

        expect(scene.compassArrow.setVisible).not.toHaveBeenCalled();
    });

    it('_updateCompassArrow hides arrow when no enemies alive', () => {
        scene.init();
        scene.hasCompass = true;
        scene.compassArrow = { setVisible: vi.fn(), setRotation: vi.fn() } as any;
        scene.enemies = { getChildren: vi.fn().mockReturnValue([]) } as any;
        scene.player = { x: 0, y: 0 } as any;

        scene._updateCompassArrow();

        expect(scene.compassArrow.setVisible).toHaveBeenCalledWith(false);
    });

    it('_updateCompassArrow points to closest enemy', () => {
        scene.init();
        scene.hasCompass = true;
        scene.compassArrow = { setVisible: vi.fn(), setRotation: vi.fn() } as any;
        scene.player = { x: 0, y: 0 } as any;
        const enemy1 = { active: true, isDying: false, x: 100, y: 0 };
        const enemy2 = { active: true, isDying: false, x: 200, y: 0 };
        scene.enemies = { getChildren: vi.fn().mockReturnValue([enemy1, enemy2]) } as any;

        scene._updateCompassArrow();

        expect(scene.compassArrow.setRotation).toHaveBeenCalled();
        expect(scene.compassArrow.setVisible).toHaveBeenCalledWith(true);
    });

    it('_updateCompassArrow skips dying and inactive enemies', () => {
        scene.init();
        scene.hasCompass = true;
        scene.compassArrow = { setVisible: vi.fn(), setRotation: vi.fn() } as any;
        scene.player = { x: 0, y: 0 } as any;
        scene.enemies = { getChildren: vi.fn().mockReturnValue([
            { active: true, isDying: true, x: 50, y: 0 },
            { active: false, isDying: false, x: 30, y: 0 },
        ]) } as any;

        scene._updateCompassArrow();

        expect(scene.compassArrow.setVisible).toHaveBeenCalledWith(false);
    });

    // ===================================================================
    // _handlePlayerMovement
    // ===================================================================

    it('_handlePlayerMovement skips during attack', () => {
        scene.init();
        scene.isAttacking = true;
        scene.player = { setVelocity: vi.fn() } as any;

        scene._handlePlayerMovement(1000);

        expect(scene.player.setVelocity).not.toHaveBeenCalled();
    });

    it('_handlePlayerMovement processes idle state', () => {
        scene.init();
        scene.player = {
            setVelocity: vi.fn(), setAlpha: vi.fn(), play: vi.fn(),
            anims: { currentAnim: null },
        } as any;
        scene.cursors = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;
        scene.wasd = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;

        scene._handlePlayerMovement(1000);

        expect(scene.player.setVelocity).toHaveBeenCalledWith(0, 0);
        expect(scene.player.setAlpha).toHaveBeenCalled();
    });

    it('_handlePlayerMovement processes movement input', () => {
        scene.init();
        scene.player = {
            setVelocity: vi.fn(), setAlpha: vi.fn(), play: vi.fn(),
            anims: { currentAnim: null },
        } as any;
        scene.cursors = { left: { isDown: false }, right: { isDown: true }, up: { isDown: false }, down: { isDown: false } } as any;
        scene.wasd = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;

        scene._handlePlayerMovement(1000);

        expect(scene.facing).toBe('right');
        expect(scene.player.play).toHaveBeenCalled();
    });

    it('_handlePlayerMovement uses touch fallback when no keys pressed', () => {
        scene.init();
        scene.touchDir = { x: 0, y: -1 };
        scene.player = {
            setVelocity: vi.fn(), setAlpha: vi.fn(), play: vi.fn(),
            anims: { currentAnim: null },
        } as any;
        scene.cursors = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;
        scene.wasd = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;

        scene._handlePlayerMovement(1000);

        expect(scene.facing).toBe('up');
    });

    it('_handlePlayerMovement normalizes diagonal movement', () => {
        scene.init();
        scene.player = {
            setVelocity: vi.fn(), setAlpha: vi.fn(), play: vi.fn(),
            anims: { currentAnim: null },
        } as any;
        scene.cursors = { left: { isDown: false }, right: { isDown: true }, up: { isDown: true }, down: { isDown: false } } as any;
        scene.wasd = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;

        scene._handlePlayerMovement(1000);

        const [vx, vy] = (scene.player.setVelocity as any).mock.calls[0];
        const speed = Math.sqrt(vx * vx + vy * vy);
        expect(speed).toBeCloseTo(160, 0);  // PLAYER_SPEED
    });

    it('_handlePlayerMovement skips play when anim already matches', () => {
        scene.init();
        scene.player = {
            setVelocity: vi.fn(), setAlpha: vi.fn(), play: vi.fn(),
            anims: { currentAnim: { key: 'idle_down' } },
        } as any;
        scene.cursors = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;
        scene.wasd = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;

        scene._handlePlayerMovement(1000);

        expect(scene.player.play).not.toHaveBeenCalled();
    });

    it('_handlePlayerMovement applies iframes alpha when recently hit', () => {
        scene.init();
        scene.lastHitTime = 500;
        scene.player = {
            setVelocity: vi.fn(), setAlpha: vi.fn(), play: vi.fn(),
            anims: { currentAnim: null },
        } as any;
        scene.cursors = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;
        scene.wasd = { left: { isDown: false }, right: { isDown: false }, up: { isDown: false }, down: { isDown: false } } as any;

        scene._handlePlayerMovement(700);  // within IFRAMES_DUR; sin(700*0.02)=sin(14)>0 → 0.4

        const alpha = (scene.player.setAlpha as any).mock.calls[0][0];
        expect(alpha).toBeLessThan(1);
    });

    // ===================================================================
    // _handleAttack
    // ===================================================================

    it('_handleAttack triggers attack when ready', () => {
        scene.init();
        scene.spaceKey = {} as any;
        scene.swordGroup = { add: vi.fn() } as any;
        scene.player = { x: 100, y: 100, setVelocity: vi.fn(), play: vi.fn() } as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true);

        scene._handleAttack(2000);

        expect(scene.isAttacking).toBe(true);
        expect(scene.lastAttackTime).toBe(2000);
        expect(scene.player.setVelocity).toHaveBeenCalledWith(0, 0);
        expect(scene.add.rectangle).toHaveBeenCalled();
        expect(scene.swordGroup.add).toHaveBeenCalled();
        expect(scene.time.delayedCall).toHaveBeenCalled();
    });

    it('_handleAttack triggers via touchAttack', () => {
        scene.init();
        scene.spaceKey = {} as any;
        scene.touchAttack = true;
        scene.swordGroup = { add: vi.fn() } as any;
        scene.player = { x: 100, y: 100, setVelocity: vi.fn(), play: vi.fn() } as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(false);

        scene._handleAttack(2000);

        expect(scene.isAttacking).toBe(true);
        expect(scene.touchAttack).toBe(false);
    });

    it('_handleAttack does nothing on cooldown', () => {
        scene.init();
        scene.spaceKey = {} as any;
        scene.lastAttackTime = 500;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(true);

        scene._handleAttack(600);  // only 100ms since last, need 1000

        expect(scene.isAttacking).toBe(false);
    });

    it('_handleAttack does nothing when not pressed', () => {
        scene.init();
        scene.spaceKey = {} as any;
        vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockReturnValue(false);

        scene._handleAttack(2000);

        expect(scene.isAttacking).toBe(false);
    });

    // ===================================================================
    // _setupTouchControls
    // ===================================================================

    it('_setupTouchControls registers all input handlers', () => {
        scene._setupTouchControls();

        expect(scene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        expect(scene.input.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
        expect(scene.input.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });

    it('_setupTouchControls pointerdown sets touchAttack on right side', () => {
        scene._setupTouchControls();
        const calls = (scene.input.on as any).mock.calls;
        const handler = calls.find((c: any[]) => c[0] === 'pointerdown')[1];

        handler({ x: scene.scale.width * 0.8 });

        expect(scene.touchAttack).toBe(true);
    });

    it('_setupTouchControls pointerup resets state', () => {
        scene._setupTouchControls();
        scene.touchAttack = true;
        scene.touchDir = { x: 1, y: 1 };
        const calls = (scene.input.on as any).mock.calls;
        const handler = calls.find((c: any[]) => c[0] === 'pointerup')[1];

        handler();

        expect(scene.touchDir.x).toBe(0);
        expect(scene.touchDir.y).toBe(0);
        expect(scene.touchAttack).toBe(false);
    });

    it('_setupTouchControls pointermove updates touch direction', () => {
        scene._setupTouchControls();
        const calls = (scene.input.on as any).mock.calls;
        const handler = calls.find((c: any[]) => c[0] === 'pointermove')[1];

        handler({ isDown: true, x: 100, y: 200, downX: 80, downY: 200 });

        expect(scene.touchDir.x).toBeGreaterThan(0);
    });

    it('_setupTouchControls pointermove resets for small movements', () => {
        scene._setupTouchControls();
        const calls = (scene.input.on as any).mock.calls;
        const handler = calls.find((c: any[]) => c[0] === 'pointermove')[1];

        handler({ isDown: true, x: 100, y: 100, downX: 98, downY: 99 });

        expect(scene.touchDir.x).toBe(0);
        expect(scene.touchDir.y).toBe(0);
    });

    // ===================================================================
    // World / enemy / util wrappers
    // ===================================================================

    it('_createStructures places decorative structures', () => {
        expect(() => scene._createStructures()).not.toThrow();
        expect(scene.add.image).toHaveBeenCalled();
    });

    it('_updateEnemies delegates to util (empty enemies)', () => {
        scene.init();
        scene.enemies = { getChildren: vi.fn().mockReturnValue([]) } as any;
        scene.player = { x: 0, y: 0 } as any;

        expect(() => scene._updateEnemies(1000)).not.toThrow();
    });

    it('_enemyShoot creates projectile toward player', () => {
        scene.init();
        scene.player = { x: 200, y: 200 } as any;
        scene.enemyProjectiles = { add: vi.fn() } as any;

        scene._enemyShoot({ x: 100, y: 100, projSpeed: 80 } as any);

        expect(scene.physics.add.sprite).toHaveBeenCalled();
        expect(scene.enemyProjectiles.add).toHaveBeenCalled();
        expect(scene.time.delayedCall).toHaveBeenCalled();
    });

    it('_createPlayer creates sprite and animations', () => {
        scene._createPlayer();

        expect(scene.physics.add.sprite).toHaveBeenCalledWith(
            expect.any(Number), expect.any(Number), 'player', expect.any(Number),
        );
        expect(scene.player).toBeDefined();
        expect(scene.anims.create).toHaveBeenCalled();
    });

    it('_buildTilemap delegates to util and sets obstacleLayer', () => {
        scene._buildTilemap();
        expect(scene.obstacleLayer).toBeDefined();
    });

    it('_createEnemies sets up groups and overlaps', () => {
        scene.init();
        scene.player = { x: 0, y: 0 } as any;

        scene._createEnemies();

        expect(scene.enemies).toBeDefined();
        expect(scene.heartDrops).toBeDefined();
        expect(scene.enemyProjectiles).toBeDefined();
        expect(scene.physics.add.overlap).toHaveBeenCalled();
    });

    it('_createSlashEffect delegates to util', () => {
        expect(() => scene._createSlashEffect(100, 100)).not.toThrow();
    });

    it('_createDeathEffect delegates to util', () => {
        expect(() => scene._createDeathEffect(100, 100)).not.toThrow();
    });

    it('_createChests creates chest sprites with tweens', () => {
        scene.init();
        scene._createChests();

        expect(scene.chests.length).toBeGreaterThan(0);
        expect(scene.tweens.add).toHaveBeenCalled();
    });
});