export interface VastuCategory {
  id: number;
  slug: string;
  name: string;
  sanskritName: string;
  description: string;
  idealDirection: string;
  element: string;
  iconName: string;
}

export interface VastuGuidanceItem {
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  idealDirection: string;
  alternativeDirections: string[];
  forbiddenDirections: string[];
  element: string;
  rulingPlanet: string;
  keyPrinciples: string[];
  dos: string[];
  donts: string[];
  remedies: string[];
}

export const VASTU_CATEGORIES: VastuCategory[] = [
  {
    id: 1,
    slug: 'main-entrance',
    name: 'Main Entrance (Simhadwara)',
    sanskritName: 'Simhadwara',
    description: 'The primary gateway of cosmic Prana energy entering the residence.',
    idealDirection: 'North, East, or North-East',
    element: 'Air / Space',
    iconName: 'door',
  },
  {
    id: 2,
    slug: 'puja-room',
    name: 'Puja & Meditation Room',
    sanskritName: 'Ishan / Devasthana',
    description: 'Sacred sanctuary for spiritual focus, peace, and divine vibrations.',
    idealDirection: 'North-East (Ishan)',
    element: 'Water / Ether',
    iconName: 'temple',
  },
  {
    id: 3,
    slug: 'master-bedroom',
    name: 'Master Bedroom',
    sanskritName: 'Nairrutya',
    description: 'Zone of stability, deep rest, leadership, and emotional security.',
    idealDirection: 'South-West (Nairrutya)',
    element: 'Earth',
    iconName: 'bed',
  },
  {
    id: 4,
    slug: 'kitchen',
    name: 'Kitchen (Agneya)',
    sanskritName: 'Agni Kona',
    description: 'Zone of fire energy, health, digestive strength, and vitality.',
    idealDirection: 'South-East (Agneya)',
    element: 'Fire',
    iconName: 'kitchen',
  },
  {
    id: 5,
    slug: 'study-office',
    name: 'Study Room & Home Office',
    sanskritName: 'Vidyasthana',
    description: 'Zone of intellect, memory, sharp concentration, and career growth.',
    idealDirection: 'North or East',
    element: 'Air',
    iconName: 'book',
  },
  {
    id: 6,
    slug: 'water-tank',
    name: 'Water Storage & Tanks',
    sanskritName: 'Jalasthana',
    description: 'Overhead and underground water storage placement.',
    idealDirection: 'Underground: North-East; Overhead: South-West / West',
    element: 'Water',
    iconName: 'water',
  },
  {
    id: 7,
    slug: 'living-room',
    name: 'Living & Drawing Room',
    sanskritName: 'Sabha Griha',
    description: 'Zone of social connections, harmony with guests, and family cohesion.',
    idealDirection: 'North-East, North, or East',
    element: 'Air / Space',
    iconName: 'sofa',
  },
  {
    id: 8,
    slug: 'bathroom-toilet',
    name: 'Bathroom & Toilet',
    sanskritName: 'Shouchalaya',
    description: 'Zone of waste elimination and drainage.',
    idealDirection: 'North-West (Vayavya) or South-of-South-West',
    element: 'Air / Earth',
    iconName: 'shower',
  },
];

export const VASTU_GUIDANCE_DATA: Record<number, VastuGuidanceItem> = {
  1: {
    categoryId: 1,
    categorySlug: 'main-entrance',
    categoryName: 'Main Entrance (Simhadwara)',
    idealDirection: 'North, East, or North-East',
    alternativeDirections: ['North-West'],
    forbiddenDirections: ['South-West'],
    element: 'Air / Space',
    rulingPlanet: 'Jupiter / Sun',
    keyPrinciples: [
      'The entrance door should be larger than all other doors in the home.',
      'Maintain bright illumination and keep the threshold free of footwear clutter.',
      'Ensure the main door opens inward in a clockwise direction.',
    ],
    dos: [
      'Place a Swastika, Om, or Toran symbol near the entrance.',
      'Ensure the entrance is well-lit with warm, welcoming light.',
      'Keep the doorway clean and unobstructed at all times.',
    ],
    donts: [
      'Do not place garbage bins or broken items near the main entrance.',
      'Avoid mirrors directly facing the main door as they reflect positive energy out.',
      'Do not position the main entrance directly facing a pole or tree.',
    ],
    remedies: [
      'If the entrance is in South-West, place a brass pyramid above the doorframe.',
      'Keep a bowl of sea salt or water with fresh flowers near the doorway.',
    ],
  },
  2: {
    categoryId: 2,
    categorySlug: 'puja-room',
    categoryName: 'Puja & Meditation Room',
    idealDirection: 'North-East (Ishan)',
    alternativeDirections: ['East', 'North'],
    forbiddenDirections: ['South', 'South-West'],
    element: 'Water / Ether',
    rulingPlanet: 'Jupiter',
    keyPrinciples: [
      'Face East or North while offering prayers or meditating.',
      'Keep idols at least 1 inch away from the wall to allow energy circulation.',
      'Use light colors such as white, light yellow, or pale blue.',
    ],
    dos: [
      'Light a ghee lamp or incense daily in the North-East zone.',
      'Keep the altar at an elevated height above floor level.',
      'Maintain absolute cleanliness and peaceful silence in this sacred space.',
    ],
    donts: [
      'Do not build a puja room under a staircase or inside a bedroom.',
      'Do not share a wall between the puja room and a bathroom/toilet.',
      'Avoid placing pictures of deceased ancestors inside the puja altar.',
    ],
    remedies: [
      'If North-East is unavailable, dedicate a neat shelf in the East zone for daily prayers.',
    ],
  },
  3: {
    categoryId: 3,
    categorySlug: 'master-bedroom',
    categoryName: 'Master Bedroom',
    idealDirection: 'South-West (Nairrutya)',
    alternativeDirections: ['South', 'West'],
    forbiddenDirections: ['North-East'],
    element: 'Earth',
    rulingPlanet: 'Rahu / Saturn',
    keyPrinciples: [
      'Sleep with head pointing toward South or East for optimal rest and vitality.',
      'The head of the family should occupy the South-West master bedroom.',
      'Use solid wood bedframes rather than metal frames.',
    ],
    dos: [
      'Use warm, earthy colors like terracotta, almond, or beige.',
      'Ensure the bed is placed against a solid wall.',
    ],
    donts: [
      'Avoid mirrors facing the bed directly while sleeping.',
      'Do not place heavy water features or aquariums in the South-West bedroom.',
      'Do not sleep directly under exposed ceiling beams.',
    ],
    remedies: [
      'Place a lead crystal or rock salt lamp in the South-West corner to absorb negative vibes.',
    ],
  },
  4: {
    categoryId: 4,
    categorySlug: 'kitchen',
    categoryName: 'Kitchen (Agneya)',
    idealDirection: 'South-East (Agneya)',
    alternativeDirections: ['North-West (Vayavya)'],
    forbiddenDirections: ['North-East', 'South-West'],
    element: 'Fire',
    rulingPlanet: 'Venus / Mars',
    keyPrinciples: [
      'Cook facing East for health and positive energy.',
      'Keep the fire element (stove) and water element (sink) separated by distance.',
      'Store grains and heavy provisions in the West or South-West area of the kitchen.',
    ],
    dos: [
      'Keep the stove clean and in perfect working order.',
      'Use colors like orange, yellow, or light red accents.',
    ],
    donts: [
      'Do not place the kitchen directly under or adjacent to a toilet.',
      'Avoid placing the stove and sink right next to each other on the same counter.',
    ],
    remedies: [
      'If the kitchen is in North-East, place a small copper pyramid or yellow jasper gemstone near the stove.',
    ],
  },
  5: {
    categoryId: 5,
    categorySlug: 'study-office',
    categoryName: 'Study Room & Home Office',
    idealDirection: 'North or East',
    alternativeDirections: ['North-East'],
    forbiddenDirections: ['South-West'],
    element: 'Air',
    rulingPlanet: 'Mercury',
    keyPrinciples: [
      'Sit facing North or East while studying or working.',
      'Ensure the desk does not face a blank wall directly up close.',
      'Keep the study desk clutter-free and organized.',
    ],
    dos: [
      'Place a globe, Saraswati idol, or crystal tower on the East side of the desk.',
      'Use proper task lighting and light pastel wall paint.',
    ],
    donts: [
      'Do not sit with your back facing an open doorway.',
      'Avoid clutter and piles of unread books in the study area.',
    ],
    remedies: [
      'Place a green plant or Jade plant on the desk to boost Mercury energy.',
    ],
  },
  6: {
    categoryId: 6,
    categorySlug: 'water-tank',
    categoryName: 'Water Storage & Tanks',
    idealDirection: 'Underground: North-East; Overhead: South-West / West',
    alternativeDirections: ['North', 'East for underground'],
    forbiddenDirections: ['Overhead tank in North-East'],
    element: 'Water',
    rulingPlanet: 'Moon',
    keyPrinciples: [
      'Underground water tanks belong in North-East to enhance prosperity.',
      'Overhead water tanks belong in South-West / West to provide structural weight.',
    ],
    dos: [
      'Keep water tanks covered, clean, and leak-free.',
    ],
    donts: [
      'Do not place overhead water tanks in the North-East corner.',
    ],
    remedies: [
      'Ensure no water leakages or dripping taps exist anywhere in the premises.',
    ],
  },
  7: {
    categoryId: 7,
    categorySlug: 'living-room',
    categoryName: 'Living & Drawing Room',
    idealDirection: 'North-East, North, or East',
    alternativeDirections: ['North-West'],
    forbiddenDirections: ['South-West'],
    element: 'Air / Space',
    rulingPlanet: 'Jupiter / Venus',
    keyPrinciples: [
      'Heavy furniture (sofas) should be placed against the South and West walls.',
      'Keep the center of the room (Brahmasthan) open and light.',
    ],
    dos: [
      'Hang uplifting artwork or natural landscape paintings on the North wall.',
      'Use bright, joyful colors for drapes and cushions.',
    ],
    donts: [
      'Avoid displaying pictures of war, dried flowers, or wild animals.',
    ],
    remedies: [
      'Keep a bowl of water with fresh flower petals in the North-East corner of the living room.',
    ],
  },
  8: {
    categoryId: 8,
    categorySlug: 'bathroom-toilet',
    categoryName: 'Bathroom & Toilet',
    idealDirection: 'North-West (Vayavya) or South-of-South-West',
    alternativeDirections: ['West-of-South-West'],
    forbiddenDirections: ['North-East', 'South-East'],
    element: 'Air / Earth',
    rulingPlanet: 'Rahu',
    keyPrinciples: [
      'Position the toilet commode along the North-South axis.',
      'Keep the bathroom door closed at all times when not in use.',
    ],
    dos: [
      'Use light shades of blue, beige, or white.',
      'Ensure good ventilation and exhaust fans.',
    ],
    donts: [
      'Never place a toilet in the North-East (Ishan) zone.',
    ],
    remedies: [
      'If toilet is misaligned, place a bowl of raw rock salt inside the bathroom and replace weekly.',
    ],
  },
};
