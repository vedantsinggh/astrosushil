import { VASTU_CATEGORIES, VASTU_GUIDANCE_DATA, VastuCategory, VastuGuidanceItem } from './vastu.content';
import { VastuGuidanceQuery } from './vastu.schemas';

export interface VastuCategoriesResponseDto {
  data: VastuCategory[];
}

export interface VastuGuidanceResponseDto {
  data: VastuGuidanceItem[];
}

export class VastuService {
  /**
   * Returns all Vastu categories for room and space planning.
   */
  public async getCategories(): Promise<VastuCategoriesResponseDto> {
    return {
      data: VASTU_CATEGORIES,
    };
  }

  /**
   * Returns Vastu guidance items filtered by category or categoryId.
   */
  public async getGuidance(query?: VastuGuidanceQuery): Promise<VastuGuidanceResponseDto> {
    if (query?.categoryId) {
      const item = VASTU_GUIDANCE_DATA[query.categoryId];
      return {
        data: item ? [item] : [],
      };
    }

    if (query?.category) {
      const target = query.category.trim().toLowerCase();
      const matched = Object.values(VASTU_GUIDANCE_DATA).filter(
        (g) =>
          g.categorySlug.toLowerCase() === target ||
          g.categoryName.toLowerCase().includes(target)
      );
      return {
        data: matched,
      };
    }

    // Return all guidance items if no filter is specified
    return {
      data: Object.values(VASTU_GUIDANCE_DATA),
    };
  }
}

export const vastuService = new VastuService();
