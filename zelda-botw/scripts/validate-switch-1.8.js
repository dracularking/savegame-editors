#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const HASHES = {
  MAP: 0x0bee9e46,
  FLAGS_BOW: 0x0cbf052a,
  FLAGSV_BOW: 0x1e3fd294,
  RUPEES: 0x23149bf8,
  MAX_HEARTS: 0x2906f327,
  HORSE_NAMES: 0x7b74e117,
  HORSE_SADDLES: 0x333aa6e5,
  MAX_STAMINA: 0x3adff047,
  DEFEATED_MOLDUGA_COUNTER: 0x441b7231,
  DEFEATED_HINOX_COUNTER: 0x54679940,
  FLAGS_WEAPON: 0x57ee221d,
  ITEMS: 0x5f283289,
  HORSE_REINS: 0x6150c6be,
  DEFEATED_TALUS_COUNTER: 0x698266be,
  FLAGSV_SHIELD: 0x69f17e8a,
  ITEMS_QUANTITY: 0x6a09fc59,
  KOROK_SEED_COUNTER: 0x8a94e07a,
  RELIC_GERUDO: 0x97f925c3,
  HORSE_POSITION: 0x982ba201,
  HORSE_MANES: 0x9c6cfd3f,
  PLAYER_POSITION: 0xa40ba103,
  FLAGSV_WEAPON: 0xa6d926bc,
  HORSE_TYPES: 0xc247b696,
  FLAGS_SHIELD: 0xc5238d2b,
  MOTORCYCLE: 0xc9328299,
  MONS: 0xce7afed3,
  MAPTYPE: 0xd913b769,
  RELIC_GORON: 0xf1cf4807,
  RELIC_RITO: 0xfda0cde4
};

const SWITCH_V18_HEADER = 0x4730;

function toHex(value) {
  return `0x${value.toString(16)}`;
}

function findOffset(buf, hash) {
  for (let i = 0x0c; i <= buf.length - 8; i += 8) {
    if (buf.readUInt32LE(i) === hash) {
      return i + 4;
    }
  }
  return -1;
}

function writeStringStrided(buf, offset, str, len) {
  for (let i = 0; i < len; i += 1) {
    buf.writeUInt32LE(0, offset);
    const four = str.slice(i * 4, i * 4 + 4);
    for (let j = 0; j < four.length; j += 1) {
      buf.writeUInt8(four.charCodeAt(j), offset + j);
    }
    offset += 8;
  }
}

function readStringStrided(buf, offset, len) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += buf.toString('ascii', offset, offset + 4);
    offset += 8;
  }
  return out.replace(/\u0000+$/g, '');
}

function runCase(buf, name, offset, writeFn, readFn, nextValue) {
  if (offset < 0) {
    return { name, status: 'MISSING_OFFSET' };
  }

  writeFn(buf, offset, nextValue);
  const readBack = readFn(buf, offset);
  const pass = Number.isFinite(nextValue)
    ? readBack === nextValue
    : String(readBack).startsWith(String(nextValue));

  return {
    name,
    status: pass ? 'PASS' : 'FAIL',
    offset: toHex(offset),
    expected: nextValue,
    actual: readBack
  };
}

function main() {
  const input = process.argv[2] || path.join('saves', 'game_data_switch_1.8.sav');
  const out = process.argv[3] || path.join('saves', 'validated_switch_1.8.sav');

  const raw = fs.readFileSync(input);
  const baseHeader = raw.readUInt32LE(0);
  const marker = raw.readUInt32LE(4);

  if (baseHeader !== SWITCH_V18_HEADER || marker !== 0xffffffff) {
    console.error(`Not a recognized Switch v1.8 save. header=${toHex(baseHeader)} marker=${toHex(marker)}`);
    process.exit(1);
  }

  const buf = Buffer.from(raw);

  const offsets = {};
  for (const [name, hash] of Object.entries(HASHES)) {
    offsets[name] = findOffset(buf, hash);
  }

  const checks = [];

  const u32Fields = [
    'RUPEES', 'MONS', 'MAX_HEARTS', 'MAX_STAMINA',
    'RELIC_GERUDO', 'RELIC_GORON', 'RELIC_RITO',
    'KOROK_SEED_COUNTER', 'DEFEATED_HINOX_COUNTER',
    'DEFEATED_TALUS_COUNTER', 'DEFEATED_MOLDUGA_COUNTER'
  ];

  for (const field of u32Fields) {
    const old = offsets[field] >= 0 ? buf.readUInt32LE(offsets[field]) : 0;
    const next = (old + 1) >>> 0;
    checks.push(runCase(
      buf,
      `stat.${field}`,
      offsets[field],
      (b, o, v) => b.writeUInt32LE(v, o),
      (b, o) => b.readUInt32LE(o),
      next
    ));
  }

  checks.push(runCase(
    buf,
    'toggle.MOTORCYCLE',
    offsets.MOTORCYCLE,
    (b, o, v) => b.writeUInt32LE(v, o),
    (b, o) => b.readUInt32LE(o),
    offsets.MOTORCYCLE >= 0 ? (buf.readUInt32LE(offsets.MOTORCYCLE) ? 0 : 1) : 0
  ));

  const floatTargets = [
    ['pos.PLAYER_X', offsets.PLAYER_POSITION, 1234.5],
    ['pos.PLAYER_Y', offsets.PLAYER_POSITION >= 0 ? offsets.PLAYER_POSITION + 8 : -1, 67.5],
    ['pos.PLAYER_Z', offsets.PLAYER_POSITION >= 0 ? offsets.PLAYER_POSITION + 16 : -1, -890.25],
    ['pos.HORSE_X', offsets.HORSE_POSITION, 456.75],
    ['pos.HORSE_Y', offsets.HORSE_POSITION >= 0 ? offsets.HORSE_POSITION + 8 : -1, 12.125],
    ['pos.HORSE_Z', offsets.HORSE_POSITION >= 0 ? offsets.HORSE_POSITION + 16 : -1, -33.875]
  ];

  for (const [name, off, val] of floatTargets) {
    checks.push(runCase(
      buf,
      name,
      off,
      (b, o, v) => b.writeFloatLE(v, o),
      (b, o) => b.readFloatLE(o),
      val
    ));
  }

  checks.push(runCase(
    buf,
    'coord.MAP',
    offsets.MAP,
    (b, o, v) => writeStringStrided(b, o, v, 8),
    (b, o) => readStringStrided(b, o, 8),
    'MainField'
  ));

  checks.push(runCase(
    buf,
    'coord.MAPTYPE',
    offsets.MAPTYPE,
    (b, o, v) => writeStringStrided(b, o, v, 8),
    (b, o) => readStringStrided(b, o, 8),
    'MainFieldDungeon'
  ));

  const itemNameOffset = offsets.ITEMS >= 0 ? offsets.ITEMS : -1;
  checks.push(runCase(
    buf,
    'items.slot0.NAME',
    itemNameOffset,
    (b, o, v) => writeStringStrided(b, o, v, 16),
    (b, o) => readStringStrided(b, o, 16),
    'Weapon_Sword_001'
  ));

  checks.push(runCase(
    buf,
    'items.slot0.QUANTITY',
    offsets.ITEMS_QUANTITY,
    (b, o, v) => b.writeUInt32LE(v, o),
    (b, o) => b.readUInt32LE(o),
    offsets.ITEMS_QUANTITY >= 0 ? ((buf.readUInt32LE(offsets.ITEMS_QUANTITY) + 3) >>> 0) : 0
  ));

  const modifierFields = [
    ['mod.WEAPON.FLAG', offsets.FLAGS_WEAPON, 0x00020000],
    ['mod.WEAPON.VALUE', offsets.FLAGSV_WEAPON, 50],
    ['mod.BOW.FLAG', offsets.FLAGS_BOW, 0x00010000],
    ['mod.BOW.VALUE', offsets.FLAGSV_BOW, 30],
    ['mod.SHIELD.FLAG', offsets.FLAGS_SHIELD, 0x00040000],
    ['mod.SHIELD.VALUE', offsets.FLAGSV_SHIELD, 20]
  ];

  for (const [name, off, val] of modifierFields) {
    checks.push(runCase(
      buf,
      name,
      off,
      (b, o, v) => b.writeUInt32LE(v, o),
      (b, o) => b.readUInt32LE(o),
      val
    ));
  }

  const horseStringCases = [
    ['horse.slot0.NAME', offsets.HORSE_NAMES, 'GameRomHorseNushi'],
    ['horse.slot0.SADDLE', offsets.HORSE_SADDLES, 'GameRomHorseSaddle_10'],
    ['horse.slot0.REINS', offsets.HORSE_REINS, 'GameRomHorseReins_10'],
    ['horse.slot0.TYPE', offsets.HORSE_TYPES, 'GameRomHorse00L'],
    ['horse.slot0.MANE', offsets.HORSE_MANES, 'Horse_Link_Mane_00L']
  ];

  for (const [name, off, val] of horseStringCases) {
    checks.push(runCase(
      buf,
      name,
      off,
      (b, o, v) => writeStringStrided(b, o, v, 16),
      (b, o) => readStringStrided(b, o, 16),
      val
    ));
  }

  const pass = checks.filter(c => c.status === 'PASS').length;
  const fail = checks.filter(c => c.status === 'FAIL').length;
  const missing = checks.filter(c => c.status === 'MISSING_OFFSET').length;

  fs.writeFileSync(out, buf);

  const report = {
    input,
    output: out,
    summary: { total: checks.length, pass, fail, missing },
    checks
  };

  const reportPath = path.join(path.dirname(out), 'switch_1.8.validation.report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Validated Switch 1.8 fields: total=${checks.length} pass=${pass} fail=${fail} missing=${missing}`);
  console.log(`Report: ${reportPath}`);
  if (fail > 0 || missing > 0) {
    process.exit(2);
  }
}

main();