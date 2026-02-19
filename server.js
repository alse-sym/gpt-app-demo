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
const widgetHtml = readFileSync(join(__dirname, "public", "shop-widget.html"), "utf8");

// ─── Protection Plans ────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "essential-shield",
    name: "Essential Shield",
    monthlyPrice: 4.99,
    description: "Screen crack & display damage coverage for smartphones",
    coverage: ["Screen damage", "Display malfunction"],
    deviceTypes: ["smartphone"],
    deductible: 49,
    claimLimit: 2,
    rating: 4.3,
    popular: false,
    tier: "basic",
    icon: "smartphone",
  },
  {
    id: "basic-protect",
    name: "Basic Protect",
    monthlyPrice: 7.99,
    description: "Accidental damage coverage including drops, spills, and cracked screens",
    coverage: ["Accidental damage", "Screen damage", "Liquid damage"],
    deviceTypes: ["smartphone", "tablet"],
    deductible: 29,
    claimLimit: 3,
    rating: 4.5,
    popular: false,
    tier: "basic",
    icon: "smartphone",
  },
  {
    id: "standard-guard",
    name: "Standard Guard",
    monthlyPrice: 12.99,
    description: "Comprehensive damage and theft protection with fast replacement",
    coverage: ["Accidental damage", "Theft", "Screen damage", "Liquid damage", "Power surge"],
    deviceTypes: ["smartphone", "tablet"],
    deductible: 0,
    claimLimit: 4,
    rating: 4.7,
    popular: true,
    tier: "standard",
    icon: "shield",
  },
  {
    id: "premium-shield",
    name: "Premium Shield",
    monthlyPrice: 17.99,
    description: "All-risk coverage including loss, worldwide protection, and same-day replacement",
    coverage: ["Accidental damage", "Theft", "Loss", "Screen damage", "Liquid damage", "Power surge", "Worldwide coverage"],
    deviceTypes: ["smartphone", "tablet", "smartwatch"],
    deductible: 0,
    claimLimit: 6,
    rating: 4.9,
    popular: true,
    tier: "premium",
    icon: "globe",
  },
  {
    id: "family-bundle",
    name: "Family Bundle",
    monthlyPrice: 29.99,
    description: "Protect up to 5 devices under one plan — phones, tablets, and wearables",
    coverage: ["Accidental damage", "Theft", "Screen damage", "Liquid damage", "Multi-device"],
    deviceTypes: ["smartphone", "tablet", "smartwatch", "earbuds"],
    deductible: 0,
    claimLimit: 8,
    rating: 4.8,
    popular: true,
    tier: "premium",
    icon: "users",
  },
  {
    id: "business-pro",
    name: "Business Pro",
    monthlyPrice: 24.99,
    description: "Fleet device management with priority support and bulk replacement",
    coverage: ["Accidental damage", "Theft", "Loss", "Data recovery", "Priority replacement"],
    deviceTypes: ["smartphone", "tablet", "laptop"],
    deductible: 0,
    claimLimit: 10,
    rating: 4.6,
    popular: false,
    tier: "premium",
    icon: "briefcase",
  },
  {
    id: "wearable-care",
    name: "Wearable Care",
    monthlyPrice: 3.99,
    description: "Smartwatch and earbuds protection — water, impact, and battery coverage",
    coverage: ["Accidental damage", "Water damage", "Battery failure"],
    deviceTypes: ["smartwatch", "earbuds"],
    deductible: 19,
    claimLimit: 2,
    rating: 4.4,
    popular: false,
    tier: "basic",
    icon: "watch",
  },
  {
    id: "laptop-fortress",
    name: "Laptop Fortress",
    monthlyPrice: 14.99,
    description: "Full laptop coverage — accidental damage, theft, keyboard, and battery",
    coverage: ["Accidental damage", "Theft", "Keyboard failure", "Battery replacement", "Screen damage"],
    deviceTypes: ["laptop"],
    deductible: 0,
    claimLimit: 4,
    rating: 4.7,
    popular: false,
    tier: "standard",
    icon: "laptop",
  },
];

const PROMOTIONS = [
  {
    id: "new-device-bundle",
    name: "New Device Bundle",
    description: "Get 30% off your first 3 months when you protect a new device",
    monthlyPrice: 9.09,
    originalPrice: 12.99,
    badge: "Best Value",
    savings: "30%",
    icon: "tag",
  },
  {
    id: "family-pack",
    name: "Family Protection Pack",
    description: "Cover 3+ devices and save 25% — one plan for the whole family",
    monthlyPrice: 22.49,
    originalPrice: 29.99,
    badge: "Most Popular",
    savings: "25%",
    icon: "users",
  },
  {
    id: "trade-in-shield",
    name: "Trade-In Shield",
    description: "Free first month of protection when you trade in your old device",
    monthlyPrice: 0,
    originalPrice: 12.99,
    badge: "Free Month",
    savings: "$12.99",
    icon: "refresh",
  },
  {
    id: "annual-saver",
    name: "Annual Saver",
    description: "Pay yearly and get 2 months free — best long-term value",
    monthlyPrice: 10.82,
    originalPrice: 12.99,
    badge: "Save 17%",
    savings: "2 months free",
    icon: "calendar",
  },
];

const REPAIR_CENTERS = [
  {
    id: "downtown-hub",
    name: "ShieldHub Downtown Service Center",
    address: "450 Market St",
    city: "Financial District, SF",
    coords: [-122.3984, 37.7910],
    hours: "9am–7pm",
    rating: 4.9,
    phone: "(415) 555-2001",
    services: ["Screen repair", "Battery replacement", "Water damage", "Data recovery"],
    turnaround: "Same day",
    certified: true,
  },
  {
    id: "mission-tech",
    name: "Mission Tech Repairs",
    address: "2920 Mission St",
    city: "Mission, SF",
    coords: [-122.4255, 37.7513],
    hours: "10am–8pm",
    rating: 4.7,
    phone: "(415) 555-2002",
    services: ["Screen repair", "Battery replacement", "Charging port"],
    turnaround: "Same day",
    certified: true,
  },
  {
    id: "soma-express",
    name: "SoMa Express Fix",
    address: "725 Folsom St",
    city: "SoMa, SF",
    coords: [-122.4035, 37.7815],
    hours: "8am–9pm",
    rating: 4.6,
    phone: "(415) 555-2003",
    services: ["Screen repair", "Battery replacement", "Water damage", "Laptop repair"],
    turnaround: "1–2 hours",
    certified: true,
  },
  {
    id: "marina-devices",
    name: "Marina Device Care",
    address: "2190 Chestnut St",
    city: "Marina, SF",
    coords: [-122.4383, 37.8002],
    hours: "10am–6pm",
    rating: 4.5,
    phone: "(415) 555-2004",
    services: ["Screen repair", "Battery replacement", "Wearable repair"],
    turnaround: "Next day",
    certified: false,
  },
  {
    id: "richmond-repair",
    name: "Richmond Repair Lab",
    address: "315 Clement St",
    city: "Inner Richmond, SF",
    coords: [-122.4625, 37.7831],
    hours: "9am–7pm",
    rating: 4.4,
    phone: "(415) 555-2005",
    services: ["Screen repair", "Battery replacement", "Water damage", "Data recovery", "Laptop repair"],
    turnaround: "Same day",
    certified: true,
  },
];

// ─── Server Factory ──────────────────────────────────────────────────────────
const WIDGET_URI = "ui://widget/shieldhub.html";
const SESSION_TTL_MS = 1000 * 60 * 60;
const MAX_SESSION_STATES = 500;
const sessionStateStore = new Map();

function resolveSessionId(meta = {}) {
  const raw =
    meta?.["openai/session"] ??
    meta?.sessionId ??
    meta?.["x-openai-session-id"] ??
    "anonymous";
  return String(raw);
}

function getSessionState(meta = {}) {
  const now = Date.now();
  const sessionId = resolveSessionId(meta);
  const existing = sessionStateStore.get(sessionId);
  if (existing) {
    existing.lastSeen = now;
    return existing;
  }

  if (sessionStateStore.size >= MAX_SESSION_STATES) {
    for (const [id, state] of sessionStateStore.entries()) {
      if (now - state.lastSeen > SESSION_TTL_MS) {
        sessionStateStore.delete(id);
      }
    }
    if (sessionStateStore.size >= MAX_SESSION_STATES) {
      const oldestSessionId = sessionStateStore.keys().next().value;
      sessionStateStore.delete(oldestSessionId);
    }
  }

  const created = { cart: [], lastPolicy: null, lastSeen: now };
  sessionStateStore.set(sessionId, created);
  return created;
}

function getMonthlyTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.monthlyPrice * item.quantity, 0);
}

function cloneCart(cartItems) {
  return cartItems.map((item) => ({ ...item }));
}

function createShieldHubServer() {
  const server = new McpServer({ name: "shieldhub", version: "1.0.0" });

  registerAppResource(server, "shieldhub", WIDGET_URI, {}, async () => ({
    contents: [
      {
        uri: WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: widgetHtml,
        _meta: {
          "openai/widgetDescription":
            "Interactive ShieldHub storefront for protection plans, promotions, repair centers, and checkout.",
          "openai/widgetPrefersBorder": true,
          "openai/widgetCSP": {
            connect_domains: [],
            resource_domains: [],
          },
        },
      },
    ],
  }));

  // ─── Tool: Browse Plans ────────────────────────────────────────────────────
  registerAppTool(
    server,
    "browse_plans",
    {
      title: "Browse Protection Plans",
      description:
        "Shows available device protection plans with pricing, coverage details, and ratings. Use when the user wants to see what protection options are available. After showing plans, offer to recommend a plan based on their device and needs.",
      inputSchema: {
        filter: z
          .enum(["all", "smartphone", "tablet", "laptop", "wearable", "popular", "premium", "basic", "standard"])
          .optional()
          .describe("Filter plans by device type, tier, or popularity"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ filter }) => {
      let items;
      if (!filter || filter === "all") {
        items = PLANS;
      } else if (filter === "popular") {
        items = PLANS.filter((p) => p.popular);
      } else if (filter === "premium" || filter === "basic" || filter === "standard") {
        items = PLANS.filter((p) => p.tier === filter);
      } else {
        const deviceMap = { smartphone: "smartphone", tablet: "tablet", laptop: "laptop", wearable: "smartwatch" };
        const deviceType = deviceMap[filter] || filter;
        if (filter === "wearable") {
          items = PLANS.filter((p) => p.deviceTypes.includes("smartwatch") || p.deviceTypes.includes("earbuds"));
        } else {
          items = PLANS.filter((p) => p.deviceTypes.includes(deviceType));
        }
      }
      return {
        content: [
          {
            type: "text",
            text: `Showing ${items.length} protection plan${items.length !== 1 ? "s" : ""}${filter && filter !== "all" ? ` (filtered: ${filter})` : ""}.`,
          },
        ],
        structuredContent: { view: "plans", items, filter: filter || "all" },
      };
    }
  );

  // ─── Tool: View Promotions ─────────────────────────────────────────────────
  registerAppTool(
    server,
    "view_promotions",
    {
      title: "View Current Promotions",
      description:
        "Shows current promotional offers, bundle discounts, and seasonal deals. Use when the user asks about discounts, savings, or wants to get the best price on protection.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => ({
      content: [{ type: "text", text: `We have ${PROMOTIONS.length} active promotions right now!` }],
      structuredContent: { view: "promotions", promotions: PROMOTIONS },
    })
  );

  // ─── Tool: Find Repair Centers ─────────────────────────────────────────────
  registerAppTool(
    server,
    "find_repair_centers",
    {
      title: "Find Repair Centers",
      description:
        "Shows authorized repair and service center locations with ratings, services offered, and turnaround times. Use when the user needs a repair, wants to file a claim, or needs to find the nearest service center.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => ({
      content: [
        { type: "text", text: `Found ${REPAIR_CENTERS.length} authorized repair centers near you.` },
      ],
      structuredContent: { view: "centers", centers: REPAIR_CENTERS },
    })
  );

  // ─── Tool: Add to Cart ─────────────────────────────────────────────────────
  registerAppTool(
    server,
    "add_to_cart",
    {
      title: "Add Plan to Cart",
      description:
        "Adds a protection plan to the shopping cart. Use when the user wants to purchase a specific plan. After adding, suggest checking find_best_coverage for potential bundle savings.",
      inputSchema: {
        plan_id: z.string().describe("The plan ID to add (e.g. 'standard-guard', 'premium-shield')"),
        quantity: z.number().int().min(1).max(10).optional().describe("Number of plans/devices to cover (default 1)"),
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/toolInvocation/invoking": "Updating your cart...",
        "openai/toolInvocation/invoked": "Cart updated.",
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ plan_id, quantity }, { _meta } = {}) => {
      const state = getSessionState(_meta);
      const cart = state.cart;
      const plan = PLANS.find((p) => p.id === plan_id);
      if (!plan) {
        return {
          content: [{ type: "text", text: `Plan "${plan_id}" not found.` }],
          structuredContent: { view: "error", message: `Plan "${plan_id}" not found.` },
        };
      }
      const qty = quantity || 1;
      const existing = cart.find((c) => c.id === plan_id);
      if (existing) {
        existing.quantity += qty;
      } else {
        cart.push({ ...plan, quantity: qty });
      }
      const monthlyTotal = getMonthlyTotal(cart);
      return {
        content: [
          {
            type: "text",
            text: `Added ${qty}x ${plan.name} to cart. Monthly total: $${monthlyTotal.toFixed(2)}/mo.`,
          },
        ],
        structuredContent: { view: "cart", cartItems: cloneCart(cart), monthlyTotal },
      };
    }
  );

  // ─── Tool: Update Cart Quantity ────────────────────────────────────────────
  registerAppTool(
    server,
    "update_cart_quantity",
    {
      title: "Update Cart Quantity",
      description:
        "Sets the quantity for a plan already in the cart. Use quantity 0 to remove the plan completely.",
      inputSchema: {
        plan_id: z.string().describe("The plan ID to update"),
        quantity: z.number().int().min(0).max(10).describe("Target quantity (0 removes item)"),
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/toolInvocation/invoking": "Updating your cart...",
        "openai/toolInvocation/invoked": "Cart updated.",
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ plan_id, quantity }, { _meta } = {}) => {
      const state = getSessionState(_meta);
      const cart = state.cart;
      const index = cart.findIndex((item) => item.id === plan_id);
      if (index < 0) {
        const monthlyTotal = getMonthlyTotal(cart);
        return {
          content: [{ type: "text", text: `Plan "${plan_id}" is not in your cart.` }],
          structuredContent: { view: "cart", cartItems: cloneCart(cart), monthlyTotal },
        };
      }

      const item = cart[index];
      if (quantity === 0) {
        cart.splice(index, 1);
      } else {
        item.quantity = quantity;
      }

      const monthlyTotal = getMonthlyTotal(cart);
      return {
        content: [
          {
            type: "text",
            text:
              quantity === 0
                ? `Removed ${item.name} from your cart.`
                : `Updated ${item.name} to ${quantity} device${quantity !== 1 ? "s" : ""}.`,
          },
        ],
        structuredContent: { view: "cart", cartItems: cloneCart(cart), monthlyTotal },
      };
    }
  );

  // ─── Tool: View Cart ───────────────────────────────────────────────────────
  registerAppTool(
    server,
    "view_cart",
    {
      title: "View Cart",
      description:
        "Shows the current cart with selected protection plans, quantities, and monthly/annual cost breakdown. Use when the user wants to review their selections.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (_args, { _meta } = {}) => {
      const state = getSessionState(_meta);
      const cart = state.cart;
      const monthlyTotal = getMonthlyTotal(cart);
      return {
        content: [
          {
            type: "text",
            text: cart.length === 0
              ? "Your cart is empty."
              : `You have ${cart.reduce((s, c) => s + c.quantity, 0)} plan(s) in your cart. Monthly total: $${monthlyTotal.toFixed(2)}/mo.`,
          },
        ],
        structuredContent: { view: "cart", cartItems: cloneCart(cart), monthlyTotal },
      };
    }
  );

  // ─── Tool: Recommend Plan ──────────────────────────────────────────────────
  registerAppTool(
    server,
    "recommend_plan",
    {
      title: "Get Plan Recommendation",
      description:
        "Returns a personalized protection plan recommendation based on the user's device type, usage patterns, and budget. Use proactively when the user describes their device, asks what plan is best, or mentions concerns about damage/theft.",
      inputSchema: {
        device_type: z.enum(["smartphone", "tablet", "laptop", "smartwatch", "earbuds", "multiple"]).optional()
          .describe("The type of device to protect"),
        concerns: z.array(z.enum(["drops", "theft", "water", "loss", "screen", "battery", "all-risk"])).optional()
          .describe("What the user is worried about — infer from conversation"),
        budget: z.enum(["low", "medium", "high"]).optional()
          .describe("Budget preference — low (<$8), medium ($8-$18), high ($18+)"),
        device_count: z.number().int().min(1).max(10).optional()
          .describe("Number of devices to protect (default 1)"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ device_type, concerns, budget, device_count }) => {
      let candidates = [...PLANS];
      const count = device_count || 1;

      if (device_type && device_type !== "multiple") {
        candidates = candidates.filter(p => p.deviceTypes.includes(device_type));
      }
      if (device_type === "multiple" || count >= 3) {
        candidates = candidates.filter(p => p.id === "family-bundle" || p.id === "business-pro" || p.deviceTypes.length >= 3);
      }

      if (budget === "low") candidates = candidates.filter(p => p.monthlyPrice <= 8);
      if (budget === "medium") candidates = candidates.filter(p => p.monthlyPrice > 8 && p.monthlyPrice <= 18);
      if (budget === "high") candidates = candidates.filter(p => p.monthlyPrice > 18 || p.tier === "premium");

      if (concerns && concerns.length > 0) {
        const concernMap = { drops: "Accidental damage", theft: "Theft", water: "Liquid damage", loss: "Loss", screen: "Screen damage", battery: "Battery", "all-risk": "Loss" };
        const needed = concerns.map(c => concernMap[c]).filter(Boolean);
        candidates = candidates.filter(p => needed.every(n => p.coverage.some(c => c.toLowerCase().includes(n.toLowerCase()))));
      }

      if (candidates.length === 0) candidates = [...PLANS];
      candidates.sort((a, b) => b.rating - a.rating);
      const pick = candidates[0];

      const annualCost = pick.monthlyPrice * 12 * count;
      const matchingPromo = count >= 3 ? PROMOTIONS.find(p => p.id === "family-pack")
        : PROMOTIONS.find(p => p.id === "new-device-bundle");

      let promoHint = "";
      if (matchingPromo) {
        promoHint = ` Check out the "${matchingPromo.name}" promotion to save even more!`;
      }

      return {
        content: [{
          type: "text",
          text: `Recommendation: ${pick.name} at $${pick.monthlyPrice.toFixed(2)}/mo (${pick.rating} stars) — ${pick.description}. Covers: ${pick.coverage.join(", ")}. ${count > 1 ? `For ${count} devices: $${(pick.monthlyPrice * count).toFixed(2)}/mo.` : `Annual cost: $${annualCost.toFixed(2)}.`}${promoHint} Say "add it" to add this plan to your cart.`,
        }],
        structuredContent: {
          view: "plans",
          items: [pick],
          filter: "recommendation",
          recommendation: { pick, quantity: count, annualCost, promo: matchingPromo || undefined },
        },
      };
    }
  );

  // ─── Tool: Find Best Coverage ──────────────────────────────────────────────
  registerAppTool(
    server,
    "find_best_coverage",
    {
      title: "Find Best Coverage",
      description:
        "Analyzes the current cart and checks if a bundle, upgrade, or promotion would provide better coverage or savings. Call this automatically after plans are added. Also use when the user asks about optimizing their protection.",
      inputSchema: {},
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (_args, { _meta } = {}) => {
      const state = getSessionState(_meta);
      const cart = state.cart;
      const monthlyTotal = getMonthlyTotal(cart);
      const totalDevices = cart.reduce((sum, c) => sum + c.quantity, 0);

      if (cart.length === 0) {
        return {
          content: [{ type: "text", text: "Cart is empty — add a protection plan first, then I can find the best coverage." }],
          structuredContent: { view: "promotions", promotions: PROMOTIONS, analysis: { monthlyTotal: 0, bestOption: null, savings: 0 } },
        };
      }

      const suggestions = [];

      if (totalDevices >= 3 && !cart.some(c => c.id === "family-bundle")) {
        const familyPlan = PLANS.find(p => p.id === "family-bundle");
        const familySavings = monthlyTotal - familyPlan.monthlyPrice;
        if (familySavings > 0) {
          suggestions.push({ type: "bundle", plan: familyPlan, savings: familySavings, message: `Switch to Family Bundle and save $${familySavings.toFixed(2)}/mo` });
        }
      }

      const hasBasicOnly = cart.some(c => c.tier === "basic");
      if (hasBasicOnly) {
        const upgrade = PLANS.find(p => p.id === "standard-guard");
        suggestions.push({ type: "upgrade", plan: upgrade, savings: 0, message: `Upgrade to ${upgrade.name} for $0 deductible and theft coverage` });
      }

      const annualSaver = PROMOTIONS.find(p => p.id === "annual-saver");
      const annualSavings = monthlyTotal * 2;
      suggestions.push({ type: "promo", promo: annualSaver, savings: annualSavings, message: `Pay annually and save $${annualSavings.toFixed(2)} (2 months free)` });

      suggestions.sort((a, b) => b.savings - a.savings);
      const best = suggestions[0];

      return {
        content: [{
          type: "text",
          text: best
            ? `Your current monthly total is $${monthlyTotal.toFixed(2)}/mo. ${best.message}. ${suggestions.length > 1 ? `${suggestions.length - 1} more suggestion(s) available.` : ""}`
            : `Your monthly total is $${monthlyTotal.toFixed(2)}/mo. You've got solid coverage!`,
        }],
        structuredContent: {
          view: "promotions",
          promotions: PROMOTIONS,
          analysis: { monthlyTotal, totalDevices, suggestions, bestOption: best },
        },
      };
    }
  );

  // ─── Tool: Quick Protect ───────────────────────────────────────────────────
  registerAppTool(
    server,
    "quick_protect",
    {
      title: "Quick Protect",
      description:
        "One-shot protection: builds a complete cart based on the number of devices, types, and budget, then shows a summary ready to confirm. Use when the user says 'protect all my devices', 'I need coverage for my family', or gives a budget.",
      inputSchema: {
        device_count: z.number().int().min(1).max(10).optional()
          .describe("Number of devices to protect (default 1)"),
        device_types: z.array(z.enum(["smartphone", "tablet", "laptop", "smartwatch", "earbuds"])).optional()
          .describe("Types of devices to protect"),
        budget: z.enum(["low", "medium", "high"]).optional()
          .describe("Budget preference"),
        billing: z.enum(["monthly", "annual"]).optional()
          .describe("Billing preference (default monthly)"),
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/toolInvocation/invoking": "Building your protection bundle...",
        "openai/toolInvocation/invoked": "Protection bundle ready.",
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ device_count, device_types, budget, billing }, { _meta } = {}) => {
      const state = getSessionState(_meta);
      const cart = state.cart;
      const count = device_count || 1;
      const types = device_types || ["smartphone"];
      const billingCycle = billing || "monthly";

      cart.length = 0;

      if (count >= 3) {
        const familyPlan = PLANS.find(p => p.id === "family-bundle");
        cart.push({ ...familyPlan, quantity: 1 });
      } else {
        for (const dtype of types) {
          let candidates = PLANS.filter(p => p.deviceTypes.includes(dtype));
          if (budget === "low") candidates = candidates.filter(p => p.monthlyPrice <= 8);
          else if (budget === "medium") candidates = candidates.filter(p => p.monthlyPrice <= 15);
          if (candidates.length === 0) candidates = PLANS.filter(p => p.deviceTypes.includes(dtype));
          candidates.sort((a, b) => b.rating - a.rating);
          const best = candidates[0];
          if (best) {
            const existing = cart.find(c => c.id === best.id);
            if (existing) existing.quantity += 1;
            else cart.push({ ...best, quantity: 1 });
          }
        }
      }

      const monthlyTotal = getMonthlyTotal(cart);
      const annualTotal = monthlyTotal * 10;
      const displayTotal = billingCycle === "annual" ? annualTotal : monthlyTotal;
      const planList = cart.map(c => `${c.quantity}x ${c.name} ($${c.monthlyPrice.toFixed(2)}/mo)`).join(", ");

      return {
        content: [{
          type: "text",
          text: `Quick protection ready for ${count} device(s): ${planList}. ${billingCycle === "annual" ? `Annual total: $${annualTotal.toFixed(2)}/yr (2 months free).` : `Monthly total: $${monthlyTotal.toFixed(2)}/mo.`} Say "purchase" to activate coverage or "change" to adjust.`,
        }],
        structuredContent: {
          view: "cart",
          cartItems: cloneCart(cart),
          monthlyTotal,
          quickProtect: { deviceCount: count, billing: billingCycle, annualTotal },
        },
      };
    }
  );

  // ─── Tool: Suggest Repair Center ───────────────────────────────────────────
  registerAppTool(
    server,
    "suggest_repair_center",
    {
      title: "Suggest Best Repair Center",
      description:
        "Recommends the best authorized repair center based on rating, services, and turnaround time. Use when the user needs a repair or asks where to get their device fixed.",
      inputSchema: {
        service_needed: z.enum(["screen", "battery", "water-damage", "data-recovery", "laptop", "any"]).optional()
          .describe("Type of repair service needed (default: any)"),
        preference: z.enum(["best-rated", "fastest", "most-services"]).optional()
          .describe("How to rank centers (default: best-rated)"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ service_needed, preference }) => {
      const pref = preference || "best-rated";
      const service = service_needed || "any";

      let candidates = [...REPAIR_CENTERS];

      if (service !== "any") {
        const serviceMap = { screen: "Screen repair", battery: "Battery replacement", "water-damage": "Water damage", "data-recovery": "Data recovery", laptop: "Laptop repair" };
        const needed = serviceMap[service];
        if (needed) candidates = candidates.filter(c => c.services.includes(needed));
      }

      if (pref === "best-rated") candidates.sort((a, b) => b.rating - a.rating);
      if (pref === "fastest") candidates.sort((a, b) => a.turnaround.localeCompare(b.turnaround));
      if (pref === "most-services") candidates.sort((a, b) => b.services.length - a.services.length);

      if (candidates.length === 0) candidates = [...REPAIR_CENTERS];

      const top = candidates[0];

      return {
        content: [{
          type: "text",
          text: `Best match: ${top.name} (${top.rating} stars) at ${top.address}, ${top.city}. Turnaround: ${top.turnaround}. Services: ${top.services.join(", ")}. ${top.certified ? "Certified repair center." : ""} Want to schedule a visit?`,
        }],
        structuredContent: {
          view: "centers",
          centers: REPAIR_CENTERS,
          suggestion: { recommended: top, reason: pref },
        },
      };
    }
  );

  // ─── Tool: Purchase Protection ─────────────────────────────────────────────
  registerAppTool(
    server,
    "purchase_protection",
    {
      title: "Purchase Protection",
      description:
        "Completes the purchase and activates device protection coverage. Use when the user confirms they want to buy. Before purchasing, offer to check find_best_coverage for potential savings.",
      inputSchema: {
        billing: z.enum(["monthly", "annual"]).optional().describe("Billing cycle (default monthly)"),
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/toolInvocation/invoking": "Activating protection...",
        "openai/toolInvocation/invoked": "Protection activated.",
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ billing }, { _meta } = {}) => {
      const state = getSessionState(_meta);
      const cart = state.cart;
      if (cart.length === 0) {
        return {
          content: [{ type: "text", text: "Your cart is empty! Add a protection plan first." }],
          structuredContent: { view: "error", message: "Cart is empty." },
        };
      }
      const billingCycle = billing || "monthly";
      const monthlyTotal = getMonthlyTotal(cart);
      const annualTotal = monthlyTotal * 10;
      const displayTotal = billingCycle === "annual" ? annualTotal : monthlyTotal;
      const totalDevices = cart.reduce((sum, c) => sum + c.quantity, 0);
      const policyId = `SH-${Date.now().toString(36).toUpperCase()}`;
      const startDate = new Date().toISOString().split("T")[0];
      const coverageItems = [...cart];

      state.lastPolicy = { policyId, items: coverageItems, monthlyTotal, date: new Date().toISOString() };
      cart.length = 0;

      return {
        content: [
          {
            type: "text",
            text: `Policy ${policyId} activated! ${totalDevices} device(s) now protected. ${billingCycle === "annual" ? `Annual cost: $${annualTotal.toFixed(2)}/yr.` : `Monthly cost: $${monthlyTotal.toFixed(2)}/mo.`} Coverage starts ${startDate}.`,
          },
        ],
        structuredContent: {
          view: "confirmation",
          policyId,
          items: coverageItems,
          monthlyTotal,
          annualTotal,
          displayTotal,
          billing: billingCycle,
          startDate,
          totalDevices,
        },
      };
    }
  );

  return server;
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 8080);

const sseSessions = new Map();

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    setCors(res);
    res.writeHead(204).end();
    return;
  }

  setCors(res);

  if (url.pathname === "/sse" && req.method === "GET") {
    try {
      const server = createShieldHubServer();
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

  if (url.pathname === "/mcp" && req.method === "POST") {
    try {
      const server = createShieldHubServer();
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

  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        app: "shieldhub",
        version: "1.0.0",
        endpoints: { mcp: "/mcp", sse: "/sse", messages: "/messages", health: "/health", widget: "/widget" },
      })
    );
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", sessions: sessionStateStore.size }));
    return;
  }

  if (url.pathname === "/widget" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(widgetHtml);
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`\n  🛡️  ShieldHub MCP server running!\n`);
  console.log(`  Local:    http://0.0.0.0:${port}`);
  console.log(`  SSE:      http://0.0.0.0:${port}/sse`);
  console.log(`  MCP:      http://0.0.0.0:${port}/mcp\n`);
});
