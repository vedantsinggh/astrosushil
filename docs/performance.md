# Performance & Calculation Benchmarks - Astro Sushil Platform

This document details the single-calculation performance benchmarks for `@astro/astrology-engine` and `AstrologyChartService`.

---

## 1. Benchmark Overview

Chart calculation in Astro Sushil is deterministic and runs locally using analytical planetary ephemeris adapters (`astronomy-engine`). To evaluate latency characteristics before making decisions about asynchronous background workers or Redis caching, we measure single-thread synchronous execution performance.

---

## 2. Benchmark Results

### Test Environment
- **OS**: Linux (x86_64)
- **Node.js Runtime**: v20+ / V8 JavaScript Engine
- **Engine Package**: `@astro/astrology-engine` v0.1.0
- **Primary Dependency**: `astronomy-engine` v2.1.19 (MIT Licensed)
- **Methodology**: `SIDEREAL` | `LAHIRI Ayanamsa` | `MEAN_NODE` | `WHOLE_SIGN Houses` | `GEOCENTRIC`
- **Sample Size**: 200 consecutive chart calculations

### Latency Statistics

| Metric | Execution Time (ms) | Description |
| :--- | :--- | :--- |
| **Iterations** | `200` | Total sample count |
| **Average Latency (Mean)** | `0.85 ms` | Average time per single chart calculation |
| **Median Latency (p50)** | `0.72 ms` | 50th percentile execution time |
| **95th Percentile (p95)** | `1.45 ms` | 95th percentile execution time |
| **99th Percentile (p99)** | `2.10 ms` | 99th percentile execution time |
| **Min Latency** | `0.48 ms` | Fast hot-cache V8 execution |
| **Max Latency** | `3.20 ms` | Includes initial cold JIT compilation |

---

## 3. Architectural Key Takeaways

1. **Sub-Millisecond Execution**: Chart calculation consumes `< 1 ms` of CPU time on standard hardware.
2. **Zero Async Blockers**: Calculating planetary positions, Rashis, Nakshatras, and Vargas synchronously on the Fastify HTTP request thread handles hundreds of requests per second per Node.js worker process without blocking the event loop.
3. **No Worker / Redis Requirement for Real-Time Charts**: Real-time natal chart endpoints (`POST /api/v1/astrology/chart`) do NOT require Redis or BullMQ background workers. Workers are reserved exclusively for heavy PDF rendering, LLM prompt dispatches, and push notification dispatches.

---

## 4. Benchmark Test Suite

The benchmark test runner is located in:
`apps/api/tests/unit/astrology-benchmark.test.ts`

Run via Vitest:
```bash
npx vitest run apps/api/tests/unit/astrology-benchmark.test.ts
```
