# Final Bug Triage & Resolution Log

*Document Version*: 1.0.0  
*Release Target*: v1.0.0  
*Date*: 2026-09-02  

---

## 1. Bug Classification Summary

| Priority Level | Description | Count (Open) | Count (Resolved) | Status |
| :--- | :--- | :---: | :---: | :---: |
| **P0 - LAUNCH BLOCKER** | Severe security vulnerability, payment corruption, database data loss, or total app crash. | **0** | 4 | ALL RESOLVED |
| **P1 - MAJOR BROKEN FUNCTIONALITY** | Primary feature broken, broken report worker compilation, or failed authentication refresh. | **0** | 7 | ALL RESOLVED |
| **P2 - IMPORTANT REGRESSION** | Usability issue or non-blocking pipeline fallback. | **0** | 5 | ALL RESOLVED |
| **P3 - MINOR / COSMETIC** | Non-blocking UI alignment or optional feature text polish. | **2** (Documented) | 12 | RESOLVED / DOCUMENTED |

---

## 2. Resolved Critical Issues (P0 & P1)

1. **[P0 - RESOLVED] Missing Dynamic Dasha Calculations in Report Generator**:
   - *Fix*: Integrated `DashaCalculator` directly into `career-report.mapper.ts`. Active Mahadasha/Antardasha cycles and 3-tier timing outlooks are calculated dynamically from sidereal Moon position.
2. **[P0 - RESOLVED] Unvalidated PDF Generation & Placeholder Risk**:
   - *Fix*: Implemented `PdfQaValidator` in `packages/report-engine/src/validation/pdf-qa.validator.ts`. The compilation pipeline now automatically validates PDF buffer headers, page depth ($\ge 5$ pages), and scans for forbidden placeholders (`"Valued Client"`, `"Not supplied"`, `"Planet"`, `"TODO"`).
3. **[P1 - RESOLVED] Token Refresh Loop Risk in Mobile Auth Interceptor**:
   - *Fix*: Single-flight refresh state lock prevents duplicate token refresh requests. Revoked or expired refresh tokens clear local credentials and safely navigate the user to `LoginScreen`.
4. **[P1 - RESOLVED] Admin Test Notification Parameter Object Mismatch**:
   - *Fix*: Updated `adminService.logAction` invocation in `admin.routes.ts` to pass a structured parameter object containing `adminId`, `adminEmail`, `action`, `resource`, `details`, `ipAddress`, and `userAgent`.
5. **[P1 - RESOLVED] XeLaTeX Font and Binary Dependencies in Worker Image**:
   - *Fix*: Updated `apps/api/Dockerfile` to install `texlive-xetex`, `texlive-latex-extra`, `font-open-sans`, and `font-tex-gyre` directly into the container runner stage.

---

## 3. Documented Minor Items (P3)

1. **[P3 - DOCUMENTED] Voice Input Button Disabled**:
   - Voice input button in Jyoti Chat Screen displays a floating notification banner indicating that voice input is currently disabled. Chat input remains fully operational via text keyboard.
2. **[P3 - DOCUMENTED] Local Storage Migration on First Account Login**:
   - When a guest user transitions to an authenticated account for the first time, local guest birth profile data is safely preserved under key `guest_birth_profile` for reference without overwriting backend account state.
