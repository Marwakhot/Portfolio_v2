import RAPIER from '@dimforge/rapier3d-compat';

// The WASM module must only be initialised once, however many scenes use it.
export const rapierReady = RAPIER.init();
export default RAPIER;
