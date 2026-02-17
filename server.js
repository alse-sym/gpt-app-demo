import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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

// ─── In-memory Cart (per session) ───────────────────────────────────────────
const carts = new Map();

function getCart(sessionId) {
  if (!carts.has(sessionId)) carts.set(sessionId, []);
  return carts.get(sessionId);
}

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
        "Shows the full Pizzaz pizza menu with prices, descriptions, and ratings. Use when the user wants to see what pizzas are available.",
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
        "Shows today's deals and combo specials with discounted prices. Use when the user asks about deals, specials, or wants to save money.",
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
        "Adds a pizza to the shopping cart. Use when the user wants to order a specific pizza.",
      inputSchema: {
        item_id: z.string().describe("The pizza ID to add (e.g. 'margherita', 'pepperoni')"),
        quantity: z.number().int().min(1).max(10).optional().describe("How many to add (default 1)"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ item_id, quantity }, extra) => {
      const sessionId = extra?.sessionId || "default";
      const pizza = MENU.find((p) => p.id === item_id);
      if (!pizza) {
        return {
          content: [{ type: "text", text: `Pizza "${item_id}" not found on the menu.` }],
          structuredContent: { view: "error", message: `Pizza "${item_id}" not found.` },
        };
      }
      const cart = getCart(sessionId);
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
    async (_args, extra) => {
      const sessionId = extra?.sessionId || "default";
      const cart = getCart(sessionId);
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

  // ─── Tool: Place Order ─────────────────────────────────────────────────
  registerAppTool(
    server,
    "place_order",
    {
      title: "Place Order",
      description:
        "Completes the checkout and places the order for delivery. Use when the user confirms they want to order.",
      inputSchema: {
        store_id: z.string().optional().describe("Preferred store ID for pickup. Omit for delivery."),
        tip_percent: z.number().min(0).max(100).optional().describe("Tip percentage (default 18%)"),
      },
      _meta: { ui: { resourceUri: WIDGET_URI } },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ store_id, tip_percent }, extra) => {
      const sessionId = extra?.sessionId || "default";
      const cart = getCart(sessionId);
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

      // Clear cart after order
      carts.set(sessionId, []);

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
          items: cart,
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
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host ?? "localhost"}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    });
    res.end();
    return;
  }

  // MCP endpoint
  if (url.pathname === MCP_PATH) {
    // Only POST carries MCP JSON-RPC messages; GET without SSE accept is a probe
    if (req.method === "GET") {
      const accept = req.headers.accept || "";
      if (!accept.includes("text/event-stream")) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ status: "ok", app: "pizzaz-shop", mcp: true }));
        return;
      }
    }

    if (req.method === "GET" || req.method === "POST") {
      try {
        const server = createPizzazServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        res.setHeader("Access-Control-Allow-Origin", "*");
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (err) {
        console.error("MCP error:", err);
        if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
      }
      return;
    }
  }

  // Health check
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
  console.log(`  MCP:      http://0.0.0.0:${port}${MCP_PATH}\n`);
});
