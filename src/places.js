// Teleport destinations and on-screen notes for each place.
const yawTo = (from, to) => Math.atan2(-(to[0] - from[0]), -(to[1] - from[1]));

const fp = (label, fa, pos, lookAt, pitch = 0, mode = 'walk') => ({ label, fa, pos, yaw: yawTo([pos[0], pos[2]], lookAt), pitch, mode });

export const PLACES = {
  start: fp('Start', '', [-34, 0, -120], [0, 270], 0.05),
  pool: fp('The great pool', 'حوض', [6, 0, 16], [0, 270], 0.0),
  shahPortal: fp('Shah Mosque portal', 'سردر مسجد شاه', [0, 0, 238], [0, 275], 0.32),
  shahCourt: fp('Shah Mosque courtyard', 'صحن', [-6.5, 0, 314.5], [-58, 366], 0.08),
  shahDome: fp('Under the great dome', 'گنبدخانه', [-58.3, 0, 366.3], [-70, 378], 0.95),
  lotfPortal: fp('Sheikh Lotfollah Mosque', 'شیخ لطف‌الله', [58, 0, 62], [100, 64], 0.24),
  lotfChamber: fp('Lotfollah dome chamber', 'گنبدخانه', [122, 0, 64], [111, 75], 0.7),
  aliTalar: fp('Talar of Ali Qapu', 'تالار عالی قاپو', [-73.5, 13.5, 66], [60, 60], -0.04),
  aliMusic: fp('Ali Qapu music room', 'اتاق موسیقی', [-92, 28.8, 60], [-98, 72], 0.15),
  bazaar: fp('Qeysarieh Gate & bazaar', 'قیصریه', [0, 0, -238], [0, -300], 0.18),
  aerial: { label: 'Aerial view', fa: 'نمای هوایی', mode: 'orbit', pos: { cam: [260, 230, 330], target: [-10, 5, 60] } },
};

export const TOUR = ['pool', 'shahPortal', 'shahCourt', 'shahDome', 'lotfPortal', 'lotfChamber', 'aliTalar', 'aliMusic', 'bazaar', 'aerial'];

export const PLACE_INFO = {
  maydan: { fa: 'میدان نقش جهان', en: 'Naqsh-e Jahan Square', note: 'Laid out by Shah Abbas I from 1598 as the heart of his new capital: 512 × 160 m of polo ground, parade ground and market.' },
  pool: { fa: 'حوض', en: 'The great pool', note: '80 × 30 m, on the cross-axis between Ali Qapu and Sheikh Lotfollah. At dusk the Shah Mosque’s portal floats in it.' },
  polo: { fa: 'دروازه‌های چوگان', en: 'Polo goalposts', note: 'Stone goalposts stand at both ends, from the days when the court watched chowgan from the talar of Ali Qapu.' },
  aliqapuFront: { fa: 'عالی قاپو', en: 'Ali Qapu, the Lofty Gate', note: 'The palace gateway. Its raised talar held the Shah and his guests above the square.' },
  qeysariehFront: { fa: 'سردر قیصریه', en: 'Qeysarieh Gate', note: 'The mouth of the Grand Bazaar. Above the arch, a tile Sagittarius: the city’s sign.' },
  city: { fa: 'اصفهان', en: 'Isfahan', note: 'Esfahān nesf-e jahān: “Isfahan is half the world.”' },
  aerial: { fa: 'نقش جهان', en: 'Image of the World', note: 'Naqsh-e Jahan means “image of the world”. A UNESCO World Heritage Site since 1979.' },
  shahPortal: { fa: 'سردر مسجد شاه', en: 'Portal of the Shah Mosque', note: 'About 27 m high, set back in a half-octagonal recess. It faces the square; the mosque behind turns 45° to face Mecca.' },
  shahVestibule: { fa: 'هشتی', en: 'The vestibule', note: 'A domed hall where the building pivots from the square’s axis toward the qibla.' },
  shahCourt: { fa: 'صحن مسجد شاه', en: 'Courtyard of the Shah Mosque', note: 'Four iwans around a pool, nearly every surface in seven-colour haft-rangi tile. Built 1611–1629.' },
  shahQibla: { fa: 'ایوان قبله', en: 'The qibla iwan', note: 'About 33 m high, flanked by two 48 m minarets. The domed sanctuary lies beyond.' },
  shahDome: { fa: 'گنبدخانه', en: 'Under the great dome', note: 'A double shell: ~38 m inside, ~52 m outside. Stand on the black stone at the centre and press C to hear the echoes.' },
  lotfPortal: { fa: 'مسجد شیخ لطف‌الله', en: 'Sheikh Lotfollah Mosque', note: 'Built 1603–1619 for the royal household. No minarets, no courtyard: a single domed chamber.' },
  lotfCorridor: { fa: 'دالان', en: 'The bent corridor', note: 'A dim passage turns left, then right, so that you enter the chamber facing the mihrab.' },
  lotfChamber: { fa: 'گنبدخانه شیخ لطف‌الله', en: 'The dome chamber', note: 'Rings of 32 lemon-shaped medallions shrink toward the “peacock” at the apex. Inscriptions by Ali Reza Abbasi.' },
  aliGate: { fa: 'دروازه عالی قاپو', en: 'Gate of Ali Qapu', note: 'The passage into the palace precinct. A spiral stair on the left climbs to the talar and the music room.' },
  aliStair: { fa: 'پلکان', en: 'The spiral stair', note: 'The first doorway opens onto the talar; the stair ends at the music room.' },
  aliTalar: { fa: 'تالار عالی قاپو', en: 'The talar', note: '18 slender wooden columns in three rows of six hold a coffered ceiling over a copper-lined pool.' },
  aliMusic: { fa: 'اتاق موسیقی', en: 'The music room', note: 'Stucco cut into vases and ewers (tong-bori) tames the echoes for the court’s musicians.' },
  bazaar: { fa: 'بازار بزرگ', en: 'The Grand Bazaar', note: 'Covered streets run north toward the old Friday Mosque. Coppersmiths still hammer nearby.' },
  qeysarieh: { fa: 'سردر قیصریه', en: 'Qeysarieh Gate', note: 'Frescoes attributed to Reza Abbasi showed a hunt, a battle and European visitors. The naqqareh-khaneh above played at sunrise and sunset.' },
};
