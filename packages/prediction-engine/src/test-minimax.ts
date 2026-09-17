import { OpenRouterCareerAnalysisProvider } from './providers/openrouter-career-analysis.provider';
import { CareerAnalysisInput } from './types/evidence.types';

async function runDirectTest() {
  console.log('=== DIRECT OPENROUTER MINIMAX M3 TEST ===');
  
  const sampleInput: CareerAnalysisInput = {
    reportId: 'test-direct-001',
    birthProfile: {
      name: 'Vedant Singh',
      dateOfBirth: '1995-10-15',
      timeOfBirth: '14:30',
      placeName: 'New Delhi, India',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
    },
    careerAxis: {
      ascendantSign: 'Capricorn',
      ascendantDegree: 15.4,
      houseTenSign: 'Libra',
      houseTenDegree: 12.1,
      lordTenPlanet: 'Venus',
      lordTenSign: 'Virgo',
      lordTenHouse: 9,
      lordTenIsRetrograde: false,
      lordTenIsCombust: false,
    },
    planetaryEvidence: [
      {
        planet: 'Sun',
        sign: 'Virgo',
        house: 9,
        isRetrograde: false,
        isCombust: false,
        dignity: 'NEUTRAL',
        aspectsGiven: ['Jupiter', 'Saturn'],
        conjunctions: ['Mercury'],
        bnnRuleMatches: ['Sun in 9th house indicates administrative or advisory leadership.'],
      },
      {
        planet: 'Saturn',
        sign: 'Aquarius',
        house: 2,
        isRetrograde: false,
        isCombust: false,
        dignity: 'OWN_SIGN',
        aspectsGiven: ['Mars'],
        conjunctions: [],
        bnnRuleMatches: ['Saturn in 2nd house gives steady wealth accumulation through discipline.'],
      }
    ],
    houseEvidence: [
      {
        houseNumber: 10,
        sign: 'Libra',
        signLord: 'Venus',
        occupants: ['Mercury'],
        aspectingPlanets: ['Jupiter'],
        strengthScore: 85,
        summary: '10th house is strong with Mercury occupant and Jupiter aspect.',
      }
    ],
    timingEvidence: {
      currentMahaDasha: 'Jupiter',
      currentAntarDasha: 'Saturn',
      status: 'ACTIVE_TRANSITION',
      summary: 'Dasha transition favours structured professional growth.',
    },
    bnnSynthesisRules: [
      { ruleId: 'BNN_CAR_01', title: 'Saturn-Jupiter Harmony', description: 'Karma lord Saturn supported by expansion planet Jupiter.' }
    ],
  };

  const provider = new OpenRouterCareerAnalysisProvider();
  
  try {
    const startTime = Date.now();
    const result = await provider.analyze(sampleInput);
    const duration = Date.now() - startTime;

    console.log('\n=== TEST SUCCESSFUL ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Executive Summary Length: ${result.executiveCareerSummary?.length || 0} chars`);
    console.log(`Sector Fit Count: ${result.sectorFit?.length || 0}`);
    console.log(`Action Plan Count: ${result.actionPlanSummary?.length || 0}`);
    console.log(`Planetary Interpretations Count: ${result.planetInterpretations?.length || 0}`);
    console.log(`House Interpretations Count: ${result.houseInterpretations?.length || 0}`);
  } catch (err: any) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

runDirectTest();
