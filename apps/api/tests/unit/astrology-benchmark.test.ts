import { describe, it, expect } from 'vitest';
import { ChartCalculator, BirthDetails, AstrologyConfig } from '@astro/astrology-engine';

export interface BenchmarkMetrics {
  iterations: number;
  totalDurationMs: number;
  avgDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
}

export async function runAstrologyEngineBenchmark(iterations: number = 200): Promise<BenchmarkMetrics> {
  const calculator = new ChartCalculator();
  const birthDetails: BirthDetails = {
    date: { year: 1990, month: 5, day: 15 },
    time: { hour: 14, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.2090,
    placeName: 'New Delhi, India',
  };
  const config: AstrologyConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
    planetaryCalculationMode: 'GEOCENTRIC',
  };

  // Warmup run
  await calculator.calculateChart(birthDetails, config);

  const durations: number[] = [];
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await calculator.calculateChart(birthDetails, config);
    const t1 = performance.now();
    durations.push(t1 - t0);
  }

  const endTotal = performance.now();
  const totalDurationMs = endTotal - startTotal;

  durations.sort((a, b) => a - b);

  const avgDurationMs = durations.reduce((sum, d) => sum + d, 0) / iterations;
  const medianDurationMs = durations[Math.floor(iterations * 0.5)];
  const p95DurationMs = durations[Math.floor(iterations * 0.95)];
  const p99DurationMs = durations[Math.floor(iterations * 0.99)];
  const minDurationMs = durations[0];
  const maxDurationMs = durations[iterations - 1];

  return {
    iterations,
    totalDurationMs: Number(totalDurationMs.toFixed(2)),
    avgDurationMs: Number(avgDurationMs.toFixed(3)),
    medianDurationMs: Number(medianDurationMs.toFixed(3)),
    p95DurationMs: Number(p95DurationMs.toFixed(3)),
    p99DurationMs: Number(p99DurationMs.toFixed(3)),
    minDurationMs: Number(minDurationMs.toFixed(3)),
    maxDurationMs: Number(maxDurationMs.toFixed(3)),
  };
}

describe('Astrology Engine Calculation Benchmark (Single Core Performance)', () => {
  it('should execute 200 chart calculations and collect latency metrics', async () => {
    const metrics = await runAstrologyEngineBenchmark(200);

    expect(metrics.iterations).toBe(200);
    expect(metrics.avgDurationMs).toBeLessThan(10); // Calculation must be under 10ms
    expect(metrics.medianDurationMs).toBeLessThan(10);
  });
});
