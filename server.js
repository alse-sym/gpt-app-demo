import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const shopHtml = readFileSync(join(__dirname, "public", "shop-widget.html"), "utf8");

// ─── Menu Data ──────────────────────────────────────────────────────────────
const MENU = [
  {
    id: "margherita",
    name: "Margherita Classica",
    price: 14.99,
    description: "San Marzano tomatoes, fresh mozzarella, basil, EVOO",
    tags: ["vegetarian"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-1.png",
    rating: 4.8,
  },
  {
    id: "pepperoni",
    name: "Pepperoni Inferno",
    price: 16.99,
    description: "Double pepperoni, mozzarella, spicy honey drizzle",
    tags: ["spicy", "popular"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-2.png",
    rating: 4.9,
  },
  {
    id: "truffle-mushroom",
    name: "Truffle Mushroom",
    price: 19.99,
    description: "Wild mushroom medley, truffle cream, fontina, thyme",
    tags: ["vegetarian", "premium"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-3.png",
    rating: 4.7,
  },
  {
    id: "bbq-chicken",
    name: "BBQ Chicken Ranch",
    price: 17.99,
    description: "Grilled chicken, BBQ sauce, red onion, cilantro, ranch drizzle",
    tags: ["popular"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-4.png",
    rating: 4.6,
  },
  {
    id: "mediterranean",
    name: "Mediterranean Garden",
    price: 16.99,
    description: "Kalamata olives, artichokes, sun-dried tomatoes, feta, arugula",
    tags: ["vegetarian", "vegan-option"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-5.png",
    rating: 4.5,
  },
  {
    id: "meat-lovers",
    name: "Meat Lovers Supreme",
    price: 19.99,
    description: "Pepperoni, Italian sausage, bacon, ham, ground beef",
    tags: ["popular", "premium"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-6.png",
    rating: 4.8,
  },
  {
    id: "hawaiian",
    name: "Hawaiian Sunset",
    price: 15.99,
    description: "Smoked ham, caramelized pineapple, jalapeño, mozzarella",
    tags: ["spicy"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-1.png",
    rating: 4.3,
  },
  {
    id: "white-pie",
    name: "Bianca White Pie",
    price: 17.99,
    description: "Ricotta, mozzarella, parmesan, garlic, lemon zest",
    tags: ["vegetarian"],
    image: "https://persistent.oaistatic.com/pizzaz/pizzaz-2.png",
    rating: 4.7,
  },
];

const SPECIALS = [
  { id: "lunch-combo", name: "Lunch Combo", description: "Any slice + drink + side", price: 9.99, originalPrice: 14.99, badge: "Best Value", image: "https://persistent.oaistatic.com/pizzaz/pizzaz-3.png" },
  { id: "family-deal", name: "Family Deal", description: "2 large pizzas + garlic bread + 2L soda", price: 34.99, originalPrice: 49.99, badge: "Most Popular", image: "https://persistent.oaistatic.com/pizzaz/pizzaz-4.png" },
  { id: "date-night", name: "Date Night", description: "1 premium pizza + salad + dessert + wine", price: 39.99, originalPrice: 55.99, badge: "New", image: "https://persistent.oaistatic.com/pizzaz/pizzaz-5.png" },
  { id: "party-pack", name: "Party Pack", description: "4 large pizzas + 4 sides + 4L soda", price: 69.99, originalPrice: 89.99, badge: "Save 22%", image: "https://persistent.oaistatic.com/pizzaz/pizzaz-6.png" },
];

const STORES = [
  { id: "north-beach", name: "Pizzaz North Beach", address: "412 Columbus Ave", city: "North Beach, SF", coords: [-122.4098, 37.8001], hours: "11am–11pm", rating: 4.8, phone: "(415) 555-0101" },
  { id: "mission", name: "Pizzaz Mission", address: "2847 Mission St", city: "Mission, SF", coords: [-122.4255, 37.7613], hours: "11am–12am", rating: 4.6, phone: "(415) 555-0102" },
  { id: "soma", name: "Pizzaz SoMa", address: "680 Folsom St", city: "SoMa, SF", coords: [-122.4135, 37.7805], hours: "10am–10pm", rating: 4.5, phone: "(415) 555-0103" },
  { id: "nob-hill", name: "Pizzaz Nob Hill", address: "1540 Hyde St", city: "Nob Hill, SF", coords: [-122.4123, 37.7899], hours: "11am–11pm", rating: 4.7, phone: "(415) 555-0104" },
  { id: "alamo-square", name: "Pizzaz Alamo Square", address: "701 Divisadero St", city: "Alamo Square, SF", coords: [-122.4388, 37.7775], hours: "11am–10pm", rating: 4.4, phone: "(415) 555-0105" },
];

// ─── In-memory Cart (shared — each ChatGPT tool call may use a different
//     MCP session, so we use a single global cart for this demo) ─────────────
let cart = [];

// ─── Order History (for reorder support) ────────────────────────────────────
let lastOrder = null;

// ─── Server Factory ─────────────────────────────────────────────────────────
const WIDGET_URI = "ui://widget/pizzaz-shop.html";

function createPizzazServer() {
  const server = new McpServer({ name: "pizzaz-shop", version: "1.0.0" });

  // Register the shop widget as a resource
  registerAppResource(server, "pizzaz-shop", WIDGET_URI, {}, async () => ({
    contents: [
      {
        uri: WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: shopHtml,
      },
    ],
  }));

  // ─── Tool: Browse Menu ──────────────────────────────────────────────────
  registerAppTool(
    server,
    "browse_menu",
    {
      title: "Browse Pizza Menu",
      description:
        "Shows the full Pizzaz pizza menu with prices, descriptions, and ratings. Use when the user wants to see what pizzas are available. After showing the menu, offer to recommend a pizza based on their preferences or add one to the cart.",
      inputSchema: {
        filter: z
          .enum(["all", "vegetarian", "spicy", "popular", "premium"])
          .optional()
          .describe("Filter menu by category"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ filter }) => {
      const items =
        !filter || filter === "all"
          ? MENU
          : MENU.filter((item) => item.tags.includes(filter));
      return {
        content: [
          {
            type: "text",
            text: `Showing ${items.length} pizza${items.length !== 1 ? "s" : ""} on the menu${filter && filter !== "all" ? ` (filtered: ${filter})` : ""}.`,
          },
        ],
        structuredContent: { view: "menu", items, filter: filter || "all" },
      };
    }
  );

  // ─── Tool: View Specials ────────────────────────────────────────────────
  registerAppTool(
    server,
    "view_specials",
    {
      title: "View Today's Specials",
      description:
        "Shows today's deals and combo specials with discounted prices. Use when the user asks about deals, specials, or wants to save money. Proactively suggest the best deal based on group size or budget.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => ({
      content: [{ type: "text", text: `We have ${SPECIALS.length} specials today!` }],
      structuredContent: { view: "specials", specials: SPECIALS },
    })
  );

  // ─── Tool: Find Nearby Stores ───────────────────────────────────────────
  registerAppTool(
    server,
    "find_nearby_stores",
    {
      title: "Find Nearby Stores",
      description:
        "Shows Pizzaz store locations on a map with addresses, hours, and ratings. Use when the user wants to find a store, see locations, or get directions.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => ({
      content: [
        { type: "text", text: `Found ${STORES.length} Pizzaz locations near you.` },
      ],
      structuredContent: { view: "stores", stores: STORES },
    })
  );

  // ─── Tool: Add to Cart ─────────────────────────────────────────────────
  registerAppTool(
    server,
    "add_to_cart",
    {
      title: "Add to Cart",
      description:
        "Adds a pizza to the shopping cart. Use when the user wants to order a specific pizza. After adding, always call find_best_deal to check if a combo or special would save the user money.",
      inputSchema: {
        item_id: z.string().describe("The pizza ID to add (e.g. 'margherita', 'pepperoni')"),
        quantity: z.number().int().min(1).max(10).optional().describe("How many to add (default 1)"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ item_id, quantity }) => {
      const pizza = MENU.find((p) => p.id === item_id);
      if (!pizza) {
        return {
          content: [{ type: "text", text: `Pizza "${item_id}" not found on the menu.` }],
          structuredContent: { view: "error", message: `Pizza "${item_id}" not found.` },
        };
      }
      const qty = quantity || 1;
      const existing = cart.find((c) => c.id === item_id);
      if (existing) {
        existing.quantity += qty;
      } else {
        cart.push({ ...pizza, quantity: qty });
      }
      const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
      return {
        content: [
          {
            type: "text",
            text: `Added ${qty}x ${pizza.name} to cart. Cart total: $${total.toFixed(2)}.`,
          },
        ],
        structuredContent: { view: "cart", cartItems: cart, total },
      };
    }
  );

  // ─── Tool: View Cart ───────────────────────────────────────────────────
  registerAppTool(
    server,
    "view_cart",
    {
      title: "View Cart",
      description:
        "Shows the current shopping cart with all items, quantities, and total price. Use when the user wants to see their order or review the cart.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
      return {
        content: [
          {
            type: "text",
            text: cart.length === 0
              ? "Your cart is empty."
              : `You have ${cart.reduce((s, c) => s + c.quantity, 0)} item(s) in your cart. Total: $${total.toFixed(2)}.`,
          },
        ],
        structuredContent: { view: "cart", cartItems: cart, total },
      };
    }
  );

  // ─── Tool: Recommend Pizza ──────────────────────────────────────────────
  registerAppTool(
    server,
    "recommend_pizza",
    {
      title: "Get Pizza Recommendation",
      description:
        "Returns a personalized pizza recommendation based on the user's preferences. Use this proactively when the user says they're hungry, can't decide, wants a suggestion, or describes what they like (e.g. 'something spicy', 'I'm vegetarian', 'feed my family'). After recommending, offer to add the pizza to the cart immediately.",
      inputSchema: {
        preferences: z.array(z.enum(["vegetarian", "spicy", "popular", "premium", "budget", "top-rated"])).optional()
          .describe("User taste preferences — infer from conversation context"),
        group_size: z.number().int().min(1).max(20).optional()
          .describe("How many people eating (default 1)"),
        budget: z.number().optional()
          .describe("Max budget in dollars — helps narrow the pick"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ preferences, group_size, budget }) => {
      let candidates = [...MENU];
      const prefs = preferences || [];
      const size = group_size || 1;

      if (prefs.includes("vegetarian")) candidates = candidates.filter(p => p.tags.includes("vegetarian"));
      if (prefs.includes("spicy")) candidates = candidates.filter(p => p.tags.includes("spicy"));
      if (prefs.includes("popular")) candidates = candidates.filter(p => p.tags.includes("popular"));
      if (prefs.includes("premium")) candidates = candidates.filter(p => p.tags.includes("premium"));
      if (prefs.includes("budget")) candidates = candidates.filter(p => p.price <= 16.99);
      if (budget) candidates = candidates.filter(p => p.price * size <= budget);
      if (prefs.includes("top-rated")) candidates.sort((a, b) => b.rating - a.rating);

      if (candidates.length === 0) candidates = [...MENU];
      candidates.sort((a, b) => b.rating - a.rating);

      const pick = candidates[0];
      const quantity = Math.max(1, Math.ceil(size / 2));
      const totalEstimate = pick.price * quantity;

      const matchingDeal = size >= 4 ? SPECIALS.find(s => s.id === "party-pack")
        : size >= 2 ? SPECIALS.find(s => s.id === "family-deal")
        : null;

      let dealHint = "";
      if (matchingDeal) {
        dealHint = ` Consider the ${matchingDeal.name} ($${matchingDeal.price}) — saves $${(matchingDeal.originalPrice - matchingDeal.price).toFixed(2)} vs ordering separately.`;
      }

      return {
        content: [{
          type: "text",
          text: `Recommendation: ${quantity}x ${pick.name} ($${pick.price} each, ${pick.rating} stars) — "${pick.description}". Estimated total: $${totalEstimate.toFixed(2)}.${dealHint} Say "add it" to put it in your cart.`,
        }],
        structuredContent: {
          view: "menu",
          items: [pick],
          filter: "recommendation",
          recommendation: { pick, quantity, totalEstimate, deal: matchingDeal || undefined },
        },
      };
    }
  );

  // ─── Tool: Find Best Deal ─────────────────────────────────────────────
  registerAppTool(
    server,
    "find_best_deal",
    {
      title: "Find Best Deal",
      description:
        "Analyzes the current cart and checks if a combo deal or special would save the user money. Call this automatically after items are added to the cart. Also use when the user asks about saving money or getting the best price.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
      const cartQty = cart.reduce((sum, c) => sum + c.quantity, 0);

      if (cart.length === 0) {
        return {
          content: [{ type: "text", text: "Cart is empty — add some pizzas first, then I can find the best deal." }],
          structuredContent: { view: "specials", specials: SPECIALS, dealAnalysis: { cartTotal: 0, bestDeal: null, savings: 0 } },
        };
      }

      const applicableDeals = SPECIALS.map(special => {
        let savings = 0;
        let applicable = false;
        if (special.id === "lunch-combo" && cartQty === 1) { applicable = true; savings = cartTotal - special.price; }
        if (special.id === "family-deal" && cartQty >= 2) { applicable = true; savings = cartTotal - special.price; }
        if (special.id === "date-night" && cartQty >= 1 && cart.some(c => c.tags.includes("premium"))) { applicable = true; savings = cartTotal - special.price; }
        if (special.id === "party-pack" && cartQty >= 3) { applicable = true; savings = cartTotal - special.price; }
        return { ...special, applicable, savings };
      }).filter(d => d.applicable && d.savings > 0).sort((a, b) => b.savings - a.savings);

      const bestDeal = applicableDeals[0] || null;

      return {
        content: [{
          type: "text",
          text: bestDeal
            ? `Your cart is $${cartTotal.toFixed(2)}. Switch to the ${bestDeal.name} ($${bestDeal.price}) and save $${bestDeal.savings.toFixed(2)}! ${bestDeal.description}.`
            : `Your cart total is $${cartTotal.toFixed(2)}. No better combo deal available — you're already getting a good price.`,
        }],
        structuredContent: {
          view: "specials",
          specials: SPECIALS,
          dealAnalysis: { cartTotal, cartQty, bestDeal, allDeals: applicableDeals },
        },
      };
    }
  );

  // ─── Tool: Quick Order ────────────────────────────────────────────────
  registerAppTool(
    server,
    "quick_order",
    {
      title: "Quick Order",
      description:
        "One-shot ordering: builds a full cart based on group size, preferences, and budget, then shows a summary ready to confirm. Use when the user says something like 'order pizza for 4 people', 'surprise me', 'I'm hungry just order something', or gives a budget. This replaces the need to browse, add to cart, and checkout separately.",
      inputSchema: {
        group_size: z.number().int().min(1).max(20).optional()
          .describe("Number of people to feed (default 1)"),
        preferences: z.array(z.enum(["vegetarian", "spicy", "popular", "premium", "budget", "top-rated", "mixed"])).optional()
          .describe("Taste preferences — 'mixed' means a variety of styles"),
        budget: z.number().optional()
          .describe("Max total budget in dollars"),
        pickup_store: z.string().optional()
          .describe("Store ID for pickup, omit for delivery"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ group_size, preferences, budget, pickup_store }) => {
      const size = group_size || 1;
      const prefs = preferences || ["popular", "top-rated"];
      const pizzasNeeded = Math.max(1, Math.ceil(size / 2));

      let candidates = [...MENU];
      if (prefs.includes("vegetarian")) candidates = candidates.filter(p => p.tags.includes("vegetarian"));
      if (prefs.includes("spicy")) candidates = candidates.filter(p => p.tags.includes("spicy"));
      if (prefs.includes("budget")) candidates = candidates.filter(p => p.price <= 16.99);
      if (prefs.includes("premium")) candidates = candidates.filter(p => p.tags.includes("premium"));

      if (candidates.length === 0) candidates = [...MENU];
      candidates.sort((a, b) => b.rating - a.rating);

      if (prefs.includes("mixed")) {
        const shuffled = candidates.sort(() => Math.random() - 0.5);
        candidates = shuffled;
      }

      const selected = candidates.slice(0, pizzasNeeded);

      cart.length = 0;
      for (const pizza of selected) {
        cart.push({ ...pizza, quantity: 1 });
      }

      if (budget) {
        let total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
        while (total > budget && cart.length > 1) {
          cart.pop();
          total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
        }
      }

      const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
      const deliveryFee = pickup_store ? 0 : 4.99;
      const serviceFee = 2.99;
      const tax = subtotal * 0.0875;
      const tip = subtotal * 0.18;
      const grandTotal = subtotal + deliveryFee + serviceFee + tax + tip;
      const store = pickup_store ? STORES.find(s => s.id === pickup_store) : null;

      const itemList = cart.map(c => `${c.quantity}x ${c.name} ($${c.price})`).join(", ");

      return {
        content: [{
          type: "text",
          text: `Quick order ready for ${size} people: ${itemList}. Estimated total: $${grandTotal.toFixed(2)} (incl. tax, fees, 18% tip). ${store ? `Pickup at ${store.name}.` : "Delivery."} Say "place it" to confirm or "change" to adjust.`,
        }],
        structuredContent: {
          view: "cart",
          cartItems: cart,
          total: subtotal,
          quickOrder: { groupSize: size, estimatedGrandTotal: grandTotal, store: store || null, method: pickup_store ? "pickup" : "delivery" },
        },
      };
    }
  );

  // ─── Tool: Suggest Store ──────────────────────────────────────────────
  registerAppTool(
    server,
    "suggest_store",
    {
      title: "Suggest Best Store",
      description:
        "Recommends the best Pizzaz store for pickup based on rating, hours, and current time. Use this proactively before placing an order to offer pickup (which saves the $4.99 delivery fee). Also use when the user asks 'which store should I go to?' or 'where should I pick up?'.",
      inputSchema: {
        preference: z.enum(["best-rated", "latest-hours", "closest"]).optional()
          .describe("How to rank stores (default: best-rated)"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ preference }) => {
      const pref = preference || "best-rated";
      const ranked = [...STORES];

      if (pref === "best-rated") ranked.sort((a, b) => b.rating - a.rating);
      if (pref === "latest-hours") ranked.sort((a, b) => {
        const hourVal = (h) => parseInt(h.split("–")[1]) || 0;
        return hourVal(b.hours) - hourVal(a.hours);
      });

      const top = ranked[0];
      const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
      const savingsMsg = cartTotal > 0 ? ` Picking up saves you $4.99 delivery fee.` : "";

      return {
        content: [{
          type: "text",
          text: `Best pick: ${top.name} (${top.rating} stars) at ${top.address}, ${top.city}. Open ${top.hours}.${savingsMsg} Want to pick up here?`,
        }],
        structuredContent: {
          view: "stores",
          stores: STORES,
          suggestion: { recommended: top, reason: pref, deliverySavings: 4.99 },
        },
      };
    }
  );

  // ─── Tool: Place Order ─────────────────────────────────────────────────
  registerAppTool(
    server,
    "place_order",
    {
      title: "Place Order",
      description:
        "Completes the checkout and places the order for delivery or pickup. Use when the user confirms they want to order. Before placing, call suggest_store to recommend the best store for pickup if the user hasn't chosen one.",
      inputSchema: {
        store_id: z.string().optional().describe("Preferred store ID for pickup. Omit for delivery."),
        tip_percent: z.number().min(0).max(100).optional().describe("Tip percentage (default 18%)"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ store_id, tip_percent }) => {
      if (cart.length === 0) {
        return {
          content: [{ type: "text", text: "Your cart is empty! Add some pizzas first." }],
          structuredContent: { view: "error", message: "Cart is empty." },
        };
      }
      const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
      const deliveryFee = store_id ? 0 : 4.99;
      const serviceFee = 2.99;
      const tax = subtotal * 0.0875;
      const tip = subtotal * ((tip_percent ?? 18) / 100);
      const grandTotal = subtotal + deliveryFee + serviceFee + tax + tip;
      const store = store_id ? STORES.find((s) => s.id === store_id) : null;
      const orderId = `PZZ-${Date.now().toString(36).toUpperCase()}`;
      const eta = store_id ? "15-20 min" : "30-40 min";
      const orderItems = [...cart];

      // Save order history and clear cart
      lastOrder = { orderId, items: orderItems, subtotal, grandTotal, date: new Date().toISOString() };
      cart.length = 0;

      return {
        content: [
          {
            type: "text",
            text: `Order ${orderId} placed! ${store ? `Pickup at ${store.name}` : "Delivery"} — ETA ${eta}. Grand total: $${grandTotal.toFixed(2)}.`,
          },
        ],
        structuredContent: {
          view: "confirmation",
          orderId,
          items: orderItems,
          subtotal,
          deliveryFee,
          serviceFee,
          tax,
          tip,
          grandTotal,
          eta,
          store: store || null,
          method: store_id ? "pickup" : "delivery",
        },
      };
    }
  );

  return server;
}

// ─── HTTP Server ────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 8787);

// Active SSE sessions: transportSessionId → SSEServerTransport
const sseSessions = new Map();

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host ?? "localhost"}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    setCors(res);
    res.writeHead(204).end();
    return;
  }

  setCors(res);

  // ── SSE endpoint: GET /sse opens an event stream ─────────────────────────
  if (url.pathname === "/sse" && req.method === "GET") {
    try {
      const server = createPizzazServer();
      const transport = new SSEServerTransport("/messages", res);
      sseSessions.set(transport.sessionId, transport);
      res.on("close", () => sseSessions.delete(transport.sessionId));
      await server.connect(transport);
    } catch (err) {
      console.error("SSE error:", err);
      if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
    }
    return;
  }

  // ── SSE messages: POST /messages?sessionId=… ─────────────────────────────
  if (url.pathname === "/messages" && req.method === "POST") {
    const sessionId = url.searchParams.get("sessionId");
    const transport = sseSessions.get(sessionId);
    if (!transport) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unknown or expired session" }));
      return;
    }
    try {
      await transport.handlePostMessage(req, res);
    } catch (err) {
      console.error("SSE message error:", err);
      if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
    }
    return;
  }

  // ── Streamable HTTP: POST /mcp (kept for direct MCP clients) ─────────────
  if (url.pathname === "/mcp" && req.method === "POST") {
    try {
      const server = createPizzazServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("MCP error:", err);
      if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
    }
    return;
  }

  // ── Health check ─────────────────────────────────────────────────────────
  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", app: "pizzaz-shop", version: "1.0.0" }));
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`\n  🍕 Pizzaz Shop MCP server running!\n`);
  console.log(`  Local:    http://0.0.0.0:${port}`);
  console.log(`  SSE:      http://0.0.0.0:${port}/sse`);
  console.log(`  MCP:      http://0.0.0.0:${port}/mcp\n`);
});
