# Naqsh-e Jahan — an explorable 3D Maydan

A walkable, procedurally built Three.js reconstruction of **Naqsh-e Jahan Square** in Isfahan
(Shah Abbas I, 1598–1629) with the **Shah (Imam) Mosque**, the **Sheikh Lotfollah Mosque**,
**Ali Qapu** and the **Qeysarieh Gate** with the covered bazaar behind it. Every texture
(tile arabesques, girih stars, calligraphy bands, dome skins, tong-bori stucco) and every
sound (santur, ney, setar, tar, tombak, fountains, crowds, birds, coppersmiths, carriages,
the naqqareh drums) is generated in the browser. No asset files.

**Live:** https://cjauvin.github.io/naqsh-e-jahaan-3d/

## Run locally

ES modules can't be loaded from `file://`, so serve the folder locally. `serve.py` is a
plain static server that disables browser caching (so edits in `src/` always show up):

```bash
uv run --no-project python serve.py 8765
```

Any static server works (e.g. `npx serve`), but with caching servers use a hard refresh
(Cmd/Ctrl+Shift+R) after changes.

Then open <http://localhost:8765>. Three.js is loaded from jsDelivr, fonts from Google Fonts.
Deep links work: `http://localhost:8765/#shahDome`, `#lotfChamber`, `#aliTalar`, `#pool`…

## Controls

| Key | Action |
| --- | --- |
| Click | Capture the mouse to look around (Esc releases) |
| W A S D / arrows | Walk (Shift to run) |
| V | Cycle Walk → Fly → Aerial (orbit) |
| E / Q (fly) | Up / down |
| 1–9, 0 | Guided places (also in the *Places* menu) |
| T | Advance the time of day (or use the slider) |
| C | Clap. Try it on the black stone under the Shah Mosque's dome |
| N | Naqqareh: sunset drums and horns from the gatehouse |
| M | Mute |

Click the plan (top right) to jump anywhere. On touch screens: drag the left side to walk and the right side to look.

## What is modelled (and from what)

Dimensions come from published sources (Wikipedia EN/FA, ArchNet, Encyclopaedia Iranica,
UNESCO) and from measurements of satellite imagery and OpenStreetMap outlines:

- **Square**: 512 × 160 m interior, two-storey arcade of ~6 m bays, 12 m high, with roof
  domelets; promenades, jub channels, tree rows at 12 / 18.5 / 24 / 37 m from the long façades,
  the 10 m carriage loop, lawn pairs with star flower beds, the 80 × 30 m pool with fountain
  jets on the Ali Qapu–Lotfollah cross-axis, and stone polo goalposts at both ends. The model's
  axis is N–S; the sun is computed for Isfahan (32.65° N) with the real 10.5° rotation of the square.
- **Shah Mosque**: portal (~27 m, two minarets) at the back of a 26 m × 16.5 m half-octagonal
  recess; domed vestibule; passage into the courtyard through the NE iwan, so the mosque turns
  45° toward the qibla; four-iwan courtyard with a pool and two storeys of tiled arcades; 33 m
  qibla iwan with 48 m minarets; sanctuary with a double-shell dome (~38 m inside, ~52 m
  outside), mihrab, 14-step minbar and the echo stone; shabestans and two madrasas.
- **Sheikh Lotfollah**: portal in a rectangular notch; the bent corridor (left, then right)
  around a 19 m chamber rotated 45°; eight great arches, a 16-window drum and the dome with
  rings of 32 lemon-shaped medallions shrinking toward the "peacock"; cream exterior dome.
- **Ali Qapu**: gate block projecting ~8 m, the 28 × 16 m talar at 13.5 m with 18 columns
  (3 rows of 6), coffered ceiling and copper-lined pool, the tower behind, a walkable spiral
  stair and the top-floor music room with vase-shaped (tong-bori) cut-outs.
- **Qeysarieh Gate**: portal with the Sagittarius tile panel and frescoes, and a vaulted,
  skylit bazaar street behind it.

Simplifications: façades are texture compositions rather than tile-by-tile geometry; the
muqarnas are procedural; inscription bands use generic phrases (the Basmala, "Isfahan is
half the world", building names), not the historical texts; the surrounding city is schematic.

## Soundscape

The engine (`src/audio.js`) crossfades by place:

- **Square**: santur improvising in *Chahargah* (Karplus–Strong strings with *riz* tremolo),
  fountains near the pool, crowd murmur, sparrows, pigeons, passing horse carriages with bells;
  swifts at dusk and crickets at night.
- **Shah Mosque courtyard**: a breathy ney in *Bayat-e Esfahan* (with the E-koron quarter tone),
  pigeons, the courtyard pool, courtyard reverb.
- **Under the Shah dome**: drone and distant ney in a long reverb with discrete flutter echoes.
- **Lotfollah**: sparse setar in *Shur*, intimate chamber reverb.
- **Ali Qapu**: tar and tombak in *Mahur*, wind on the talar, a dry "treated" music room.
- **Bazaar**: coppersmiths' hammering and a crowd under the vaults.

Scales use real quarter tones (koron); the string synthesis is tuned to within 0.1 cent.

## Files

```
index.html          page, UI, import map
src/main.js         renderer, sky and sun, lighting, zones, UI, minimap
src/controls.js     walk / fly / orbit with collisions and floor following
src/audio.js        procedural Persian music and ambience
src/textures.js     procedural tiles, calligraphy, domes, ground
src/materials.js    material library
src/geom.js         arches, muqarnas, domes, minarets, pishtaq portals
src/arcade.js       instanced two-storey arcade bays
src/square.js       ground plan, pool, trees, arcades, city, carriages
src/shahMosque.js   Shah Mosque
src/lotfollah.js    Sheikh Lotfollah Mosque
src/aliQapu.js      Ali Qapu
src/qeysarieh.js    Qeysarieh Gate and bazaar
src/people.js       visitors, picnics, strollers
src/water.js        reflective pools
src/static.js       static mesh merging (draw-call reduction)
src/zfix.js         finds coincident surfaces and gives them distinct depth priorities
src/lightrig.js     constant 3-light rig that follows the viewer's nearest lamps
src/places.js       teleport points and place notes
serve.py            no-cache static server for local viewing
```
