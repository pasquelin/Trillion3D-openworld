/**
 * The panel kit, served beside the engine as `runtime/kit.js`: a settings panel the page declares
 * in a few lines, a corner of the frame's measured counters, a banner with the line of what to do,
 * and a card that names the error the page stops on. Its words, and the page's own, are read in
 * the reader's language before the page runs (`words.ts`). Copied from the Trillion3D example
 * kit, with only what the open world uses; it touches nothing of the engine.
 */
import { announceWhatToDo } from './banner.ts';
import { watchFailures } from './failure.ts';
import { loadWords } from './words.ts';

watchFailures();
await loadWords(document);
announceWhatToDo();

export { controls } from './controls.ts';
export { readout } from './readout.ts';
