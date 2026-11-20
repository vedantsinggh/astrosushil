// Captured response of GET /api/v1/rashi-bhavishya/today?rashiIndex=1 for 2026-11-18:
// deterministic gochara facts plus narrative written by Gemini from those facts and
// validated by the backend. TEST DATA ONLY: the app never ships or shows this text.
import 'dart:convert';

import 'package:astro_mobile/features/astrology/models/rashi_bhavishya_model.dart';

const String kRashiBhavishyaAriesJson = r'''
{
 "data": {
  "date": "2026-11-18",
  "timezone": "Asia/Kolkata",
  "rashi": {
   "index": 1,
   "sanskritName": "Mesha",
   "englishName": "Aries",
   "element": "FIRE",
   "ruler": "MARS"
  },
  "resolvedFrom": "rashiIndex",
  "facts": {
   "reference": {
    "location": {
     "name": "Ujjain",
     "latitude": 23.1765,
     "longitude": 75.7885
    },
    "sunriseIso": "2026-11-18T01:12:18.210Z",
    "nextSunriseIso": "2026-11-19T01:12:58.117Z",
    "zodiac": "SIDEREAL",
    "ayanamsa": "LAHIRI",
    "nodes": "MEAN"
   },
   "panchang": {
    "vara": {
     "name": "Budhavara",
     "english": "Wednesday",
     "lord": "Mercury"
    },
    "tithi": {
     "name": "Navami",
     "paksha": "Shukla",
     "label": "Shukla Navami",
     "endsAtIso": "2026-11-19T01:36:33.892Z"
    },
    "nakshatra": {
     "name": "Shatabhisha",
     "lord": "Rahu",
     "pada": 1,
     "endsAtIso": "2026-11-19T00:39:26.042Z"
    },
    "yoga": {
     "name": "Dhruva",
     "endsAtIso": "2026-11-18T02:33:25.066Z"
    },
    "karana": {
     "name": "Balava",
     "endsAtIso": "2026-11-18T13:12:10.312Z"
    }
   },
   "moon": {
    "planet": "MOON",
    "name": "Moon",
    "sign": {
     "index": 11,
     "sanskritName": "Kumbha",
     "englishName": "Aquarius"
    },
    "degreeInSign": 7.77,
    "house": 11,
    "houseTheme": "gains, friends and fulfilment of wishes",
    "planetTheme": "mind, feelings and day-to-day mood",
    "classification": "favourable",
    "favourableHouses": [
     1,
     3,
     6,
     7,
     10,
     11
    ],
    "isRetrograde": false
   },
   "planets": [
    {
     "planet": "SUN",
     "name": "Sun",
     "sign": {
      "index": 8,
      "sanskritName": "Vrischika",
      "englishName": "Scorpio"
     },
     "degreeInSign": 1.48,
     "house": 8,
     "houseTheme": "sudden changes, research and hidden matters",
     "planetTheme": "authority, vitality and self-confidence",
     "classification": "demanding",
     "favourableHouses": [
      3,
      6,
      10,
      11
     ],
     "isRetrograde": false
    },
    {
     "planet": "MOON",
     "name": "Moon",
     "sign": {
      "index": 11,
      "sanskritName": "Kumbha",
      "englishName": "Aquarius"
     },
     "degreeInSign": 7.77,
     "house": 11,
     "houseTheme": "gains, friends and fulfilment of wishes",
     "planetTheme": "mind, feelings and day-to-day mood",
     "classification": "favourable",
     "favourableHouses": [
      1,
      3,
      6,
      7,
      10,
      11
     ],
     "isRetrograde": false
    },
    {
     "planet": "MARS",
     "name": "Mars",
     "sign": {
      "index": 5,
      "sanskritName": "Simha",
      "englishName": "Leo"
     },
     "degreeInSign": 2.45,
     "house": 5,
     "houseTheme": "intellect, children, creativity and learning",
     "planetTheme": "energy, drive and decisive action",
     "classification": "demanding",
     "favourableHouses": [
      3,
      6,
      11
     ],
     "isRetrograde": false
    },
    {
     "planet": "MERCURY",
     "name": "Mercury",
     "sign": {
      "index": 7,
      "sanskritName": "Tula",
      "englishName": "Libra"
     },
     "degreeInSign": 12.43,
     "house": 7,
     "houseTheme": "partnerships, spouse and dealings with others",
     "planetTheme": "communication, thinking and trade",
     "classification": "demanding",
     "favourableHouses": [
      2,
      4,
      6,
      8,
      10,
      11
     ],
     "isRetrograde": false
    },
    {
     "planet": "JUPITER",
     "name": "Jupiter",
     "sign": {
      "index": 5,
      "sanskritName": "Simha",
      "englishName": "Leo"
     },
     "degreeInSign": 1.81,
     "house": 5,
     "houseTheme": "intellect, children, creativity and learning",
     "planetTheme": "wisdom, growth and guidance",
     "classification": "favourable",
     "favourableHouses": [
      2,
      5,
      7,
      9,
      11
     ],
     "isRetrograde": false
    },
    {
     "planet": "VENUS",
     "name": "Venus",
     "sign": {
      "index": 6,
      "sanskritName": "Kanya",
      "englishName": "Virgo"
     },
     "degreeInSign": 28.96,
     "house": 6,
     "houseTheme": "daily work, health routines and competition",
     "planetTheme": "relationships, comforts and the arts",
     "classification": "demanding",
     "favourableHouses": [
      1,
      2,
      3,
      4,
      5,
      8,
      9,
      11,
      12
     ],
     "isRetrograde": false
    },
    {
     "planet": "SATURN",
     "name": "Saturn",
     "sign": {
      "index": 12,
      "sanskritName": "Meena",
      "englishName": "Pisces"
     },
     "degreeInSign": 14.17,
     "house": 12,
     "houseTheme": "expenses, rest, retreat and spiritual life",
     "planetTheme": "discipline, duty and patience",
     "classification": "demanding",
     "favourableHouses": [
      3,
      6,
      11
     ],
     "isRetrograde": true
    },
    {
     "planet": "RAHU",
     "name": "Rahu",
     "sign": {
      "index": 11,
      "sanskritName": "Kumbha",
      "englishName": "Aquarius"
     },
     "degreeInSign": 0.94,
     "house": 11,
     "houseTheme": "gains, friends and fulfilment of wishes",
     "planetTheme": "ambition and unconventional pursuits",
     "classification": "favourable",
     "favourableHouses": [
      3,
      6,
      11
     ],
     "isRetrograde": true
    },
    {
     "planet": "KETU",
     "name": "Ketu",
     "sign": {
      "index": 5,
      "sanskritName": "Simha",
      "englishName": "Leo"
     },
     "degreeInSign": 0.94,
     "house": 5,
     "houseTheme": "intellect, children, creativity and learning",
     "planetTheme": "detachment, introspection and letting go",
     "classification": "demanding",
     "favourableHouses": [
      3,
      6,
      11
     ],
     "isRetrograde": true
    }
   ],
   "events": [
    {
     "type": "SIGN_INGRESS",
     "planet": "VENUS",
     "planetName": "Venus",
     "timestampIso": "2026-11-22T11:15:01.796Z",
     "dateIst": "2026-11-22",
     "timeIst": "16:45",
     "withinDay": false,
     "fromSign": {
      "index": 6,
      "sanskritName": "Kanya",
      "englishName": "Virgo"
     },
     "toSign": {
      "index": 7,
      "sanskritName": "Tula",
      "englishName": "Libra"
     }
    }
   ],
   "tally": {
    "favourable": 3,
    "demanding": 6,
    "total": 9,
    "favourablePlanets": [
     "Moon",
     "Jupiter",
     "Rahu"
    ],
    "demandingPlanets": [
     "Sun",
     "Mars",
     "Mercury",
     "Venus",
     "Saturn",
     "Ketu"
    ],
    "method": "Count of the nine grahas whose sign at sunrise falls in a classically favourable house from the Moon sign (Phaladeepika ch. 26 gochara table, without vedha). It is a plain count, not a score."
   }
  },
  "prediction": {
   "summary": "Today brings a supportive lunar rhythm for everyone sharing the Aries Moon sign, encouraging social connection and purposeful gains.",
   "sections": [
    {
     "id": "day-overview",
     "title": "Today's Moon",
     "lead": "Today brings a supportive lunar rhythm for everyone sharing the Aries Moon sign, encouraging social connection and purposeful gains.",
     "paragraphs": [
      "For those with the Moon in Aries, the transiting Moon moves through Aquarius at sunrise, placing it in the 11th house counted from your Moon sign. In classical gochara, the Moon in the 11th house is considered favourable, highlighting matters of personal gains, friendships, and the fulfilment of your hopes. Because the Moon governs your feelings and day-to-day mood, this placement offers a constructive backdrop for collaborating with peers and pursuing your objectives with steady optimism.",
      "The day unfolds on Budhavara, a Wednesday ruled by Mercury, under the lunar phase of Shukla Navami. The Moon journeys through Shatabhisha nakshatra, which is ruled by Rahu, alongside the steady presence of Dhruva yoga. This panchang framework brings an analytical, observant quality to your thinking, helping you channel the favourable lunar momentum into well-structured plans, constructive discussions, and meaningful personal goals."
     ],
     "bullets": [],
     "takeaway": "Embrace opportunities to connect with friends and pursue your broader goals with calm confidence."
    },
    {
     "id": "planetary-weather",
     "title": "The wider planetary picture",
     "lead": "A steady backdrop of long-term transits invites you to balance creative insight with thoughtful pacing.",
     "paragraphs": [
      "Looking at the slower background transits counted from your Moon sign, Jupiter transits Leo in the 5th house of intellect, creativity, and learning, an orientation classed favourable in classical gochara that supports wise discernment. In contrast, Saturn transits Pisces in the 12th house of expenses, rest, and retreat, and is retrograde at sunrise; classical tables class this as demanding, inviting disciplined pacing and regular rest. Meanwhile, Rahu transits Aquarius in your 11th house of gains as a favourable influence, while Ketu transits Leo in your 5th house in its normal reverse motion, a demanding transit encouraging inner detachment.",
      "Among the faster-moving bodies counted from your Moon sign, Mars transits Leo in the 5th house, bringing active energy to creative thinking, though classical guidelines class this as demanding extra care against impatience. The Sun transits Scorpio in your 8th house of sudden changes and research, a transit classed demanding that asks for steady vitality. Mercury transits Libra in your 7th house of partnerships, and Venus transits Virgo in your 6th house of daily work before Venus moves into Libra later this week; both transits are classed demanding, suggesting clear communication with others and measured attention to daily routines."
     ],
     "bullets": [],
     "takeaway": "Balance creative ambition with patient discipline, giving yourself space to manage work and relationships thoughtfully."
    },
    {
     "id": "guidance",
     "title": "Making the most of today",
     "lead": "Navigating today smoothly comes down to leaning into supportive alliances while meeting practical obligations with patience.",
     "paragraphs": [
      "In today's planetary configuration, 3 of 9 planets occupy classically favourable houses counted from your Aries Moon sign, while 6 of 9 planets occupy houses classed demanding. This plain count simply suggests directing your vitality toward areas of natural flow while applying conscious care where extra patience is called for. With the Moon and Rahu occupying your 11th house alongside Jupiter elevating your 5th house, your natural strengths today center on creative perspective and constructive community ties. Meeting your work routines and personal discussions with calm awareness allows you to make the most of every interaction."
     ],
     "bullets": [
      "Collaborate with peers and share your long-term aspirations, taking advantage of the favourable Moon and Rahu in your 11th house of gains.",
      "Bring extra patience and diplomatic clarity to one-on-one discussions, keeping Mercury's demanding transit through your 7th house smooth.",
      "Set aside quiet time in the evening to rest and regulate expenses, honouring the reflective demands of Saturn in your 12th house."
     ],
     "takeaway": "Draw upon the encouragement of friends and creative ideas, addressing daily routines with calm, methodical attention."
    }
   ],
   "verifiedEvidenceIds": [
    "event.1",
    "panchang.nakshatra",
    "panchang.tithi",
    "panchang.vara",
    "panchang.yoga",
    "rashi.sign",
    "tally.demanding",
    "tally.favourable",
    "transit.jupiter.gochara",
    "transit.jupiter.house",
    "transit.jupiter.sign",
    "transit.ketu.gochara",
    "transit.ketu.house",
    "transit.ketu.motion",
    "transit.ketu.sign",
    "transit.mars.gochara",
    "transit.mars.house",
    "transit.mars.sign",
    "transit.mercury.gochara",
    "transit.mercury.house",
    "transit.mercury.sign",
    "transit.moon.gochara",
    "transit.moon.house",
    "transit.moon.sign",
    "transit.rahu.gochara",
    "transit.rahu.house",
    "transit.rahu.motion",
    "transit.rahu.sign",
    "transit.saturn.gochara",
    "transit.saturn.house",
    "transit.saturn.motion",
    "transit.saturn.sign",
    "transit.sun.gochara",
    "transit.sun.house",
    "transit.sun.sign",
    "transit.venus.gochara",
    "transit.venus.house",
    "transit.venus.sign"
   ],
   "language": "en"
  },
  "method": {
   "version": "rb-gochara-1",
   "summary": "Planet positions at sunrise in Ujjain (sidereal, Lahiri ayanamsa, mean nodes). Each planet's house is counted from your Moon sign (whole signs) and compared with the classical gochara table of favourable houses. Vedha (obstruction) is not applied.",
   "vedha": "not-applied",
   "sources": [
    "Phaladeepika ch. 26 (Gochara Phala)",
    "Brihat Parashara Hora Shastra (house and planet significations)"
   ]
  },
  "generation": {
   "provider": "gemini",
   "model": "gemini-3.8-flash",
   "promptVersion": "rb-narrative-1",
   "generatedAt": "2026-11-18T05:36:18.886Z"
  },
  "source": "astro-sushil-gochara",
  "isDevelopmentFixture": false
 }
}
''';

Map<String, dynamic> rashiBhavishyaSampleJson() => jsonDecode(kRashiBhavishyaAriesJson) as Map<String, dynamic>;

RashiBhavishyaModel rashiBhavishyaSampleModel() => RashiBhavishyaModel.fromJson(rashiBhavishyaSampleJson());
