import { notFound } from "next/navigation";
import { MAPS } from "../pack";
import Studio from "./Studio";

/**
 * The composition editor.
 *
 * Development only — in a production build this 404s, and the save
 * route refuses too. The compositions are source code, so editing them
 * on a deployed site would have nothing to write to.
 */
export default function StudioPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Cloned because the client mutates its copy freely; MAPS is the live
  // module constant the rest of the site renders from.
  return <Studio initial={structuredClone(MAPS)} />;
}
