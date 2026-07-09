import { DBSQLClient } from "@databricks/sql";

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
  const httpPath = process.env.DATABRICKS_HTTP_PATH;
  const token = process.env.DATABRICKS_TOKEN;
  const schemaName = process.env.DATABRICKS_SCHEMA || "colab";
  const tableName = process.env.DATABRICKS_TABLE || "colabresult";

  if (!host || !httpPath || !token) {
    throw new Error(
      "Databricks environment variables are missing. Check DATABRICKS_HOST, DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN in Vercel."
    );
  }

  const client = new DBSQLClient();

  try {
    await client.connect({
      host,
      path: httpPath,
      token,
    });

    const session = await client.openSession();

    const sqlQuery = `
      INSERT INTO ${schemaName}.${tableName}
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
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `;

    const operation = await session.executeStatement(sqlQuery, {
      runAsync: false,
      parameters: [
        order.customer,
        order.phone,
        order.base,
        order.basePrice,
        order.pizza,
        order.pizzaPrice,
        order.topping,
        order.toppingPrice,
        order.quantity,
        order.unitPrice,
        order.subtotal,
        order.discount,
        order.gst,
        order.total,
        order.paymentMode,
      ],
    });

    await operation.close();
    await session.close();
  } finally {
    await client.close();
  }
}
