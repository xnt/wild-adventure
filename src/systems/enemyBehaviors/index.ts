export { BaseEnemyBehavior } from './base.js';
export { GoblinBehavior } from './goblin.js';
export { WizrobeBehavior } from './wizrobe.js';
export { LynelBehavior } from './lynel.js';
export { GelBehavior } from './gel.js';
export { GelSmallBehavior } from './gelSmall.js';

import type { EnemyBehavior } from '../../types.js';
import { GoblinBehavior } from './goblin.js';
import { WizrobeBehavior } from './wizrobe.js';
import { LynelBehavior } from './lynel.js';
import { GelBehavior } from './gel.js';
import { GelSmallBehavior } from './gelSmall.js';

/**
 * Factory to create behavior based on enemy type.
 */
export function createBehavior(type: string): EnemyBehavior {
    switch (type) {
        case 'wizrobe': return new WizrobeBehavior();
        case 'lynel': return new LynelBehavior();
        case 'gel': return new GelBehavior();
        case 'gel_small': return new GelSmallBehavior();
        case 'goblin':
        default:
            return new GoblinBehavior();
    }
}