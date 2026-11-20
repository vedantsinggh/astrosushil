/**
 * Static educational text for the Rahu–Ketu Transit report (identical for
 * every reader). Written for Astro Sushil; mythology retold in our own words.
 */
import { StaticContent } from '../_planet-transit-shared/blocks';

export const NODES_LEGEND: StaticContent = {
  paragraphs: [
    'The story of Rahu and Ketu begins with the churning of the ocean of milk (Samudra Manthan). Gods and asuras worked together, using the serpent Vasuki as a rope and Mount Mandara as the churning rod, to bring up amrita, the nectar of immortality. When the nectar finally appeared, Vishnu took the form of the enchantress Mohini to serve it to the gods alone.',
    'One asura, Svarbhanu, disguised himself and sat between the Sun and the Moon in the line of the gods. He had just swallowed a drop when the Sun and Moon recognised him. Vishnu\'s discus severed his head from his body, but the nectar had already made him immortal. The head became Rahu and the body became Ketu, and the two were given places among the grahas. Their old grudge against the Sun and Moon is the mythic picture of the eclipses, which happen only when the luminaries are near the nodes.',
    'The story carries the meaning astrologers still use. Rahu, the head without a body, is hunger without satisfaction: ambition, curiosity, desire for the new and unfamiliar, and the restless drive that pushes us into unknown territory. Ketu, the body without a head, is action without the need for recognition: detachment, intuition, past mastery, spiritual insight and the ability to let go. Together they mark an axis of karma running through the chart, from what we already know (Ketu) to what we are here to learn (Rahu).',
  ],
  verse: {
    devanagari: ['अर्धकायं महावीर्यं चन्द्रादित्यविमर्दनम् ।', 'सिंहिकागर्भसम्भूतं तं राहुं प्रणमाम्यहम् ॥'],
    transliteration: 'Ardha-kayam maha-viryam chandraditya-vimardanam, simhika-garbha-sambhutam tam rahum pranamamyaham.',
    meaning: 'I bow to Rahu, the half-bodied one of great strength, who eclipses the Moon and the Sun, born of Simhika.',
    source: 'Navagraha Stotra, traditionally attributed to Sage Vyasa',
  },
};

export const KETU_VERSE: StaticContent = {
  paragraphs: [
    'Ketu is honoured in the same hymn as the "head of the stars", the comet-like force that cuts through illusion. Traditionally associated with Lord Ganesha, the remover of obstacles, Ketu is the graha of moksha, liberation: it shows where we have already learned enough and can afford to release attachment.',
  ],
  verse: {
    devanagari: ['पलाशपुष्पसङ्काशं तारकाग्रहमस्तकम् ।', 'रौद्रं रौद्रात्मकं घोरं तं केतुं प्रणमाम्यहम् ॥'],
    transliteration: 'Palasha-pushpa-sankasham taraka-graha-mastakam, raudram raudratmakam ghoram tam ketum pranamamyaham.',
    meaning: 'I bow to Ketu, coloured like the palasha flower, the head among stars and planets, intense and powerful in nature.',
    source: 'Navagraha Stotra, traditionally attributed to Sage Vyasa',
  },
};

export const NODES_HOUSES: StaticContent = {
  paragraphs: [
    'Rahu and Ketu are not physical bodies but the two points where the Moon\'s orbit crosses the apparent path of the Sun. They are always exactly opposite each other, so wherever Rahu sits, Ketu sits in the seventh sign from it. Because they own no sign by default, they act through the lord of the sign they occupy (their dispositor) and through the planets they join.',
    'Rahu magnifies the matters of its house: it brings appetite, ambition and unconventional opportunity there, along with the restlessness of never quite feeling finished. Ketu, in the opposite house, tends to bring natural skill and an inner sense of "I have done this before", together with detachment or disinterest in the same matters. Reading the two houses together shows the reader\'s karmic axis: where to grow, and where to rest on old strength.',
    'Some classical traditions give the nodes aspects like Jupiter\'s, on the 5th, 7th and 9th signs from their position; this report follows that convention (the one used by our calculation engine) and says so wherever node aspects appear.',
  ],
};

export const NODES_MOTION: StaticContent = {
  paragraphs: [
    'Unlike the planets, the lunar nodes move backwards through the zodiac almost all the time, from Pisces to Aquarius to Capricorn and so on. This is why the nodes are said to be always retrograde. They take about 18.6 years to travel once around the zodiac, spending roughly a year and a half in each sign, so the pair changes signs together on the same day.',
    'This report uses the mean node, the smoothly moving average position used by most Indian almanacs. The true node wobbles back and forth around it by up to about a degree and a half, which can shift an ingress date by some weeks; the convention is recorded in the report manifest.',
  ],
  bullets: [
    ['Node return:', 'the nodes come back to their natal signs about every 18.6 years (around ages 18–19, 37, 56 and 74). These years are traditionally seen as turning points of direction.'],
    ['Eclipses:', 'solar and lunar eclipses happen only when the Sun and Moon are near the nodes, which is why eclipse seasons are read as node seasons.'],
    ['No Ashtakavarga of their own:', 'the classical Ashtakavarga scheme uses the seven visible grahas and the Ascendant only; the nodes are judged by the Sarvashtakavarga of the sign they transit.'],
  ],
};

export const NODES_MANTRA: StaticContent = {
  paragraphs: [
    'Rahu is traditionally remembered on Saturdays and Ketu on Tuesdays, though any calm, regular time works. Repeat the mantra slowly with a steady breath; a single round of 108 said with full attention is a complete practice.',
  ],
  verse: {
    devanagari: ['ॐ रां राहवे नमः', 'ॐ कें केतवे नमः'],
    transliteration: 'Om Ram Rahave Namah. Om Kem Ketave Namah.',
    meaning: 'Salutations to Rahu; salutations to Ketu.',
    source: 'Traditional Navagraha mantras of the lunar nodes',
  },
  bullets: [
    ['For Rahu:', 'devotion to Goddess Durga is traditional; a few minutes of chanting or simply sitting in silence calms Rahu\'s restlessness.'],
    ['For Ketu:', 'prayer to Lord Ganesha before beginning new work, and quiet meditation, are traditional Ketu practices.'],
    ['Screens and stillness:', 'a regular screen-free hour each day is a modern, very effective Rahu practice.'],
  ],
};
