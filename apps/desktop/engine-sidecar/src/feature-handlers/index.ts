/**
 * Feature handler modules (one file per feature group), merged into the protocol's method table.
 * Each module only adapts protocol params to @astro/astrology-engine calls.
 */
import { Handler } from '../common';
import { handlers as tables } from './tables';
import { handlers as tajika } from './tajika';
import { handlers as dashasSign } from './dashas-sign';
import { handlers as dashasPlanetary } from './dashas-planetary';
import { handlers as matchingSouth } from './matching-south';
import { handlers as chakras } from './chakras';
import { handlers as muhurtaExtras } from './muhurta-extras';
import { handlers as vargasExtra } from './vargas-extra';
import { handlers as lalKitab } from './lal-kitab';
import { handlers as print } from './print';
import { handlers as uiExisting } from './ui-existing';

const modules: Array<Record<string, Handler>> = [tables, tajika, dashasSign, dashasPlanetary, matchingSouth, chakras, muhurtaExtras, vargasExtra, lalKitab, print, uiExisting];

export const featureHandlers: Record<string, Handler> = {};
for (const m of modules) {
  for (const [name, h] of Object.entries(m)) {
    if (Object.prototype.hasOwnProperty.call(featureHandlers, name)) throw new Error(`Duplicate sidecar method: ${name}`);
    featureHandlers[name] = h;
  }
}
