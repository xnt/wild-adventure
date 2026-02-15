// ===========================================================================
// Wild Adventure — entry point
//
// Boots Phaser 4 with the GameScene.
// Run with:  npm run dev        (Vite dev server, hot reload)
//            npm run build      (production build → dist/)
//            npm run preview    (serve the production build)
// ===========================================================================

import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

// Typed Phaser game config for better safety (leverages Phaser's built-in types).
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game',
    backgroundColor: '#222222',
    pixelArt: true,
    roundPixels: true,
    physics: {
        default: 'arcade',
        arcade: {
            // Vector2Like requires x/y; y=0 for no gravity, x=0 explicit.
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
};

new Phaser.Game(config);
