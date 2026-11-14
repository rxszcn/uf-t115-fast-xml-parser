"use strict";

import { XMLParser } from "../src/fxp.js";
import { buildTextDenseXml, buildTagDenseXml } from "./helpers/textCollectionPayloads.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readFixture(name) {
  return fs.readFileSync(path.join(__dirname, "assets", name), "utf8");
}

describe("XMLParser text collection (interval-based)", function () {
  describe("output is byte-identical to the previous char-by-char implementation", function () {
    it("text-dense payload (long text values, entities, CDATA, comments)", function () {
      const result = new XMLParser({ ignoreAttributes: false }).parse(buildTextDenseXml());
      expect(JSON.stringify(result)).toEqual(readFixture("textdense_expected.json"));
    });

    it("tag-dense payload (many small tags, attributes, self-closing, empty text)", function () {
      const result = new XMLParser({ ignoreAttributes: false }).parse(buildTagDenseXml());
      expect(JSON.stringify(result)).toEqual(readFixture("tagdense_expected.json"));
    });

    it("text-dense payload with comment/cdata props enabled", function () {
      const result = new XMLParser({
        ignoreAttributes: false,
        commentPropName: "#comment",
        cdataPropName: "#cdata",
      }).parse(buildTextDenseXml());
      expect(JSON.stringify(result)).toEqual(readFixture("textdense_cdata_comments_expected.json"));
    });

    it("tag-dense payload with preserveOrder", function () {
      const result = new XMLParser({ ignoreAttributes: false, preserveOrder: true }).parse(buildTagDenseXml());
      expect(JSON.stringify(result)).toEqual(readFixture("tagdense_ordered_expected.json"));
    });
  });

  describe("text run edge cases", function () {
    it("collects text split across comments like the previous implementation", function () {
      const xml = "<root>ab<!-- skipped -->cd</root>";
      expect(new XMLParser().parse(xml)).toEqual({ root: "abcd" });
    });

    it("collects text around CDATA sections", function () {
      const xml = "<root>pre<![CDATA[ <raw> ]]>post</root>";
      expect(new XMLParser().parse(xml)).toEqual({ root: "pre <raw> post" });
    });

    it("keeps whitespace text when trimValues is off", function () {
      const xml = "<root>  spaced  <a>x</a>  tail  </root>";
      expect(new XMLParser({ trimValues: false }).parse(xml)).toEqual({
        root: { a: "x", "#text": "  spaced    tail  " },
      });
    });

    it("parses numeric text values", function () {
      const xml = "<root><n> 42 </n><f>4.5</f></root>";
      expect(new XMLParser().parse(xml)).toEqual({ root: { n: 42, f: 4.5 } });
    });

    it("decodes entities in text", function () {
      const xml = "<root>a &amp; b &lt;ok&gt; &quot;q&quot;</root>";
      expect(new XMLParser().parse(xml)).toEqual({ root: 'a & b <ok> "q"' });
    });

    it("decodes numeric entities when htmlEntities is enabled", function () {
      const xml = "<root>&#65;&#x42;</root>";
      expect(new XMLParser({ htmlEntities: true }).parse(xml)).toEqual({ root: "AB" });
    });

    it("handles adjacent tags with no text in between", function () {
      const xml = "<root><a>1</a><b>2</b><c/></root>";
      expect(new XMLParser().parse(xml)).toEqual({ root: { a: 1, b: 2, c: "" } });
    });

    it("ignores trailing text after the root element (unchanged behavior)", function () {
      const xml = "<root><a>1</a></root>trailing";
      expect(new XMLParser().parse(xml)).toEqual({ root: { a: 1 } });
    });

    it("handles text before and after PI tags", function () {
      const xml = "<root>pre<?pi data?>post</root>";
      expect(new XMLParser({ ignorePiTags: true }).parse(xml)).toEqual({ root: "prepost" });
    });
  });
});
