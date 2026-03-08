// Tests for systems/uiSystem.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISystem } from './uiSystem.js';

describe('systems/uiSystem.ts', () => {
    let system: UISystem;
    let mockScene: any;

    beforeEach(() => {
        // Create mock objects that properly chain methods
        const createMockImage = () => {
            const obj: any = {
                setScrollFactor: vi.fn(() => obj),
                setDepth: vi.fn(() => obj),
                setScale: vi.fn(() => obj),
                setTexture: vi.fn(() => obj),
                setVisible: vi.fn(() => obj),
                setRotation: vi.fn(() => obj),
                destroy: vi.fn(),
            };
            return obj;
        };

        const createMockText = () => {
            const obj: any = {
                setScrollFactor: vi.fn(() => obj),
                setDepth: vi.fn(() => obj),
                setOrigin: vi.fn(() => obj),
                setVisible: vi.fn(() => obj),
                setText: vi.fn(() => obj),
                setColor: vi.fn(() => obj),
                destroy: vi.fn(),
            };
            return obj;
        };

        const createMockRect = () => {
            const obj: any = {
                setScrollFactor: vi.fn(() => obj),
                setDepth: vi.fn(() => obj),
                setVisible: vi.fn(() => obj),
                destroy: vi.fn(),
            };
            return obj;
        };

        mockScene = {
            add: {
                image: vi.fn().mockImplementation(() => createMockImage()),
                text: vi.fn().mockImplementation(() => createMockText()),
                rectangle: vi.fn().mockImplementation(() => createMockRect()),
            },
            cameras: {
                main: {
                    flash: vi.fn(),
                    shake: vi.fn(),
                },
            },
            scale: {
                width: 1024,
            },
            tweens: {
                add: vi.fn(),
            },
            time: {
                delayedCall: vi.fn(),
            },
        };

        system = new UISystem(mockScene);
    });

    describe('create', () => {
        it('creates all UI elements', () => {
            system.create(7);
            
            expect(system.heartSprites.length).toBe(4); // MAX_HP=96, HEART_HP=24
            expect(system.enemyText).toBeDefined();
            expect(system.triforceHudSprites.length).toBe(3); // NUM_TRIFORCE_PIECES
            expect(system.compassHudSprite).toBeDefined();
            expect(system.compassArrow).toBeDefined();
            expect(system.overlayBg).toBeDefined();
        });
    });

    describe('updateHearts', () => {
        it('updates heart textures based on HP', () => {
            system.create(7);
            
            const mockSetTexture = vi.fn();
            system.heartSprites.forEach(h => {
                h.setTexture = mockSetTexture;
            });
            
            system.updateHearts(96); // Full HP
            
            expect(mockSetTexture).toHaveBeenCalledTimes(4);
        });
    });

    describe('updateEnemyCounter', () => {
        it('updates enemy counter text', () => {
            system.create(7);
            
            const mockSetText = vi.fn();
            system.enemyText.setText = mockSetText;
            
            system.updateEnemyCounter(5);
            
            expect(mockSetText).toHaveBeenCalledWith('Enemies: 5/7');
        });
    });

    describe('updateTriforce', () => {
        it('updates triforce HUD display', () => {
            system.create(7);
            
            const mockSetTexture = vi.fn();
            system.triforceHudSprites.forEach(t => {
                t.setTexture = mockSetTexture;
            });
            
            system.updateTriforce(2);
            
            expect(system.triforcePieces).toBe(2);
        });
    });

    describe('enableCompass', () => {
        it('enables compass and updates HUD', () => {
            system.create(7);
            
            system.enableCompass();
            
            expect(system.hasCompass).toBe(true);
        });
    });

    describe('updateCompassArrow', () => {
        it('updates compass arrow rotation', () => {
            system.create(7);
            system.hasCompass = true;
            
            const mockSetRotation = vi.fn();
            system.compassArrow.setRotation = mockSetRotation;
            system.compassArrow.setVisible = vi.fn();
            
            system.updateCompassArrow(0, 0, 100, 100);
            
            expect(mockSetRotation).toHaveBeenCalled();
        });

        it('does nothing if player has no compass', () => {
            system.create(7);
            system.hasCompass = false;
            
            const mockSetRotation = vi.fn();
            system.compassArrow.setRotation = mockSetRotation;
            
            system.updateCompassArrow(0, 0, 100, 100);
            
            expect(mockSetRotation).not.toHaveBeenCalled();
        });
    });

    describe('hideCompassArrow', () => {
        it('hides compass arrow', () => {
            system.create(7);
            
            const mockSetVisible = vi.fn();
            system.compassArrow.setVisible = mockSetVisible;
            
            system.hideCompassArrow();
            
            expect(mockSetVisible).toHaveBeenCalledWith(false);
        });
    });

    describe('showFlashText', () => {
        it('creates flash text with tween', () => {
            system.create(7);
            
            system.showFlashText('Test Label');
            
            expect(mockScene.add.text).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });
    });

    describe('showGameOver', () => {
        it('shows game over overlay', () => {
            system.create(7);
            
            const mockSetVisible = vi.fn(() => system.overlayText);
            const mockSetColor = vi.fn();
            system.overlayBg.setVisible = vi.fn();
            system.overlayText.setVisible = mockSetVisible;
            system.overlayText.setColor = mockSetColor;
            system.overlayText.setText = vi.fn(() => system.overlayText);
            system.overlaySubText.setVisible = vi.fn();
            
            system.showGameOver();
            
            expect(system.overlayBg.setVisible).toHaveBeenCalledWith(true);
        });
    });

    describe('showVictory', () => {
        it('shows victory overlay', () => {
            system.create(7);
            
            const mockSetVisible = vi.fn(() => system.overlayText);
            const mockSetColor = vi.fn();
            system.overlayBg.setVisible = vi.fn();
            system.overlayText.setVisible = mockSetVisible;
            system.overlayText.setColor = mockSetColor;
            system.overlayText.setText = vi.fn(() => system.overlayText);
            system.overlaySubText.setVisible = vi.fn();
            
            system.showVictory();
            
            expect(system.overlayBg.setVisible).toHaveBeenCalledWith(true);
        });
    });

    describe('rebuildHearts', () => {
        it('rebuilds heart HUD for new max HP', () => {
            system.create(7);
            
            const oldLength = system.heartSprites.length;
            
            system.rebuildHearts(192); // 8 hearts
            
            expect(system.heartSprites.length).toBe(8);
            expect(system.heartSprites.length).toBeGreaterThan(oldLength);
        });
    });

    describe('flashCamera', () => {
        it('flashes the camera', () => {
            system.create(7);
            
            system.flashCamera(300, 255, 215, 0);
            
            expect(mockScene.cameras.main.flash).toHaveBeenCalled();
        });
    });

    describe('shakeCamera', () => {
        it('shakes the camera', () => {
            system.create(7);
            
            system.shakeCamera(200, 0.015);
            
            expect(mockScene.cameras.main.shake).toHaveBeenCalled();
        });
    });

    describe('hideOverlays', () => {
        it('hides all overlays', () => {
            system.create(7);
            
            const mockSetVisible = vi.fn();
            system.overlayBg.setVisible = mockSetVisible;
            system.overlayText.setVisible = mockSetVisible;
            system.overlaySubText.setVisible = mockSetVisible;
            
            system.hideOverlays();
            
            expect(mockSetVisible).toHaveBeenCalledWith(false);
        });
    });
});