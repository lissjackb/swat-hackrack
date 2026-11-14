// Planner data, ported from docs/mockup/hackro-mockup.html lines 154–279 and
// 397–402 (see docs/PLANNER_SPEC.md). Pure data + tiny helpers: no React, no
// Next, no Prisma, no window/localStorage — this module runs in Node AND the
// browser.
//
// MENU is the built-in Swarthmore Dining Center menu for Sat Nov 14 / Sun
// Nov 15 2026, used as the fallback whenever a DB slot is empty (the same way
// the mockup's bootstrapRealData keeps the built-in menu per slot). NUT holds
// Hackro per-serving estimates: the real dining feed has no nutrition.

export const MENU: Record<string, Record<string, string>> = {
  'sat-b': {
    'Field of Greens': "Greek Yogurt ::milk::, Cottage Cheese ::gluten free:: ::milk::, Vanilla Yogurt ::gluten free:: ::milk::, Assorted Fruits, Fruit Salad ::gluten free:: ::vegan::, Grapefruit, Sliced Melon ::vegan::, Hard Boiled Eggs ::egg:: ::gluten free:: ::vegetarian::",
    'Free Zone': "Homesfries FreeZone ::gluten free:: ::vegan::, Chicken Sausage ::gluten free::, Bacon ::gluten free:: ::pork::",
    'World of Flavor': "Phoenix Sandwich ::egg:: ::milk:: ::vegetarian:: ::wheat::, Scrambled Eggs ::egg:: ::gluten free:: ::vegetarian::, Eggs to Order ::egg:: ::gluten free::, Breakfast Bread ::egg:: ::milk:: ::soy:: ::vegetarian:: ::wheat::, Bacon ::gluten free:: ::pork::, Chicken Sausage ::gluten free::, Vegan Sausage ::soy:: ::vegan:: ::wheat::, Hashbrowns ::gluten free:: ::soy:: ::vegan::",
    'The Classics': "Oatmeal ::gluten free:: ::vegan::, Brown Sugar ::gluten free:: ::vegan::, Cinnamon Sugar ::gluten free:: ::vegan::, Craisins ::gluten free:: ::vegan::, Raisins ::gluten free:: ::vegan::, Toasted Almonds ::gluten free:: ::tree nut:: ::vegan::",
    'Daily Kneads': "Chocolate Espresso Banana Bread ::soy:: ::vegan:: ::wheat::, Assorted Donuts ::egg:: ::milk:: ::soy:: ::wheat::, Assorted Pastries ::egg:: ::milk:: ::wheat::"
  },
  'sat-l': {
    'Fired Up': "Chefs Choice, Oatmeal ::gluten free:: ::vegan::, Cheese Pizza ::milk:: ::vegetarian:: ::wheat::, Pepperoni Pizza ::milk:: ::pork:: ::wheat::",
    'Free Zone': "Chocolate Chip Waffles FZ, Berry Compote ::gluten free:: ::vegan::, Cheese Pizza FZ ::gluten free:: ::vegan::, Bacon ::gluten free:: ::pork::, Homesfries FreeZone ::gluten free:: ::vegan::, Pumpkin Spice Overnight Oats ::gluten free:: ::vegan::, Chicken Sausage ::gluten free::",
    'World of Flavor': "Phoenix Sandwich ::egg:: ::milk:: ::vegetarian:: ::wheat::, French Toast Sticks ::soy:: ::vegetarian:: ::wheat::, Scrambled Eggs ::egg:: ::gluten free:: ::vegetarian::, Eggs to Order ::egg:: ::gluten free::, Hamburger ::gluten free:: ::halal::, Chicken Sausage ::gluten free::, Vegan Sausage ::soy:: ::vegan:: ::wheat::, Bacon ::gluten free:: ::pork::, Hashbrowns ::gluten free:: ::soy:: ::vegan::, White Rice ::gluten free:: ::vegan::",
    'The Classics': "Chicken & Waffles, Chicken Tenders ::egg:: ::milk:: ::wheat::, Waffles ::egg:: ::milk:: ::wheat::, Hot Honey, Honey ::vegetarian::, Mixed Berries ::gluten free:: ::vegan::, Toasted Almonds ::gluten free:: ::tree nut:: ::vegan::, Whipped Cream ::gluten free:: ::milk::, Pimento Grits ::milk:: ::vegetarian::, Vanilla Chia Seed Pudding ::gluten free:: ::vegan::, Roasted Green Beans ::gluten free:: ::vegan::",
    "Grillin' Out": "Eggs to Order ::egg:: ::gluten free::, French Fries ::gluten free:: ::vegan::, Grilled Chicken Breast ::gluten free:: ::halal::, Cheeseburger ::halal:: ::milk:: ::sesame:: ::soy:: ::wheat::",
    'Verdant & Vegan': "Breakfast Totchos, Tater Tots ::gluten free:: ::soy:: ::vegetarian::, Tofu Scramble ::gluten free:: ::soy:: ::vegan::, Avocado ::gluten free:: ::vegan::, Black Beans ::gluten free:: ::vegan::, Jalapeno ::gluten free:: ::vegan::, Salsa ::gluten free:: ::vegan::, Vegan Cheese Sauce ::gluten free:: ::tree nut:: ::vegan::, White Rice ::gluten free:: ::vegan::"
  },
  'sat-d': {
    'Free Zone': "Cheese Pizza FZ ::gluten free:: ::vegan::, Lemon Herb Roast Chicken FZ ::halal::, Kidney Beans ::gluten free:: ::vegan::, Roasted Mini Potatoes ::gluten free:: ::vegan::, Roasted Green Beans ::gluten free:: ::vegan::",
    'World of Flavor': "Chinese, Bang Bang Chicken ::egg:: ::milk:: ::soy:: ::wheat::, Bang Bang shrimp ::egg:: ::sesame:: ::shellfish:: ::soy:: ::wheat::, White Rice ::gluten free:: ::vegan::, Cucumbers ::gluten free:: ::vegan::, Shredded Carrots ::gluten free:: ::vegan::, Steamed Edamame ::gluten free:: ::soy:: ::vegan::, Napa Cabbage Greens ::gluten free:: ::vegan::, Asian Sesame Dressing ::sesame:: ::soy:: ::wheat::",
    'The Classics': "Steak Night, Grilled Beef Chateau Steak ::gluten free:: ::halal::, Roasted Mini Potatoes ::gluten free:: ::vegan::, Chimichuri ::gluten free:: ::vegan::, Asparagus ::vegan::",
    'Daily Kneads': "Matcha Cheesecake ::egg:: ::milk:: ::soy:: ::wheat::, Vanilla Pudding ::gluten free:: ::milk:: ::soy::, M & M Blondies ::egg:: ::soy:: ::wheat::, Brownie Cookie Sandwich",
    'Fired Up': "Cheese Pizza ::milk:: ::vegetarian:: ::wheat::, Pepperoni Pizza ::milk:: ::pork:: ::wheat::",
    "Grillin' Out": "Eggs to Order ::egg:: ::gluten free::, French Fries ::gluten free:: ::vegan::, Grilled Chicken Breast ::gluten free:: ::halal::",
    'Field of Greens': "Romaine Lettuce ::vegan::"
  },
  'sun-br': {
    'Fired Up': "Chefs Choice, Oatmeal ::gluten free:: ::vegan::, Cheese Pizza ::milk:: ::vegetarian:: ::wheat::, Pepperoni Pizza ::milk:: ::pork:: ::wheat::",
    'Free Zone': "Vanilla Chia Seed Pudding ::gluten free:: ::vegan::, Blueberries ::gluten free:: ::vegan::, Granola FZ ::vegan::, Homesfries FreeZone ::gluten free:: ::vegan::, Bacon ::gluten free:: ::pork::, Turkey Bacon",
    'World of Flavor': "Spanish Brunch, Tortilla Espanola ::egg:: ::gluten free:: ::milk:: ::vegetarian::, Chocolate Chip Croissant Strata ::egg:: ::milk:: ::soy:: ::vegetarian:: ::wheat::, Roasted Tomatoes ::gluten free:: ::vegan::, White Rice ::gluten free:: ::vegan::, Bacon ::gluten free:: ::pork::, Sour Cream ::gluten free:: ::milk:: ::vegetarian::, Whipped Cream ::gluten free:: ::milk::",
    'The Classics': "Lemon Herb Roast Chicken ::kosher::, Crispy Potato Wedges ::gluten free:: ::vegan::, Roasted Asparagus ::gluten free:: ::vegan::",
    'Verdant & Vegan': "Middle Eastern Breakfast, Vegan Shakshuka ::gluten free:: ::vegan::, Vanilla Chia Seed Pudding ::gluten free:: ::vegan::, Pita Bread ::soy:: ::vegan:: ::wheat::, White Rice ::gluten free:: ::vegan::, Blueberries ::gluten free:: ::vegan::, Toasted Almonds ::gluten free:: ::tree nut:: ::vegan::, Toasted Coconut ::gluten free:: ::tree nut::, Roasted Eggplant ::gluten free:: ::vegan::, Vegan White Chocolate Scone ::soy:: ::wheat::",
    'Daily Kneads': "Cheddar & Chive Muffins ::egg:: ::milk:: ::soy:: ::vegetarian:: ::wheat::, Chocolate Chip Scones ::egg:: ::milk:: ::soy:: ::wheat::",
    'Field of Greens': "Romaine Lettuce ::vegan::"
  },
  'sun-d': {
    'Free Zone': "Chickpea Pasta w Marinara ::vegan::, Roasted Chicken Thighs ::gluten free:: ::halal::, Steamed Broccoli ::gluten free:: ::vegan::, Herb White Beans ::gluten free:: ::vegan::, Garden Salad ::gluten free:: ::vegan::, Pumpkin Muffins FZ",
    'World of Flavor': "Ravioli Night, Cheese Ravioli with Alfredo ::egg:: ::milk:: ::soy:: ::vegetarian:: ::wheat::, Cheese Ravioli w/ Marinara ::egg:: ::milk:: ::soy:: ::vegetarian:: ::wheat::, Garlic Roasted Chicken ::gluten free:: ::halal::, Italian Sausage, Red Chili Flakes, Garlic Roasted Broccoli ::gluten free:: ::vegan::, Garlic Bread ::milk:: ::soy:: ::vegetarian:: ::wheat::",
    'The Classics': "Grilled Pork Chops ::gluten free:: ::pork::, Wild Mushroom Ragout ::milk:: ::wheat::, Baked Potato ::gluten free:: ::vegan::, Applesauce ::gluten free:: ::vegan::, Biscuits ::egg:: ::milk:: ::soy:: ::vegetarian:: ::wheat::, Whipped Butter ::gluten free:: ::milk:: ::vegetarian::, Green Beans ::gluten free:: ::vegan::",
    'Daily Kneads': "Chocolate Chip Blondies ::egg:: ::milk:: ::soy:: ::wheat::, Mint Oreo Cheesecake ::egg:: ::milk:: ::soy:: ::wheat::, Vanilla Pudding ::gluten free:: ::milk:: ::soy::, Mango Lime Cupcakes ::egg:: ::milk:: ::soy:: ::wheat::",
    'Verdant & Vegan': "Cavatappi w/ Olive Oil ::soy:: ::vegan:: ::wheat::, Lentil Bolognese ::gluten free:: ::vegan::, Vegan Garlic Alfredo ::gluten free:: ::soy:: ::vegan::",
    'Spice of Life': "Beef Shawarma ::gluten free:: ::halal::, Tomato Cucumber Salad ::gluten free:: ::vegan::, White Sauce ::egg:: ::gluten free:: ::milk:: ::vegetarian::, Yellow Rice ::gluten free:: ::vegan::",
    'Fired Up': "Cheese Pizza ::milk:: ::vegetarian:: ::wheat::, Pepperoni Pizza ::milk:: ::pork:: ::wheat::",
    "Grillin' Out": "Eggs to Order ::egg:: ::gluten free::, French Fries ::gluten free:: ::vegan::, Grilled Chicken Breast ::gluten free:: ::halal::",
    'Field of Greens': "White Rice ::gluten free:: ::vegan::, Chefs Choice, Romaine Lettuce ::vegan::"
  },
  'sun-5': {
    'Field of Greens': "Greek Yogurt ::milk::, Granola ::vegan:: ::wheat::",
    'World of Flavor': "The 5th Meal Grill, Grilled Chicken Breast ::gluten free:: ::halal::, Potato Buns ::egg:: ::milk:: ::sesame:: ::soy:: ::vegetarian:: ::wheat::, Lettuce Leaf, Sliced Tomatoes ::vegan::, Sliced Red Onions ::gluten free:: ::vegan::, Crispy Naked Wings ::gluten free::, BBQ Sauce ::gluten free:: ::vegan::, Buffalo Sauce ::gluten free:: ::milk::, Thai Chili Sauce ::gluten free::, French Fries ::gluten free:: ::vegan::, Cheese Sauce ::gluten free:: ::milk:: ::vegetarian::, Sour Cream ::gluten free:: ::milk:: ::vegetarian::, Bacon Bits ::gluten free:: ::pork::, Chopped Scallion",
    'Daily Kneads': "Assorted Cookies ::egg:: ::milk:: ::soy:: ::tree nut:: ::wheat::, Chefs Choice",
    'Fired Up': "Cheese Pizza ::milk:: ::vegetarian:: ::wheat::, Pepperoni Pizza ::milk:: ::pork:: ::wheat::"
  }
};

export const THEMES = new Set(['Chefs Choice','Chinese','Steak Night','Chicken & Waffles','Breakfast Totchos','Spanish Brunch','Middle Eastern Breakfast','Ravioli Night','The 5th Meal Grill']);

/** [kcal, protein, carbs, fat, qty, unit, role, flags?]
 * role: P protein · X full dish · C carb · V vegetable · F fruit · D dairy/egg side · S sweet · K topping/condiment
 * flags: m = meat or poultry, f = seafood */
export type Nut = [number, number, number, number, number, string, string, string?];

export const NUT: Record<string, Nut> = {
  'Greek Yogurt':[150,20,8,4,1,'cup','D'],'Cottage Cheese':[110,12,5,5,0.5,'cup','D'],'Vanilla Yogurt':[150,6,25,3,6,'oz','S'],
  'Assorted Fruits':[90,1,23,0,1,'piece','F'],'Fruit Salad':[80,1,20,0,1,'cup','F'],'Grapefruit':[50,1,13,0,0.5,'grapefruit','F'],'Sliced Melon':[55,1,14,0,1,'cup','F'],
  'Hard Boiled Eggs':[140,12,1,10,2,'eggs','D'],'Homesfries FreeZone':[220,3,32,9,1,'cup','C'],'Chicken Sausage':[140,14,2,8,2,'links','P','m'],
  'Bacon':[130,9,0,10,3,'slices','K','m'],'Phoenix Sandwich':[380,18,32,20,1,'sandwich','X'],'Scrambled Eggs':[180,12,2,14,2,'eggs','P'],
  'Eggs to Order':[160,12,1,11,2,'eggs','P'],'Breakfast Bread':[220,4,32,9,1,'slice','C'],'Vegan Sausage':[150,12,8,8,2,'links','P'],
  'Hashbrowns':[200,2,24,11,2,'patties','C'],'Oatmeal':[160,6,28,3,1,'cup','C'],'Brown Sugar':[50,0,13,0,1,'tbsp','K'],'Cinnamon Sugar':[30,0,8,0,2,'tsp','K'],
  'Craisins':[60,0,16,0,2,'tbsp','K'],'Raisins':[60,1,16,0,2,'tbsp','K'],'Toasted Almonds':[100,4,3,9,2,'tbsp','K'],
  'Chocolate Espresso Banana Bread':[260,4,40,10,1,'slice','S'],'Assorted Donuts':[270,3,32,15,1,'donut','S'],'Assorted Pastries':[300,5,34,16,1,'pastry','S'],
  'Cheese Pizza':[285,12,36,10,1,'slice','X'],'Pepperoni Pizza':[315,13,35,13,1,'slice','X','m'],'Chocolate Chip Waffles FZ':[260,4,40,9,1,'waffle','S'],
  'Berry Compote':[60,0,15,0,0.25,'cup','K'],'Cheese Pizza FZ':[270,6,38,10,1,'slice','X'],'Pumpkin Spice Overnight Oats':[280,7,46,7,1,'cup','C'],
  'French Toast Sticks':[320,6,44,13,4,'sticks','C'],'Hamburger':[280,22,0,21,4,'oz','P','m'],'White Rice':[205,4,45,0,1,'cup','C'],
  'Chicken Tenders':[330,22,18,19,3,'tenders','P','m'],'Waffles':[220,6,25,11,1,'waffle','C'],'Hot Honey':[60,0,17,0,1,'tbsp','K'],'Honey':[60,0,17,0,1,'tbsp','K'],
  'Mixed Berries':[70,1,17,0,1,'cup','F'],'Whipped Cream':[30,0,2,3,2,'tbsp','K'],'Pimento Grits':[240,7,30,10,1,'cup','C'],
  'Vanilla Chia Seed Pudding':[180,5,20,9,0.5,'cup','S'],'Roasted Green Beans':[70,2,8,4,1,'cup','V'],'French Fries':[320,4,42,15,1,'serving','C'],
  'Grilled Chicken Breast':[230,43,0,5,5,'oz','P','m'],'Cheeseburger':[540,30,36,30,1,'burger','X','m'],'Tater Tots':[260,3,30,14,10,'tots','C'],
  'Tofu Scramble':[200,18,6,12,1,'cup','P'],'Avocado':[60,1,3,5,0.25,'avocado','K'],'Black Beans':[115,8,20,0,0.5,'cup','C'],'Jalapeno':[5,0,1,0,1,'tbsp','K'],
  'Salsa':[10,0,2,0,2,'tbsp','K'],'Vegan Cheese Sauce':[90,2,6,7,0.25,'cup','K'],'Lemon Herb Roast Chicken FZ':[280,38,1,13,5,'oz','P','m'],
  'Kidney Beans':[110,8,20,0,0.5,'cup','C'],'Roasted Mini Potatoes':[180,3,30,6,1,'cup','C'],'Bang Bang Chicken':[420,26,28,22,1,'cup','P','m'],
  'Bang Bang shrimp':[380,20,28,20,1,'cup','P','f'],'Cucumbers':[15,1,3,0,0.5,'cup','V'],'Shredded Carrots':[25,1,6,0,0.5,'cup','V'],
  'Steamed Edamame':[95,9,7,4,0.5,'cup','D'],'Napa Cabbage Greens':[15,1,3,0,1,'cup','V'],'Asian Sesame Dressing':[120,0,6,10,2,'tbsp','K'],
  'Grilled Beef Chateau Steak':[400,46,0,23,6,'oz','P','m'],'Chimichuri':[70,0,1,7,1,'tbsp','K'],'Asparagus':[40,4,7,0,6,'spears','V'],
  'Matcha Cheesecake':[380,6,34,25,1,'slice','S'],'Vanilla Pudding':[150,3,25,4,0.5,'cup','S'],'M & M Blondies':[250,3,34,12,1,'bar','S'],
  'Brownie Cookie Sandwich':[320,4,44,15,1,'sandwich','S'],'Romaine Lettuce':[15,1,3,0,2,'cups','V'],'Blueberries':[85,1,21,0,1,'cup','F'],
  'Granola FZ':[220,5,32,8,0.5,'cup','C'],'Turkey Bacon':[105,9,1,7,3,'slices','P','m'],'Tortilla Espanola':[240,10,18,14,1,'slice','X'],
  'Chocolate Chip Croissant Strata':[420,10,46,22,1,'square','S'],'Roasted Tomatoes':[40,1,6,2,0.5,'cup','V'],'Sour Cream':[60,1,1,6,2,'tbsp','K'],
  'Lemon Herb Roast Chicken':[280,38,1,13,5,'oz','P','m'],'Crispy Potato Wedges':[240,4,32,11,1,'cup','C'],'Roasted Asparagus':[50,4,7,2,6,'spears','V'],
  'Vegan Shakshuka':[200,8,24,8,1,'cup','X'],'Pita Bread':[165,5,33,1,1,'pita','C'],'Toasted Coconut':[70,1,3,6,2,'tbsp','K'],
  'Roasted Eggplant':[90,1,10,5,1,'cup','V'],'Vegan White Chocolate Scone':[380,5,52,17,1,'scone','S'],'Cheddar & Chive Muffins':[280,8,30,14,1,'muffin','C'],
  'Chocolate Chip Scones':[420,6,56,19,1,'scone','S'],'Chickpea Pasta w Marinara':[380,20,56,8,1.5,'cups','X'],'Roasted Chicken Thighs':[300,32,0,19,5,'oz','P','m'],
  'Steamed Broccoli':[55,4,11,0,1,'cup','V'],'Herb White Beans':[130,8,22,1,0.5,'cup','C'],'Garden Salad':[30,2,6,0,1.5,'cups','V'],
  'Pumpkin Muffins FZ':[260,3,40,10,1,'muffin','S'],'Cheese Ravioli with Alfredo':[480,18,40,28,1,'cup','X'],'Cheese Ravioli w/ Marinara':[340,15,44,11,1,'cup','X'],
  'Garlic Roasted Chicken':[260,40,2,10,5,'oz','P','m'],'Italian Sausage':[280,14,3,24,1,'link','P','m'],'Red Chili Flakes':[0,0,0,0,1,'pinch','K'],
  'Garlic Roasted Broccoli':[90,4,11,4,1,'cup','V'],'Garlic Bread':[170,4,20,8,1,'slice','C'],'Grilled Pork Chops':[330,42,0,17,6,'oz','P','m'],
  'Wild Mushroom Ragout':[120,3,10,8,0.5,'cup','K'],'Baked Potato':[160,4,37,0,1,'potato','C'],'Applesauce':[50,0,13,0,0.5,'cup','F'],
  'Biscuits':[210,4,26,10,1,'biscuit','C'],'Whipped Butter':[70,0,0,8,1,'tbsp','K'],'Green Beans':[45,2,9,0,1,'cup','V'],
  'Chocolate Chip Blondies':[250,3,34,12,1,'bar','S'],'Mint Oreo Cheesecake':[400,6,40,24,1,'slice','S'],'Mango Lime Cupcakes':[300,3,44,13,1,'cupcake','S'],
  'Cavatappi w/ Olive Oil':[360,11,62,8,1.5,'cups','C'],'Lentil Bolognese':[230,15,34,3,1,'cup','P'],'Vegan Garlic Alfredo':[120,3,8,9,0.25,'cup','K'],
  'Beef Shawarma':[330,34,4,20,5,'oz','P','m'],'Tomato Cucumber Salad':[45,1,9,1,1,'cup','V'],'White Sauce':[80,0,1,8,2,'tbsp','K'],
  'Yellow Rice':[220,4,46,2,1,'cup','C'],'Granola':[220,5,32,8,0.5,'cup','C'],'Potato Buns':[140,4,26,2,1,'bun','C'],'Lettuce Leaf':[5,0,1,0,1,'leaf','K'],
  'Sliced Tomatoes':[10,0,2,0,2,'slices','K'],'Sliced Red Onions':[10,0,2,0,2,'tbsp','K'],'Crispy Naked Wings':[430,38,0,30,6,'wings','P','m'],
  'BBQ Sauce':[60,0,14,0,2,'tbsp','K'],'Buffalo Sauce':[20,0,1,2,2,'tbsp','K'],'Thai Chili Sauce':[80,0,20,0,2,'tbsp','K'],'Cheese Sauce':[90,3,4,7,0.25,'cup','K'],
  'Bacon Bits':[50,4,0,4,1,'tbsp','K','m'],'Chopped Scallion':[2,0,0,0,1,'tbsp','K'],'Assorted Cookies':[200,2,28,9,1,'cookie','S']
};

export interface MealSlot {
  id: string;
  day: string;
  name: string;
  time: string;
  start: number;
  end: number;
  hours: string;
  share: number;
  kind: 'breakfast' | 'meal' | 'snack';
  from?: string;
  stations?: string[];
  /** Profile toggle gating this optional slot ('snack' | 'fifth'). */
  opt?: 'snack' | 'fifth';
}

// MEALS is hard-coded to Sat Nov 14 / Sun Nov 15 (PLANNER_SPEC: generalizing
// it is a "Next steps" item, not tonight).
export const MEALS: MealSlot[] = [
  {id:'sat-b', day:'sat', name:'Breakfast', time:'7:00', start:420, end:660, hours:'7–11 AM', share:.26, kind:'breakfast'},
  {id:'sat-l', day:'sat', name:'Lunch', time:'11:00', start:660, end:840, hours:'11 AM–2 PM', share:.32, kind:'meal'},
  {id:'sat-s', day:'sat', name:'Snack', time:'15:30', start:930, end:960, hours:'Take it to go at breakfast', share:.10, kind:'snack', from:'sat-b', stations:['Field of Greens'], opt:'snack'},
  {id:'sat-d', day:'sat', name:'Dinner', time:'18:00', start:960, end:1200, hours:'4–8 PM', share:.32, kind:'meal'},
  {id:'sun-br', day:'sun', name:'Brunch', time:'10:00', start:600, end:840, hours:'10 AM–2 PM', share:.40, kind:'breakfast'},
  {id:'sun-d', day:'sun', name:'Dinner', time:'17:30', start:960, end:1200, hours:'4–8 PM', share:.40, kind:'meal'},
  {id:'sun-5', day:'sun', name:'5th Meal', time:'20:00', start:1200, end:1260, hours:'8–9 PM', share:.20, kind:'meal', opt:'fifth'}
];

export const DAYS: Record<string, {label: string; short: string}> = {
  sat: {label:'Sat, Nov 14', short:'Sat'},
  sun: {label:'Sun, Nov 15', short:'Sun'},
};

/** The demo clock (mockup line 266). Overridable per-plan via PlanContext.now. */
export const NOW = {day:'sat', mins:9*60+40, label:'9:40 AM'};

export const VENUES = [
  {name:'Science Center Coffee Bar', icon:'i-coffee', status:'Open until midnight', open:true, d:'Coffee, sandwiches, salads, soup, sushi · late-night swipe 7–11 PM weekends'},
  {name:"Essie's Corner", icon:'i-store', status:'Closed weekends · Mon 8:30 AM', open:false, d:'Made-to-order sandwiches and grain bowls'},
  {name:'Kohlberg Coffee Bar', icon:'i-coffee', status:'Closed weekends · Mon 8 AM', open:false, d:'Coffee, pastries, soups, sandwiches'},
  {name:'The Crumb Café', icon:'i-store', status:'Hours not posted', open:false, d:'Student-run late night'}
];

/** Goal keys match the backend Goal type: "build" | "cut" | "maintain" | "perform". */
export const GOALS: Record<string, {label: string; d: string; adj: number; pk: number}> = {
  build:{label:'Build', d:'Add muscle while keeping fat gain slow', adj:350, pk:2.0},
  cut:{label:'Cut', d:'Lose fat, keep the muscle you have', adj:-450, pk:2.2},
  maintain:{label:'Maintain', d:'Hold your weight and eat well', adj:0, pk:1.6},
  perform:{label:'Perform', d:'Fuel training, games and recovery', adj:150, pk:1.8}
};

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const mealById = (id: string) => MEALS.find(m => m.id === id);
