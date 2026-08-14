import { SHARED_PACKAGE_NAME } from "@astro/shared";

export function reportEnginePlaceholder(): string {
  return `report-engine initialized (using ${SHARED_PACKAGE_NAME})`;
}
