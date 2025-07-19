// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  dateOptions;
  subscriptions;
  currentUserId;
  currentDateOptionId;
  currentSubscriptionId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.dateOptions = /* @__PURE__ */ new Map();
    this.subscriptions = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentDateOptionId = 1;
    this.currentSubscriptionId = 1;
    this.initializeDefaultOptions();
  }
  initializeDefaultOptions() {
    const defaultOptions = [
      { label: "Movie Night", weight: 1, color: "#D4A574", isDefault: true },
      { label: "Candlelight Dinner", weight: 1, color: "#E8C5A0", isDefault: true },
      { label: "Board Game & Wine", weight: 1, color: "#C8956D", isDefault: true },
      { label: "Stargazing", weight: 1, color: "#B8926A", isDefault: true },
      { label: "Cook Together", weight: 1, color: "#DBA995", isDefault: true }
    ];
    defaultOptions.forEach((option) => {
      const id = this.currentDateOptionId++;
      const dateOption = {
        id,
        label: option.label,
        weight: option.weight,
        color: option.color,
        isDefault: option.isDefault
      };
      this.dateOptions.set(id, dateOption);
    });
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async getAllDateOptions() {
    return Array.from(this.dateOptions.values());
  }
  async createDateOption(insertOption) {
    const id = this.currentDateOptionId++;
    const option = {
      id,
      label: insertOption.label,
      weight: insertOption.weight,
      color: insertOption.color,
      isDefault: false
    };
    this.dateOptions.set(id, option);
    return option;
  }
  async updateDateOption(id, updateData) {
    const existing = this.dateOptions.get(id);
    if (!existing) return void 0;
    const updated = { ...existing, ...updateData };
    this.dateOptions.set(id, updated);
    return updated;
  }
  async deleteDateOption(id) {
    return this.dateOptions.delete(id);
  }
  async createSubscription(insertSubscription) {
    const id = this.currentSubscriptionId++;
    const subscription = { ...insertSubscription, id };
    this.subscriptions.set(id, subscription);
    return subscription;
  }
  async getSubscriptionByEmail(email) {
    return Array.from(this.subscriptions.values()).find(
      (sub) => sub.email === email
    );
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var dateOptions = pgTable("date_options", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  weight: integer("weight").notNull().default(1),
  color: text("color").notNull().default("#DEB887"),
  isDefault: boolean("is_default").default(false)
});
var subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertDateOptionSchema = createInsertSchema(dateOptions).pick({
  label: true,
  weight: true,
  color: true
}).required();
var insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  name: true,
  email: true
});

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/date-options", async (req, res) => {
    try {
      const options = await storage.getAllDateOptions();
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch date options" });
    }
  });
  app2.post("/api/date-options", async (req, res) => {
    try {
      const validatedData = insertDateOptionSchema.parse(req.body);
      const option = await storage.createDateOption(validatedData);
      res.status(201).json(option);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create date option" });
      }
    }
  });
  app2.patch("/api/date-options/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDateOptionSchema.partial().parse(req.body);
      const option = await storage.updateDateOption(id, validatedData);
      if (!option) {
        res.status(404).json({ message: "Date option not found" });
        return;
      }
      res.json(option);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update date option" });
      }
    }
  });
  app2.delete("/api/date-options/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDateOption(id);
      if (!deleted) {
        res.status(404).json({ message: "Date option not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete date option" });
    }
  });
  app2.post("/api/subscriptions", async (req, res) => {
    try {
      const validatedData = insertSubscriptionSchema.parse(req.body);
      const existing = await storage.getSubscriptionByEmail(validatedData.email);
      if (existing) {
        res.status(409).json({ message: "Email already subscribed" });
        return;
      }
      const subscription = await storage.createSubscription(validatedData);
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create subscription" });
      }
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
