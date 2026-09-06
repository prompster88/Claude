# Microbiome renders

Procedural, microscopy-faithful stills of the human gut microbiome, rendered in the browser with Three.js and captured headlessly with Playwright.

Units are micrometres. Morphologies and sizes follow published ranges:

| Scene | Look | Subject |
| --- | --- | --- |
| 1 | Colorized SEM | *Bifidobacterium* (forked pole, 0.8 x 3 µm) and a *Lactobacillus* chain on the microvillus brush border (0.1 x 1 µm, ~0.2 µm pitch) with mucin strands |
| 2 | Monochrome SEM | *Bacteroides*-like rods (0.7 x 2 µm, some dividing with a septum) in a biofilm, nematic alignment, EPS strands |
| 3 | Confocal | Colonic epithelium seen from above: junction stain (honeycomb), DAPI nuclei, Muc2 haze, EUB338 FISH bacteria (green) and *Akkermansia*-like ovals in the inner mucus (amber) |

## Rendering model

- **SEM shading**: secondary-electron edge brightening (`(1 - N·V)^p`), an off-axis Everhart-Thornley detector term, crevice darkening from a depth-only SSAO pass, fine sputter-coat grain plus low-frequency envelope wrinkles from a two-octave noise gradient.
- **Confocal shading**: additive emissive channels with thickness shading, bloom, photon shot noise that scales with signal.
- **Post**: 2x supersampling, depth-of-field gather with per-sample circle of confusion, scan-line noise for SEM, vignette, tonal curve.

## Run

```
npm install
npm run serve      # in one terminal
npm run render     # writes out/scene{1,2,3}.png
```

`shoot.cjs` expects the globally installed Playwright at `/opt/node22/lib/node_modules/playwright`; change the `require` path if yours differs.
