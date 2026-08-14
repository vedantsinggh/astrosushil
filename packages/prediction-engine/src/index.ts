import { SHARED_PACKAGE_NAME } from "@astro/shared";

export function predictionEnginePlaceholder(): string {
  return `prediction-engine initialized (using ${SHARED_PACKAGE_NAME})`;
}
