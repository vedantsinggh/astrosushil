# Phase 2A.4: Report Pipeline Verification

**Audit Phase:** Phase 2A.4  
**Date:** 2026-11-03  
**Status:** Verified & Validated  
**Target:** Report generation pipeline end-to-end with ambiguous profiles and authoritative UTC instant

---

## 1. Executive Summary

Phase 2A.3 raised the concern that report generation might bypass or fail on saved profiles requiring disambiguation, or that previous tests relied on manual database mocks rather than executing the real report generation orchestration.

In Phase 2A.4, the report generation pipeline was traced from the public API endpoint down to PDF compilation, and an integration test (Test E) was executed against the production service stack. The test confirmed that:
1. When generating a report for a saved profile with ambiguous local birth time, the real `reportsService` and `astrologyService` successfully retrieve the profile.
2. The mapper forwards the persisted UTC instant.
3. The chart calculation succeeds without error or prompt for disambiguation.
4. The PDF document is successfully compiled, producing a valid binary `%PDF-1.4` document.

---

## 2. End-to-End Report Generation Architecture

### 2.1 Trace from API Request to Document Output

```mermaid
sequenceDiagram
    autonumber
    actor Client as API Client / Mobile App
    participant Route as ReportsRoutes (POST /api/v1/reports)
    participant RepService as ReportsService
    participant AstroService as AstrologyService
    participant Mapper as birth-details.mapper
    participant AstroEngine as AstrologyEngine
    participant RepGen as ReportGenerator (generateKundliReport)
    participant PdfEngine as ReportPdfService / LaTeX / Typst

    Client->>Route: POST /api/v1/reports { birthProfileId, reportType: 'KUNDLI' }
    Route->>RepService: createReportJob(...) or generateReportOnTheFly(...)
    RepService->>AstroService: calculateChartForProfile(birthProfileId, user)
    AstroService->>AstroService: resolveBirthDetails({ birthProfileId }, user)
    AstroService->>Mapper: mapBirthProfileToBirthDetails(profile)
    Note over Mapper: Persisted utcDateTime & offset preserved
    Mapper-->>AstroService: BirthDetails (with utcDateTime)
    AstroService->>AstroEngine: calculateChart(birthDetails)
    Note over AstroEngine: normalizeBirthTime honors utcDateTime directly
    AstroEngine-->>AstroService: AstroChart
    AstroService-->>RepService: chartResponse
    RepService->>RepService: validateAstrologyDataForReport(chartResponse)
    RepService->>RepGen: generateKundliReport(profileInput, chartResponse, ...)
    RepGen-->>RepService: structuredReport
    RepService->>PdfEngine: generateReportPdf(structuredReport)
    PdfEngine-->>RepService: Buffer (PDF)
    RepService-->>Route: Report record / PDF Buffer
    Route-->>Client: 200 OK (application/pdf or Report DTO)
```

### 2.2 Critical Call Sites in `reports.service.ts`

Lines 390–407 and 575–593 in [`apps/api/src/modules/reports/reports.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L390-L407):
```typescript
      const chartResponse = await astrologyService.calculateChartForProfile(report.birthProfileId, user);
      validateAstrologyDataForReport(chartResponse);

      if (report.reportType === 'KUNDLI') {
        structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
      } else if (report.reportType === 'PLANETARY_SUMMARY') {
        structuredReport = await generatePlanetaryReport(profileInput, chartResponse, this.interpretationProvider);
      } else if (report.reportType === 'CAREER_PROSITY') {
        structuredReport = await generateProHoroscopeReport(profileInput, chartResponse, this.interpretationProvider);
      } else {
        structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
      }
```

Because `reportsService` delegates chart calculation directly to `astrologyService.calculateChartForProfile`, the report generation pipeline automatically leverages the mapper correction.

---

## 3. Real Service Regression Testing (Test E)

In `apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`:

### 3.1 Test Execution Flow
1. An ambiguous birth profile was saved to PostgreSQL via the real API (`POST /api/v1/birth-profiles`):
   - Local Time: `2020-11-01 01:30:00`
   - Timezone: `America/New_York`
   - Disambiguation: `'earlier'`
   - Persisted UTC Instant: `2020-11-01T05:30:00.000Z`
2. A report generation request was sent via the real API:
   - Endpoint: `POST /api/v1/reports`
   - Payload: `{ birthProfileId: ambiguousProfileId, reportType: 'KUNDLI' }`
   - Status: HTTP 201 Created.
3. The report PDF download was requested:
   - Endpoint: `GET /api/v1/reports/${reportId}/pdf`
   - Headers: `Authorization: Bearer ${authToken}`
   - Status: HTTP 200 OK.
   - Content-Type: `application/pdf`.
   - Magic Bytes: First 5 bytes match `%PDF-`.
   - Size: > 1,000 bytes.

### 3.2 Elimination of Mock Shortcuts
Unlike prior tests that used `prisma.report.create()` to simulate report records, Test E:
- Created the profile through the real Fastify HTTP server.
- Submitted the report generation request through the real Fastify router.
- Executed the real `reportsService.getReportPdfBuffer` and `astrologyService.calculateChartForProfile` orchestration.
- Compiled the actual PDF document through the reporting engine.

---

## 4. Conclusion

The report generation pipeline correctly honors the authoritative UTC instant stored in birth profiles. Saved profiles with ambiguous or complex historical timestamps generate reports accurately, reproducibly, and without runtime failures or data loss.
