/**
 * Loads the editable food and recipe catalog from JSON files.
 * The JSON files are read-only defaults; user changes are saved separately.
 */
export class FoodCatalog {
  constructor(foods) {
    this.foods = foods;
    this.byKey = Object.fromEntries(foods.map(food => [food.k, food]));
    this.tips = {
      dairy:"Bake with it, make pancakes, or freeze it (grated cheese and milk both freeze well).",
      bakery:"Freeze slices now, or turn them into French toast or croutons.",
      leafy:"Wilt it into eggs, pasta or soup. A whole bag shrinks to a cup.",
      produce:"Roast it, add it to soup, or chop and freeze it.",
      fruit:"Freeze it for smoothies, or bake it into muffins or banana bread.",
      meat:"Cook it today or freeze it now. Frozen, it keeps for months.",
      pantry:"",
      other:"Check it, and freeze or cook it soon."
    };
    this.freezeDaysByKey = {
      milk:90, cheese:180, yogurt:60, butter:270, cream:90, bread:90, tortilla:180,
      spinach:180, tomato:180, pepper:240, broccoli:300, mushroom:270, carrot:300,
      onion:240, garlic:180, banana:90, apple:240, strawberries:240, avocado:120,
      chicken:270, beef:120, salmon:90
    };
    this.cannotFreeze = {
      eggs:"Eggs crack in the shell when frozen.",
      lettuce:"Lettuce goes limp and watery when frozen.",
      cucumber:"Cucumber goes mushy when frozen.",
      potato:"Raw potatoes turn watery and grainy when frozen."
    };
    this.thawDays = {meat:2, dairy:5, bakery:3};
    this.receiptPatterns = {
      cheese:/chees|\bched|\bchs[e]?\b|mozz|parm|cott\b|cottage/, yogurt:/yog|\bygt\b/,
      milk:/milk|\bmlk\b|\bhomo\b|\bskim\b|\b[12]\s?%/, cream:/cream|\bcrm\b/,
      butter:/butter|\bbtr\b|unsalted|\bsalted\b/, eggs:/egg/,
      chicken:/chick|\bchkn|\bchk\b|breasts?\b|\bb\/s\b|thighs?\b|drumstick|\bwings?\b/,
      beef:/beef|\bgrnd\s?bf|\bgr\s?bf/, salmon:/salmon/,
      spinach:/spinach|\bspnch|\bspin\b/, lettuce:/lettuce|romaine|\blett\b|iceberg/,
      tomato:/tomato|\btoms?\b|\broma\b/, pepper:/pepper|\bppr\b/, broccoli:/brocc/,
      mushroom:/mushr|\bmush\b/, cucumber:/cucumb|\bcuke/, carrot:/carrot|\bcarr\b/,
      strawberries:/strawb|\bstrwb|berries/, avocado:/avocad|\bavo\b/, banana:/banan|\bbnna/,
      apple:/apple/, potato:/potat/, onion:/onion/, garlic:/garlic/,
      bread:/bread|\bbrd\b|\bloaf|bagel|\bbuns?\b|\brye\b|sourdough|baguette/,
      tortilla:/tortil|\bwraps?\b/, pasta:/pasta|spaghet|penne|macaroni|fusilli|linguin/,
      rice:/\brice\b/, oats:/\boats?\b|oatmeal/, beans:/\bbeans?\b/
    };
  }

  static async load() {
    const response = await fetch("./data/foods.json");
    if (!response.ok) throw new Error("Could not load food catalog.");
    return new FoodCatalog(await response.json());
  }

  findFood(text) {
    const value = String(text || "").toLowerCase();
    for (const key of Object.keys(this.receiptPatterns)) {
      if (this.receiptPatterns[key].test(value)) return this.byKey[key] || null;
    }
    return null;
  }

  freezeDays(key, category) {
    if (key && this.freezeDaysByKey[key]) return this.freezeDaysByKey[key];
    if (category === "pantry") return null;
    if (key && this.cannotFreeze[key]) return null;
    return key ? null : 90;
  }

  noFreezeMessage(key, category) {
    if (key && this.cannotFreeze[key]) return this.cannotFreeze[key];
    if (category === "pantry") return "This keeps for months in the cupboard, so there's no need to freeze it.";
    return "This doesn't freeze well.";
  }
}
