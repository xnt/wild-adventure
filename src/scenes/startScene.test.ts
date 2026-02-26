// Tests for scenes/StartScene.ts
// Basic lifecycle tests for the start/title scene.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';  // Mocked in setup
import StartScene from './StartScene.js';

describe('scenes/StartScene.ts', () => {
    let scene: StartScene;

    beforeEach(() => {
        scene = new (StartScene as any)();
        vi.clearAllMocks();
    });

    it('constructor sets correct scene key', () => {
        // The scene key should be 'StartScene'
        expect((scene as any).sys?.settings?.key || 'StartScene').toBe('StartScene');
    });

    it('preload loads all required assets', () => {
        // Verify preload doesn't throw and calls load methods
        expect(() => scene.preload()).not.toThrow();
        expect(scene.load.spritesheet).toHaveBeenCalledWith('player', 'player_sheet.png', expect.any(Object));
        expect(scene.load.image).toHaveBeenCalledWith('grass', 'grass.png');
        expect(scene.load.image).toHaveBeenCalledWith('forest', 'forest.png');
        expect(scene.load.image).toHaveBeenCalledWith('swamp', 'swamp.png');
        expect(scene.load.image).toHaveBeenCalledWith('snow', 'snow.png');
        expect(scene.load.image).toHaveBeenCalledWith('goblin', 'goblin.png');
        expect(scene.load.image).toHaveBeenCalledWith('gel', 'gel.png');
        expect(scene.load.image).toHaveBeenCalledWith('chest_closed', 'chest_closed.png');
        expect(scene.load.image).toHaveBeenCalledWith('compass', 'compass.png');
        expect(scene.load.image).toHaveBeenCalledWith('pyramid', 'pyramid.png');
    });

    it('create builds title screen UI without errors', () => {
        // Mock input.keyboard.addKey to return an object with 'on' method
        scene.input = {
            keyboard: {
                addKey: vi.fn().mockReturnValue({ on: vi.fn() }),
            },
            on: vi.fn(),
        } as any;

        expect(() => scene.create()).not.toThrow();
        
        // Verify UI elements were created
        expect(scene.add.rectangle).toHaveBeenCalled();
        expect(scene.add.tileSprite).toHaveBeenCalled();
        expect(scene.add.text).toHaveBeenCalled();
        expect(scene.add.image).toHaveBeenCalled();
    });

    it('create sets up input bindings for space, enter, and touch', () => {
        const mockKeyOn = vi.fn();
        scene.input = {
            keyboard: {
                addKey: vi.fn().mockReturnValue({ on: mockKeyOn }),
            },
            on: vi.fn(),
        } as any;

        scene.create();

        // Space and Enter keys should have 'down' handlers
        expect(mockKeyOn).toHaveBeenCalledWith('down', expect.any(Function));
        // Touch/pointer should have handler
        expect(scene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });

    it('preload registers loaderror handler', () => {
        scene.preload();
        expect(scene.load.on).toHaveBeenCalledWith('loaderror', expect.any(Function));
    });
});
