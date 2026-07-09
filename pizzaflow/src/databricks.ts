export function isDatabricksConfigured(): boolean {
  return !!(
    process.env.DATABRICKS_HOST &&
    process.env.DATABRICKS_HTTP_PATH &&
    process.env.DATABRICKS_TOKEN
  );
}

export async function insertOrderToDatabricks(order: {
  customer: string;
  phone: string;
  base: string;
  basePrice: number;
  pizza: string;
  pizzaPrice: number;
  topping: string;
  toppingPrice: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  paymentMode: string;
}): Promise<void> {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const schemaName = process.env.DATABRICKS_SCHEMA || "colab";
  const tableName = process.env.DATABRICKS_TABLE || "colabresult";
  const warehouseId = process.env.DATABRICKS_WAREHOUSE_ID || "9de14c2adfac5b39";

  if (!host || !token) {
    throw new Error("Databricks host/token missing in Vercel environment variables.");
  }

  const fullTableName = `${schemaName}.${tableName}`;

  const statement = `
    INSERT INTO ${fullTableName}
    (
      Timestamp,
      Customer,
      Phone,
      Base,
      Base_Price,
      Pizza,
      Pizza_Price,
      Topping,
      Topping_Price,
      Quantity,
      Unit_Price,
      Subtotal,
      Discount,
      GST,
      Total,
      Payment_Mode
    )
    VALUES
    (
      current_timestamp(),
      '${escapeSql(order.customer)}',
      '${escapeSql(order.phone)}',
      '${escapeSql(order.base)}',
      ${order.basePrice},
      '${escapeSql(order.pizza)}',
      ${order.pizzaPrice},
      '${escapeSql(order.topping)}',
      ${order.toppingPrice},
      ${order.quantity},
      ${order.unitPrice},
      ${order.subtotal},
      ${order.discount},
      ${order.gst},
      ${order.total},
      '${escapeSql(order.paymentMode)}'
    )
  `;

  const response = await fetch(`https://${host}/api/2.0/sql/statements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      statement,
      wait_timeout: "30s",
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Databricks REST API insert failed.");
  }

  if (result.status?.state === "FAILED") {
    throw new Error(result.status?.error?.message || "Databricks SQL statement failed.");
  }
}

function escapeSql(value: string): string {
  return String(value).replace(/'/g, "''");
}
