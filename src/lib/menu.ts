// Shared mapping from a stored MenuItem row to the MenuItemDTO the UI/solver
// consume. One place to decode the JSON-string columns (dietary/allergens) and
// cast the meal — so a schema change touches a single site, not every route.
import type { Meal, MenuItemDTO } from "./types";

/** The MenuItem row fields the DTO needs (structural — matches Prisma's row). */
interface MenuItemRow {
  id: string;
  date: string;
  meal: string;
  station: string | null;
  name: string;
  servingSize: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary: string; // JSON string[]
  allergens: string; // JSON string[]
}

export function menuItemToDTO(r: MenuItemRow): MenuItemDTO {
  return {
    id: r.id,
    date: r.date,
    meal: r.meal as Meal,
    station: r.station,
    name: r.name,
    servingSize: r.servingSize,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    dietary: JSON.parse(r.dietary) as string[],
    allergens: JSON.parse(r.allergens) as string[],
  };
}
