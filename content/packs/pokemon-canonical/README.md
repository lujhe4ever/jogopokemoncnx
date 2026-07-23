# Pokemon canonical metadata pilot

This pack is a small, auditable pilot for the future Pokemon content structure. It contains Bulbasaur, Ivysaur, and Venusaur metadata plus empty media inventories.

No sprite, animation, or sound files are included. Media candidates remain pending until the owner explicitly approves a source and license for public repository use.

## Layout

Each creature folder contains:

- manifest.json
- README.md
- definitions/pokemon.json
- definitions/abilities.json
- definitions/moves.json
- sprites/inventory.json
- animations/inventory.json
- sounds/inventory.json

The pack root also contains `schemas/pokemon-content.schema.json`.

## License status

The pack is marked pending because Pokemon names, character data, sprites, animations, and sounds may involve third-party rights.

## Naming convention

Creature folders use a four-digit National Pokedex number plus a canonical lowercase slug:

```text
0001-bulbasaur/
0002-ivysaur/
0003-venusaur/
```

Future media files should keep source, view, variant, form, gender, and animation details in the filename before import is approved. Example proposals:

```text
0001-bulbasaur--emerald--front--normal.png
0001-bulbasaur--black-white--front--normal--animated.gif
```

## Current pilot scope

Definitions are populated from structured PokeAPI endpoints and remain pending for owner/legal review. PokemonDB sprite pages are recorded only as visual reference candidates in `sprites/inventory.json`; no media file is imported or hotlinked.
