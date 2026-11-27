// Each night is a new fictional astronomical composition, rather than a claim
// that real galaxies change shape overnight. Extended galaxies stay diffuse;
// only the foreground stars receive atmospheric scintillation in scene.js.
// Structure: https://science.nasa.gov/universe/galaxies/types/
// Dust absorption: https://www.eso.org/public/products/mountedimages/mounted_0193/
// Scintillation: https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question26.html
const TAU = Math.PI * 2;
const mod = (value, length) => ((value % length) + length) % length;

function random(index, salt) {
  let bits = Math.imul(index ^ salt, 0x45d9f3b);
  bits = Math.imul(bits ^ bits >>> 16, 0x45d9f3b);
  return ((bits ^ bits >>> 16) >>> 0) / 4294967296;
}

let cachedIndex;
let cachedProfile;

export function celestialProfile(nightIndex) {
  if (cachedIndex === nightIndex) return cachedProfile;
  const sample = salt => random(nightIndex, salt);
  const kind = mod(nightIndex, 4);
  const densityTier = mod(nightIndex, 3);
  const bandAngles = [-.66, -.12, .37, .73];
  const bend = (.025 + sample(37291) * .085) * (sample(59287) < .5 ? -1 : 1);
  const profile = {
    nightIndex,
    seed: Math.floor(sample(91873) * 4294967296) >>> 0,
    // Alternating density ranges make adjacent evenings clearly different,
    // while bounded counts keep the Canvas layer inexpensive on a small screen.
    starDensity: .56 + densityTier * .36 + sample(17389) * .15,
    brightFraction: .007 + sample(85213) * .028,
    warmFraction: (mod(nightIndex, 2) ? .31 : .08) + sample(71329) * .16,
    starScale: .83 + sample(61913) * .34,
    twinkleStrength: .42 + sample(54293) * .86,
    twinkleRate: .47 + sample(28933) * .91,
    bandFraction: .25 + sample(68147) * .43,
    // Radians, height units, height units, normalized height from the horizon.
    band: [bandAngles[mod(nightIndex, 4)] + (sample(41281) - .5) * .29,
      .052 + mod(nightIndex + 1, 3) * .033 + sample(19237) * .020,
      bend, .45 + sample(73291) * .18],
    // Dust-noise coordinates, stellar tint, and dust fragmentation.
    bandDetail: [12 + sample(81239) * 170, 12 + sample(21937) * 170,
      sample(41213), .28 + sample(71287) * .64],
    // Spiral, barred spiral, elliptical, irregular; all four appear in four nights.
    galaxyShape: [kind, kind === 1 ? 2 : 2 + Math.floor(sample(12739) * 4),
      2.0 + sample(97187) * 3.6, sample(37273) * TAU],
    // The remote object stays off center, small and elongated, never a planet.
    galaxyPose: [sample(81931) < .5 ? .22 + sample(93517) * .16 : .64 + sample(93517) * .14,
      .58 + sample(55931) * .22, .070 + sample(27947) * .044,
      kind === 2 ? .40 + sample(18233) * .25 : .42 + sample(18233) * .40],
  };
  for (const key of ['band', 'bandDetail', 'galaxyShape', 'galaxyPose']) Object.freeze(profile[key]);
  cachedIndex = nightIndex;
  cachedProfile = Object.freeze(profile);
  return cachedProfile;
}
