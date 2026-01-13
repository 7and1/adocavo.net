import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const metrics = sqliteTable(
  "metrics",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    value: integer("value").notNull(),
    timestamp: integer("timestamp", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    tags: text("tags", { mode: "json" }),
  },
  (table) => ({
    typeIdx: index("metrics_type_idx").on(table.type),
    nameIdx: index("metrics_name_idx").on(table.name),
    timestampIdx: index("metrics_timestamp_idx").on(table.timestamp),
    typeTimestampIdx: index("metrics_type_timestamp_idx").on(
      table.type,
      table.timestamp,
    ),
  }),
);

export const alerts = sqliteTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    threshold: integer("threshold").notNull(),
    triggered: integer("triggered", { mode: "boolean" })
      .default(false)
      .notNull(),
    lastTriggered: integer("last_triggered", { mode: "timestamp" }),
    lastCleared: integer("last_cleared", { mode: "timestamp" }),
    currentValue: integer("current_value"),
    metadata: text("metadata", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameIdx: index("alerts_name_idx").on(table.name),
    triggeredIdx: index("alerts_triggered_idx").on(table.triggered),
  }),
);
