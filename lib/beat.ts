/**
 * The music's pulse, shared without React: the player writes it every
 * frame from its analyser, and anything animated (the background canvas)
 * reads it on its own frame loop. 0 = silence, ~1 =
 * a kick drum landing.
 */
export const beat = { level: 0, playing: false };
