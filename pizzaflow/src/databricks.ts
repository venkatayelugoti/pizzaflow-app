import { DBSQLClient } from '@databricks/sql';

const host = process.env.DATABRICKS_HOST || '';
const httpPath = process.env.DATABRICKS_HTTP_PATH || '';
const token = process.env.DATABRICKS_TOKEN || '';

export function isDatabricksConfigured(): boolean {
  return !!(host && httpPath && token);
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
  if (!isDatabricksConfigured()) {
    throw new Error('Databricks configuration is missing. Please set DATABRICKS_HOST, DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN.');
  }

  const client = new DBSQLClient();

  try {
    const session: any = await client.connect({
      host,
      path: httpPath,
      token,
    });

    const escapeStr = (val: string) => val.replace(/'/g, "''");
    const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format 'YYYY-MM-DD HH:MM:SS'

    const tableName = process.env.DATABRICKS_TABLE || 'colabresult';
    const schemaName = process.env.DATABRICKS_SCHEMA || 'colab';
    const fullTableName = `${schemaName}.${tableName}`;

    const sqlQuery = `INSERT INTO ${fullTableName} (
      Timestamp, Customer, Phone, Base, Base_Price, Pizza, Pizza_Price, 
      Topping, Topping_Price, Quantity, Unit_Price, Subtotal, Discount, GST, Total, Payment_Mode
    ) VALUES (
      TIMESTAMP('${timestampStr}'),
      '${escapeStr(order.customer)}',
      '${escapeStr(order.phone)}',
      '${escapeStr(order.base)}',
      ${order.basePrice},
      '${escapeStr(order.pizza)}',
      ${order.pizzaPrice},
      '${escapeStr(order.topping)}',
      ${order.toppingPrice},
      ${order.quantity},
      ${order.unitPrice},
      ${order.subtotal},
      ${order.discount},
      ${order.gst},
      ${order.total},
      '${escapeStr(order.paymentMode)}'
    )`;

    const queryOperation = await session.executeStatement(sqlQuery, { runAsync: false });
    await queryOperation.close();
    await session.close();
  } finally {
    await client.close();
  }
}
