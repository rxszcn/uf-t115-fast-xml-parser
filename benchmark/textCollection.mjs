"use strict";

// Throughput benchmark for the interval-based text collection in
// src/xmlparser/OrderedObjParser.js. Compares the two payload shapes that
// matter for the aggregation layer:
//   - text-dense: long text values (the path that was optimized)
//   - tag-dense:  many small tags (must not regress)
//
// Run from the repository root:
//   node benchmark/textCollection.mjs [iterations]

import { XMLParser } from "../src/fxp.js";
import { buildTextDenseXml, buildTagDenseXml } from "../spec/helpers/textCollectionPayloads.js";
import { performance } from "node:perf_hooks";

const iterations = Number(process.argv[2]) || 30;

const shapes = [
  { name: "text-dense", xml: buildTextDenseXml() },
  { name: "tag-dense", xml: buildTagDenseXml() },
];

const parser = new XMLParser({ ignoreAttributes: false });

console.log(`iterations per shape: ${iterations}`);
console.log("shape        size(KB)   total(ms)   ops/s     MB/s");
console.log("-----------  --------   ---------   -------   -----");

for (const { name, xml } of shapes) {
  const bytes = xml.length;

  // warmup
  for (let i = 0; i < 3; i++) parser.parse(xml);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) parser.parse(xml);
  const elapsed = performance.now() - start;

  const ops = (iterations / elapsed) * 1000;
  const mbs = (iterations * bytes) / (elapsed * 1000);
  console.log(
    `${name.padEnd(11)}  ${(bytes / 1024).toFixed(1).padStart(8)}   ` +
    `${elapsed.toFixed(1).padStart(9)}   ${ops.toFixed(1).padStart(7)}   ${mbs.toFixed(1)}`
  );
}
