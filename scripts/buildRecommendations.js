const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "../rapidminer/rules_output.csv");
const OUTPUT = path.join(__dirname, "../data/recommendations.csv");
const MAX_PER_USER = 5;

// Split one CSV line, respecting quoted values
const parseLine = (line) => {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
};

const lines = fs.readFileSync(INPUT, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = parseLine(lines[0]).map((h) => h.trim());

const idOf = (h) => (h.match(/[0-9a-f]{24}/i) || [])[0];
const userCol = header.findIndex((h) => h.toLowerCase() === "userid");

const conf = [];  // columns holding the rule confidence per product
const owned = []; // columns saying whether the user already bought the product
header.forEach((h, i) => {
  const id = idOf(h);
  if (!id || i === userCol) return;
  if (/^confidence/i.test(h)) conf.push({ i, id });
  else if (/^sum/i.test(h)) owned.push({ i, id });
});

if (userCol < 0 || !conf.length || !owned.length) {
  console.error("Could not find the expected columns. Header was:\n" + header.join("\n"));
  process.exit(1);
}

const rows = ["userId,productId,rank"];
lines.slice(1).forEach((line) => {
  const cells = parseLine(line).map((c) => c.trim());
  const userId = cells[userCol];
  if (!/^[0-9a-f]{24}$/i.test(userId)) return;

  const has = new Set(owned.filter((o) => /^true$/i.test(cells[o.i])).map((o) => o.id));

  conf
    .filter((c) => !has.has(c.id)) // never recommend something already bought
    .map((c) => ({ id: c.id, score: Number(cells[c.i]) || 0 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PER_USER)
    .forEach((r, idx) => rows.push(`${userId},${r.id},${idx + 1}`));
});

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, rows.join("\n") + "\n");
console.log(`Wrote ${rows.length - 1} recommendations to data/recommendations.csv`);