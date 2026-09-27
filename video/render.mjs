// Bundle once, render every composition (or only ids matching argv[2]).
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";

const serveUrl = await bundle({ entryPoint: new URL("./src/index.ts", import.meta.url).pathname });
const filter = process.argv[2] ?? "";
for (const composition of await getCompositions(serveUrl)) {
  if (!composition.id.includes(filter)) continue;
  const outputLocation = `out/${composition.id}.mp4`;
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, outputLocation });
  console.log("✓", outputLocation);
}
