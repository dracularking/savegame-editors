# Switch 1.8 Field Validation Matrix

This project now includes an executable field-level validation for `game_data_switch_1.8.sav`.

## Run

```bash
node scripts/validate-switch-1.8.js
```

Optional input/output:

```bash
node scripts/validate-switch-1.8.js saves/game_data_switch_1.8.sav saves/validated_switch_1.8.sav
```

## Coverage

- Stats (`U32`): `RUPEES`, `MONS`, `MAX_HEARTS`, `MAX_STAMINA`, `RELIC_GERUDO`, `RELIC_GORON`, `RELIC_RITO`, `KOROK_SEED_COUNTER`, `DEFEATED_HINOX_COUNTER`, `DEFEATED_TALUS_COUNTER`, `DEFEATED_MOLDUGA_COUNTER`
- Toggle (`U32`): `MOTORCYCLE`
- Coordinates (`F32`): `PLAYER_POSITION[x,y,z]`, `HORSE_POSITION[x,y,z]`
- Coordinate strings: `MAP`, `MAPTYPE`
- Items: slot `0` name (`ITEMS`) and quantity (`ITEMS_QUANTITY`)
- Modifiers: slot `0` `FLAGS_*` + `FLAGSV_*` for `WEAPON`, `BOW`, `SHIELD`
- Horses: slot `0` `HORSE_NAMES`, `HORSE_SADDLES`, `HORSE_REINS`, `HORSE_TYPES`, `HORSE_MANES`

## Output

- Modified save output (default): `saves/validated_switch_1.8.sav`
- JSON report (default): `saves/switch_1.8.validation.report.json`
- Exit code `0` when all checks pass, non-zero otherwise.