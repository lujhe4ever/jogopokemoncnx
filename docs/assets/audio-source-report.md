# Relatório de fontes de áudio

## Resultado

- 39 OGGs CC0 aprovados e publicados;
- 9 OGGs rejeitados após decode por pico absoluto acima de 1,0;
- 2.000 cries Pokémon mantidos apenas como referência;
- 0 cries Pokémon aprovados;
- 6 jingles curtos aprovados, mas nenhuma música completa em loop.

Cada OGG aprovado foi decodificado com python-soundfile 0.13.1/libsndfile e também
validado estruturalmente pelo auditor Node. O CSV registra duração, canais, sample
rate, RMS em dBFS, pico, hash e clipping.

## Fontes exatas

| Fonte | Versão | Licença | SHA-256 do ZIP | Evidência |
| --- | --- | --- | --- | --- |
| kenney-tiny-dungeon-1.0 | 1.0 | CC0-1.0 | c109438ab06f65fd80f9b2686a4cf9c7c11dc64444b47333ec71d602f8bb5fc7 | [página](https://kenney.nl/assets/tiny-dungeon) |
| kenney-tiny-town-1.1 | 1.1 | CC0-1.0 | 9768692dccff1d706408a5aedd6ca4f6cd1409506cbc84cb2f862919764be977 | [página](https://kenney.nl/assets/tiny-town) |
| kenney-ui-pixel-adventure-1.0 | 1.0 | CC0-1.0 | 0b0ed4802ebcfff5e44e370f394baa1d751862a5a4a7612ac4ce84e85faa0627 | [página](https://kenney.nl/assets/ui-pack-pixel-adventure) |
| kenney-particle-pack-1.0 | 1.0 | CC0-1.0 | b631d4b07f7002549fdcf155f01141ad482f79f3440e4e301eed49ce5f1d8958 | [página](https://kenney.nl/assets/particle-pack) |
| kenney-interface-sounds-1.0 | 1.0 | CC0-1.0 | f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232 | [página](https://kenney.nl/assets/interface-sounds) |
| kenney-impact-sounds-1.0 | 1.0 | CC0-1.0 | 029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8 | [página](https://kenney.nl/assets/impact-sounds) |
| kenney-rpg-audio-1.0 | 1.0 | CC0-1.0 | 6dbeaf8544da958d8f2adcb4a4a4b76c1ade34a05f8ab9edccd327da7375f38b | [página](https://kenney.nl/assets/rpg-audio) |
| kenney-music-jingles-1.0 | 1.0 | CC0-1.0 | b729ba57959bd58793d2c5cafa348aaf2655d354f3da35ec4729e03ec77197b8 | [página](https://kenney.nl/assets/music-jingles) |

Para cries próprios, a estratégia recomendada é síntese original por camadas,
gravações próprias e processamento documentado, ou contratação com licença explícita.
