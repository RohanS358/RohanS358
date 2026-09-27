import path from "node:path";

/**
 * Where everything uploaded or edited at runtime lives: gallery files,
 * the corkboard, the GitHub snapshot. Defaults to ./data in the project;
 * set DATA_DIR to put it on a persistent volume (Docker, Railway, etc.)
 * so redeploys never touch it.
 */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
