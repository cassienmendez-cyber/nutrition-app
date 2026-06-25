// Grocery Intelligence + Smart Meal Suggestions.
//
// "I have $120" → a week of breakfasts, lunches, dinners, snacks, desserts that
// hit protein goals, plus a shopping list. And "what sounds good?" → options.
// Fertility-friendly: protein, leafy greens, folate, whole foods.

export type Craving =
  | 'chicken'
  | 'pasta'
  | 'soup'
  | 'mexican'
  | 'breakfast'
  | 'comfort'
  | 'high-protein'
  | 'cheap'

export interface MealIdea {
  name: string
  why: string
  protein: boolean
}

const SUGGESTIONS: Record<Craving, MealIdea[]> = {
  chicken: [
    { name: 'Sheet-pan chicken, broccoli & potatoes', why: 'One pan, leftovers for lunch, lean protein.', protein: true },
    { name: 'Chicken & spinach quesadilla', why: 'Sneaks in folate-rich greens.', protein: true },
    { name: 'Lemon chicken soup with rice', why: 'Comforting and hydrating.', protein: true },
  ],
  pasta: [
    { name: 'Pasta with turkey meat sauce + hidden veg', why: 'Protein + veg in a familiar comfort food.', protein: true },
    { name: 'Chickpea pasta with pesto & peas', why: 'Plant protein, ready in 12 minutes.', protein: true },
    { name: 'Cottage-cheese baked ziti', why: 'High protein, freezer-friendly.', protein: true },
  ],
  soup: [
    { name: 'White bean & kale soup', why: 'Iron, folate, fiber — gentle on the stomach.', protein: true },
    { name: 'Lentil curry soup', why: 'Cheap, batch-cooks, loads of protein.', protein: true },
    { name: 'Chicken tortilla soup', why: 'Cozy and high protein.', protein: true },
  ],
  mexican: [
    { name: 'Black bean & egg breakfast tacos', why: 'Protein-packed start to the day.', protein: true },
    { name: 'Burrito bowls (rice, beans, chicken, avocado)', why: 'Customizable, great leftovers.', protein: true },
    { name: 'Sheet-pan fajitas', why: 'Lots of peppers — vitamin C and color.', protein: true },
  ],
  breakfast: [
    { name: 'Greek yogurt parfait with berries', why: '90 seconds, 15g+ protein.', protein: true },
    { name: 'Egg & cheese on whole-grain toast', why: 'Under 3 minutes, steadies your morning.', protein: true },
    { name: 'Overnight oats with peanut butter', why: 'Make ahead the night before.', protein: true },
  ],
  comfort: [
    { name: 'Loaded baked potato with chili', why: 'Comfort food that still brings protein.', protein: true },
    { name: 'Mac & cheese with peas + rotisserie chicken', why: 'Cozy, and you sneak in protein & veg.', protein: true },
    { name: 'Grilled cheese with tomato soup', why: 'Pair with a side of edamame for protein.', protein: false },
  ],
  'high-protein': [
    { name: 'Salmon, quinoa & asparagus', why: 'Omega-3s — great for fertility.', protein: true },
    { name: 'Cottage cheese bowl with seeds & fruit', why: '25g+ protein, no cooking.', protein: true },
    { name: 'Turkey & hummus wrap', why: 'Portable, ~30g protein.', protein: true },
  ],
  cheap: [
    { name: 'Eggs & black beans on rice', why: 'Pennies per serving, big protein.', protein: true },
    { name: 'Peanut-butter banana oats', why: 'Pantry staples, filling.', protein: true },
    { name: 'Lentil & veggie stir-fry', why: 'Stretches a dollar a long way.', protein: true },
  ],
}

export const CRAVING_OPTIONS: { value: Craving; label: string; emoji: string }[] = [
  { value: 'chicken', label: 'Chicken', emoji: '🍗' },
  { value: 'pasta', label: 'Pasta', emoji: '🍝' },
  { value: 'soup', label: 'Soup', emoji: '🍲' },
  { value: 'mexican', label: 'Mexican', emoji: '🌮' },
  { value: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { value: 'comfort', label: 'Comfort food', emoji: '🧀' },
  { value: 'high-protein', label: 'High protein', emoji: '💪' },
  { value: 'cheap', label: 'Cheap', emoji: '💸' },
]

export function suggestMeals(craving: Craving): MealIdea[] {
  return SUGGESTIONS[craving]
}

// --- Budget meal plan ------------------------------------------------------

export interface PlanItem {
  item: string
  cost: number
}

export interface GroceryPlan {
  budget: number
  total: number
  underBudget: boolean
  meals: { slot: string; idea: string }[]
  shoppingList: PlanItem[]
  proteinNote: string
}

// A simple, transparent "smart" planner: builds a week of protein-forward meals
// and a shopping list, scaling staples so the total fits the budget.
const BASE_LIST: PlanItem[] = [
  { item: 'Eggs (18 ct)', cost: 5 },
  { item: 'Greek yogurt (large tub)', cost: 5 },
  { item: 'Chicken thighs (family pack)', cost: 9 },
  { item: 'Canned beans & lentils (6)', cost: 6 },
  { item: 'Oats (large)', cost: 4 },
  { item: 'Frozen mixed vegetables (3 bags)', cost: 6 },
  { item: 'Spinach / leafy greens', cost: 4 },
  { item: 'Bananas & apples', cost: 5 },
  { item: 'Berries (frozen)', cost: 4 },
  { item: 'Whole-grain bread', cost: 4 },
  { item: 'Brown rice (large)', cost: 4 },
  { item: 'Cheese block', cost: 5 },
  { item: 'Peanut butter', cost: 4 },
  { item: 'Pasta (chickpea or whole-grain)', cost: 4 },
  { item: 'Canned tomatoes & broth', cost: 5 },
  { item: 'Onions, garlic, peppers', cost: 5 },
  { item: 'Olive oil & seasoning', cost: 6 },
  { item: 'Cottage cheese', cost: 4 },
]

const EXTRAS: PlanItem[] = [
  { item: 'Salmon fillets', cost: 12 },
  { item: 'Avocados (4)', cost: 5 },
  { item: 'Ground turkey', cost: 6 },
  { item: 'Hummus', cost: 4 },
  { item: 'Dark chocolate (dessert)', cost: 4 },
  { item: 'Nuts & seeds', cost: 6 },
]

export function buildGroceryPlan(budget: number): GroceryPlan {
  const list = [...BASE_LIST]
  let total = list.reduce((s, i) => s + i.cost, 0)

  // Add extras while they fit, for variety and fertility-friendly fats.
  for (const e of EXTRAS) {
    if (total + e.cost <= budget) {
      list.push(e)
      total += e.cost
    }
  }

  const meals = [
    { slot: 'Breakfast', idea: 'Greek yogurt + berries, or eggs on toast' },
    { slot: 'Lunch', idea: 'Burrito bowls with beans, rice & greens' },
    { slot: 'Dinner', idea: 'Sheet-pan chicken with veg & rice' },
    { slot: 'Snack', idea: 'Cottage cheese, apple + peanut butter' },
    { slot: 'Dessert', idea: 'Dark chocolate + banana' },
  ]

  return {
    budget,
    total,
    underBudget: total <= budget,
    meals,
    shoppingList: list,
    proteinNote:
      'Every dinner and most breakfasts hit a protein source — eggs, chicken, beans, yogurt, cottage cheese.',
  }
}
