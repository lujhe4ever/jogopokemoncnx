# Compatibilidade visual

## Runtime atual

O cliente usa Phaser 3.90.0, canvas de 640 × 400 e `pixelArt: true`. A cena desenha
círculos, retângulos e texto; não existe `preload`, atlas, texture key, animação ou
loader de conteúdo Pokémon. Logo, nenhum dos arquivos auditados está atualmente
compatível “por integração”; só é possível avaliar o formato.

## PNGs temporários

Todos os 4.100 arquivos D-023 foram decodificados e tiveram hash recalculado.

| Propriedade | Resultado |
| --- | ---: |
| Dimensão | 96 × 96 em 4.100 arquivos |
| Transparência | 4.100 |
| Arquivos vazios | 0 |
| Bytes totais | 4.010.860 |
| Hashes de conteúdo únicos | 4.095 |
| Instâncias duplicadas por conteúdo | 5 |
| Conteúdo tocando a borda do canvas | 91 |
| Ocupação média de pixels | 18,1438% |

Cada espécie tem frente normal, frente shiny, costas normal e costas shiny. A
uniformidade de 96 × 96 favorece um slot estável, mas a ocupação varia de 3,9605% a
59,1471%. Renderizar todo arquivo na mesma escala produziria criaturas visualmente
muito pequenas ou muito grandes. O manifest futuro precisa de pivô, escala lógica e
caixa de conteúdo, sem alterar o arquivo de origem.

## Candidatos na árvore

Para 1.351 registros de Pokémon, a revisão fixada contém:

- 47.064 PNGs estáticos;
- 1.146 SVGs estáticos;
- 11.133 GIFs animados;
- 722 PNGs classificados como animados pela coleção.

Os formatos e dimensões variam entre gerações e coleções. Misturar sprites de 32 ×
32, 40 × 40, 56 × 56, 80 × 80, 96 × 96, 120 × 120, 128 × 128, 256 × 256 e arte
maior sem uma política visual causaria inconsistência de escala, nitidez e
enquadramento.

## Política recomendada

## Metodologia de pontuação

A nota preliminar de 0 a 100 é por família e mede adequação técnica ao baseline
pixel-art 96 × 96, não qualidade artística nem licença:

- até 20 pontos por densidade/resolução coerente;
- até 15 por escala aparente e framing;
- até 15 por perspectiva e par frente/costas;
- até 15 por consistência normal/shiny/gênero;
- até 15 por outline, paleta, saturação e contraste;
- até 10 por transparência e ausência de suavização;
- até 10 por cobertura entre espécies/formas.

Classificação: 80–100 `compatible`, 55–79
`compatible-with-normalization`, 30–54 `restricted-use` e 0–29
`reference-only`. Campos não inspecionados não recebem confirmação; a nota registrada
no CSV é triagem por família baseada em estrutura, formato e cobertura.

| Família | Nota preliminar | Classe |
| --- | ---: | --- |
| default estilo geração V | 90 | compatible |
| geração V pixel art | 88 | compatible |
| Showdown comunitário | 72 | compatible-with-normalization |
| geração IV pixel art | 68 | compatible-with-normalization |
| geração III pixel art | 62 | compatible-with-normalization |
| geração II pixel art | 52 | restricted-use |
| geração I pixel art | 42 | restricted-use |
| renders gerações VI–IX | 45–48 | restricted-use |
| ícones | 25 | reference-only |
| HOME | 20 | reference-only |
| official artwork | 15 | reference-only |
| Dream World vetorial | 10 | reference-only |

Licença é um gate separado: uma nota visual alta nunca torna um asset publicável.

### Renderização

- unidade visual por slot, não por dimensão bruta;
- nearest-neighbor para pixel art;
- escala inteira quando possível;
- pivô normalizado e baseline de chão;
- caixa de conteúdo e margem de segurança;
- fallback explícito por slot;
- sem CSS ou Phaser smoothing em pixel art.

### Formato

- PNG para spritesheets com transparência e inspeção simples;
- WebP lossless opcional apenas após medir suporte, tamanho e pipeline;
- atlas JSON para animações;
- SVG restrito a UI/arte vetorial aprovada, não misturado a sprites de batalha;
- GIF apenas como referência de movimento, não como contrato de runtime.

### Performance

- carregar por encontro/cena, não as 1.351 entidades na inicialização;
- separar packs por função e lote;
- limitar textura máxima e memória descomprimida;
- liberar texturas sem consumidores;
- medir mobile Safari e Android real;
- manter budget no CI por pack e por cena.

## Compatibilidade de substituição

O código deve pedir `battle.front.normal` ou outro ID lógico ao catálogo. O catálogo
resolve esse ID para um asset set aprovado. Trocar os sprites temporários por arte
original deve alterar somente o manifest e os arquivos, sem mudar domínio, save,
protocolo ou IDs de criatura.

## Bloqueios atuais

1. zero assets visuais aprovados para runtime;
2. seis formas sem candidato estático;
3. 326 registros alternativos sem definição autônoma;
4. estilo visual de longo prazo ainda não decidido;
5. ausência de loader orientado a dados;
6. 91 imagens temporárias precisam de atenção de enquadramento se forem usadas
   apenas em ambiente local de referência.
