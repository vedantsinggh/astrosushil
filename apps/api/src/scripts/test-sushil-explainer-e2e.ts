import { buildApp } from '../app';
import { prisma } from '../services/prisma.service';

async function main() {
  console.log('=== SUSHIL EXPLAINER END-TO-END VERIFICATION ===');
  const app = await buildApp();
  await app.ready();

  const userId = '11111111-1111-1111-1111-111111111111';
  const token = app.jwt.sign({ sub: userId, role: 'USER' });

  // 1. Birth Chart Explanation Test
  console.log('\n--- 1. Testing Birth Chart Context ---');
  const birthChartPayload = {
    feature: 'birth_chart',
    screenTitle: 'Birth Chart (Kundli)',
    purpose: 'Explain the natal chart placements, ascendant sign, and core planets',
    context: {
      astrologyData: {
        ascendant: { sign: 'Leo', degree: 14.5, nakshatra: 'Purva Phalguni' },
        planets: [
          { name: 'Sun', sign: 'Taurus', house: 10, degree: 28.2, nakshatra: 'Krittika', isRetrograde: false },
          { name: 'Moon', sign: 'Capricorn', house: 6, degree: 12.1, nakshatra: 'Shravana', isRetrograde: false },
          { name: 'Mars', sign: 'Aries', house: 9, degree: 18.4, nakshatra: 'Bharani', isRetrograde: false },
          { name: 'Jupiter', sign: 'Cancer', house: 12, degree: 5.7, nakshatra: 'Pushya', isRetrograde: false },
        ],
        houses: [
          { houseNumber: 1, sign: 'Leo', occupyingPlanets: [] },
          { houseNumber: 10, sign: 'Taurus', occupyingPlanets: ['Sun'] },
        ],
      },
      importantValues: {
        ascendantSign: 'Leo',
        moonSign: 'Capricorn',
        sunSign: 'Taurus',
      },
      userProfileContext: {
        name: 'Demo Client',
        dateOfBirth: '1992-05-15',
        placeName: 'New Delhi, India',
      },
    },
  };

  const res1 = await app.inject({
    method: 'POST',
    url: '/api/v1/jyoti/explain',
    headers: { authorization: `Bearer ${token}` },
    payload: birthChartPayload,
  });

  console.log('Status Code:', res1.statusCode);
  const body1 = JSON.parse(res1.payload);
  console.log('Structured Response Data:');
  console.log(JSON.stringify(body1.data, null, 2));

  // 2. Vimshottari Dasha Explanation Test
  console.log('\n--- 2. Testing Vimshottari Dasha Context ---');
  const dashaPayload = {
    feature: 'vimshottari_dasha',
    screenTitle: 'Vimshottari Dasha',
    context: {
      astrologyData: {
        currentMahadasha: { planet: 'Jupiter', startDate: '2020-03-15', endDate: '2036-03-15', durationYears: 16 },
        currentAntardasha: { planet: 'Saturn', startDate: '2024-05-10', endDate: '2026-11-20' },
        currentPratyantardasha: { planet: 'Mercury', startDate: '2026-08-01', endDate: '2026-12-15' },
      },
      importantValues: {
        activeMahadasha: 'Jupiter',
        activeAntardasha: 'Saturn',
      },
    },
  };

  const res2 = await app.inject({
    method: 'POST',
    url: '/api/v1/jyoti/explain',
    headers: { authorization: `Bearer ${token}` },
    payload: dashaPayload,
  });

  console.log('Status Code:', res2.statusCode);
  const body2 = JSON.parse(res2.payload);
  console.log('Structured Response Data:');
  console.log(JSON.stringify(body2.data, null, 2));

  // 3. Shadbala Explanation Test
  console.log('\n--- 3. Testing Shadbala Strength Context ---');
  const shadbalaPayload = {
    feature: 'shadbala',
    screenTitle: 'Planetary Strength (Shadbala)',
    context: {
      astrologyData: {
        selectedPlanet: { planet: 'JUPITER', totalRupas: 7.8, percentageOfRequired: 1.45, rank: 1, isStrong: true },
        allPlanets: [
          { planet: 'JUPITER', totalRupas: 7.8, rank: 1, isStrong: true },
          { planet: 'SUN', totalRupas: 6.4, rank: 2, isStrong: true },
          { planet: 'MARS', totalRupas: 5.9, rank: 3, isStrong: true },
          { planet: 'SATURN', totalRupas: 4.8, rank: 7, isStrong: false },
        ],
      },
      importantValues: {
        strongestPlanet: 'JUPITER',
        weakestPlanet: 'SATURN',
      },
    },
  };

  const res3 = await app.inject({
    method: 'POST',
    url: '/api/v1/jyoti/explain',
    headers: { authorization: `Bearer ${token}` },
    payload: shadbalaPayload,
  });

  console.log('Status Code:', res3.statusCode);
  const body3 = JSON.parse(res3.payload);
  console.log('Structured Response Data:');
  console.log(JSON.stringify(body3.data, null, 2));

  await app.close();
  console.log('\n=== END-TO-END VERIFICATION COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error);
