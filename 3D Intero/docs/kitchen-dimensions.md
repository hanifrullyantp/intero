# Kitchen Dimension Rules

Magic Generator and Global Settings now share the same dimension model.

- `settings.defaults.totalHeight` is the top of the cabinet carcasses, not the room ceiling. Decorative cornices sit above this line.
- Upper-cabinet bottom = base height + countertop **thickness** + backsplash/gap height.
- Upper-cabinet height = total height minus the upper-cabinet bottom. Corner upper cabinets follow exactly the same rule.
- Changing a global dimension is an undoable project edit. It updates existing base, wall, corner and tall cabinets; embedded appliances are not scaled.
- Newly inserted cabinets also inherit these dimensions. Manually editing an individual item is still possible; the Check tab warns when its top no longer matches the global line.
- Refrigerator dimensions live in `config.fridge`. Its overhead shelf is fixed above the appliance plus ventilation clearance. Extra housing height becomes overhead storage.
- A dispenser uses `tall_dispenser` and `config.dispenser`, with an open appliance niche and storage above.
- Corner handedness is derived from the inward normal of the returning wall. Part metadata includes `sideFace`, `hingeAt` and `bifold`, so the two fronts render perpendicular to each other.
- Auto-fill retains every 0.1 cm remainder. U-shaped back walls reserve two corners. Missing appliances are assigned to the resolved list actually passed to the generator.
- LED strips use emissive diffusers, real rectangular lights and optional depth-tested glow. The real-light count is capped at ten per scene.

## Example

For a 220 cm total height, an 85 cm base, a 2 cm worktop and a 60 cm backsplash:

`85 + 2 + 60 = 147 cm` upper bottom; `220 - 147 = 73 cm` upper height.

Raising the total height to 250 cm gives a 103 cm upper cabinet. A 178 cm refrigerator remains 178 cm tall.

## Colour intensity

`ProjectMaterials.tints` holds a black & white adjustment per colour group (`door`, `carcass`, `countertop`), each from -100 to +100.

`adjustHex` shifts HSL lightness only, so graphite stays graphite: +20 reads lighter in a dark room, -20 reads darker in strong daylight. Both the 3D materials and the 2D elevation receive the adjustment; textured colours pass the adjusted base colour to their texture.

Countertop marbles available by default: `white_marble_soft` (White Marble), `carrara`, `statuario`, `volakas`, `nero_marquina` and `emerald_marble`. All are `category: 'stone'`, so they appear in the countertop swatch row.

## Sink and stove position

`MagicSpec.placement.sink` / `.stove` set the appliance to a distance in centimetres from the wall junction (the inner corner), measured along the wall to the centre of the unit.

| Shape / side | Reference corner | Internal mapping |
| --- | --- | --- |
| I | the left end of the wall | `centre = offset` |
| L, side A | the junction at the end of A | `centre = listTotal + corner - offset` |
| L, side B / U, sides B & C | the junction at the start | `centre = offset - corner` |
| U, side A | left or right junction, user picks | `centre = offset - corner` (start) or `listTotal + corner - offset` (end) |

The requested slot is split into filler | unit | filler, so the request holds to 0.1 cm. Only a request landing inside fixed work (for example inside the refrigerator tower) is nudged to the nearest auto-fill slot, and the reported position is the one actually built.

## Electronics tower (Magiccom + Oven)

Magic Generator's *Kabinet Elektronik* creates `tall_electro`, not a generic oven tower. Its Magiccom tray is on a real pair of rails at the **finished worktop height** (base height + countertop thickness). The pot and tray travel toward the cabinet front by `config.magiccom.extension` when the cabinet is opened. The oven niche starts 11 cm above the Magiccom body and is 56 cm high. The remaining height becomes overhead storage. The cutting-list parts include supports for every appliance niche, toe kick and upper/lower doors. Global base-height edits update the tray shelf while preserving appliance dimensions.

The electronics column is a configurable combination: `config.appliances` is an ordered list of `magiccom`, `dispenser`, `oven`, `microwave`. The first appliance sits on the worktop shelf (magiccom/dispenser pull out on rails); the rest stack above with 8-12 cm gaps. The oven unit is fixed at 44 × 29 × 32 cm; the microwave at 44 × 30 × 32 cm. Constraints warn when a chosen appliance cannot fit the column width/depth or when the total stack exceeds the cabinet height.

Internal organisers are animated pull-outs whose front panel travels with the frame when the cabinet opens: a three-tier chrome dish rack (standing plates, canisters, bottle rack with round holders), a narrow spice column, a pink 12 kg gas cylinder on a tray with a safety strap, and a cutlery tray with dividers and cutlery.

## Layer reorder on wall runs

The Layers panel groups base and tall cabinets by wall in **physical** order. Drag a row before/after another row on the same wall to reflow all unlocked units in that segment. The corner acts as a fixed anchor. Reflow uses the real cabinet widths, preserving the run's starting offset and closing gaps. Child sink/cooktop appliances, cooker hood and housing, and width-matched upper cabinets travel by the same wall-axis delta as their host. One state edit provides undo/redo and updates 2D, 3D, countertop and cutting list. Locked items and cross-wall/cross-corner moves are rejected with feedback.

## Hardware contrast

The chosen handle finish remains unchanged when it contrasts against the door. A nearly invisible stainless/white handle on a white door is rendered as brushed graphite; a dark handle on a dark door is rendered as brushed pale metal. The bar geometry is slightly thicker and projects farther from the door face. The same rule applies to corner handles.

## Regression Tests

Run from the project root:

```sh
node --import tsx --test tests/kitchen.regression.test.ts
```

The tests cover I/L/U layouts, fractional auto-fill, common top lines, global propagation, refrigerator invariance, dispenser niches, corner handedness, two-tier cabinets, countertop depth, LED creation, marble colours, black & white tinting and the cm-from-corner sink / stove placement. WebGL appearance and pointer interactions still require browser testing.