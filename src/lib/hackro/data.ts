// UI data from the mockup (lines 317–330) that isn't part of the planner:
// devices, permissions, streak rewards, quick-add foods.
export const DEVICES = [
  { id: "whoop", name: "Whoop", icon: "i-band", d: "Strain and recovery" },
];

export const PERMS: [string, string, string, string][] = [
  ["recovery", "i-bolt", "Strain and recovery", "Builds your Fuel Score, adds calories on hard days"],
];

export const REWARDS: [number, string, string, string][] = [
  [1, "First Fuel", "Badge for your first on-target day", "i-flame"],
  [3, "Streak freeze", "Miss one day without losing your streak", "i-shield"],
  [7, "Garnet rings", "A garnet theme for your Today rings", "i-target"],
  [30, "Fuel Legend", "Top-tier badge on your profile", "i-bolt"],
];

export const QUICK: [string, number, number, number, number][] = [
  ["Banana", 105, 1, 27, 0],
  ["Protein bar", 210, 20, 23, 7],
  ["Protein shake, 1 scoop", 120, 24, 3, 1],
  ["Iced latte, 16 oz", 190, 12, 18, 7],
  ["Fruit smoothie, 16 oz", 300, 8, 58, 4],
  ["Trail mix, ¼ cup", 175, 5, 16, 11],
  ["Chips, 1 oz bag", 150, 2, 15, 10],
  ["Peanut butter toast", 280, 10, 30, 14],
  ["Pizza slice, off campus", 300, 12, 36, 11],
];
