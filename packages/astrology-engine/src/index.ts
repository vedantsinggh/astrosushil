import { SHARED_PACKAGE_NAME } from "@astro/shared";

export function astrologyEnginePlaceholder(): string {
  return `astrology-engine initialized (using ${SHARED_PACKAGE_NAME})`;
}
