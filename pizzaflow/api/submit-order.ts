import { createClient } from "@supabase/supabase-js";

const BASES = [
  { name: "Thin Crust", price: 50 },
  { name: "Cheese Burst", price: 90 },
  { name: "Pan Base", price: 70 },
];

const PIZZAS = [
  { name: "Margherita", price: 150 },
  { name: "Farmhouse", price: 220 },
  { name: "Paneer Pizza", price: 250 },
];

const TOPPINGS = [
  { name: "Extra Cheese", price: 40 },
  { name: "Olives", price: 30 },
  { name: "Jalapeno", price: 35 },
];

function escapeSql(value: string) {
  return String(value).replace(/'/g, "''");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { customer, phone, base, pizza, topping, quantity, paymentMode } = req.body;

    if (!customer || !/^[A-Za-z ]{2,40}$/.test(customer.trim())) {
      return res.status(400).json({ success: false, error: "Invalid customer name" });
    }

    if (!phone || !/^[6-9][0-9]{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      return res.status(400).json({ success: false, error: "Invalid quantity" });
    }

    if (!["Cash", "Card", "UPI"].includes(paymentMode)) {
      return res.status(400).json({ success: false, error: "Invalid payment mode" });
    }

    const baseItem = BASES.find(x => x.name === base);
    const pizzaItem = PIZZAS.find(x => x.name === pizza);
    const toppingItem = TOPPINGS.find(x => x.name === topping);

    if (!baseItem || !pizzaItem || !toppingItem) {
      return res.status(400).json({ success: false, error: "Invalid menu selection" });
    }

    const unitPrice = baseItem.price + pizzaItem.price + toppingItem.price;
    const subtotal = unitPrice * qty;
    const discount = qty >= 5 ? subtotal * 0.10 : 0;
    const gst = (subtotal - discount) * 0.18;
    const total = subtotal - discount + gst;

    const host = process.env.DATABRICKS_HOST;
    const token = process.env.DATABRICKS_TOKEN;
    const warehouseId = process.env.DATABRICKS_WAREHOUSE_ID || "9de14c2adfac5b39";
    const schemaName = process.env.DATABRICKS_SCHEMA || "colab";
    const tableName = process.env.DATABRICKS_TABLE || "colabresult";

    if (!host || !token) {
      throw new Error("Databricks environment variables missing");
    }

    const statement = `
      INSERT INTO ${schemaName}.${tableName}
      (
        Timestamp, Customer, Phone, Base, Base_Price, Pizza, Pizza_Price,
        Topping, Topping_Price, Quantity, Unit_Price, Subtotal,
        Discount, GST, Total, Payment_Mode
      )
      VALUES
      (
        current_timestamp(),
        '${escapeSql(customer.trim())}',
        '${escapeSql(phone)}',
        '${escapeSql(base)}',
        ${baseItem.price},
        '${escapeSql(pizza)}',
        ${pizzaItem.price},
        '${escapeSql(topping)}',
        ${toppingItem.price},
        ${qty},
        ${unitPrice},
        ${subtotal},
        ${discount},
        ${gst},
        ${total},
        '${escapeSql(paymentMode)}'
      )
    `;

    const dbResponse = await fetch(`https://${host}/api/2.0/sql/statements`, {
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

    const dbResult = await dbResponse.json();

    if (!dbResponse.ok || dbResult.status?.state === "FAILED") {
      throw new Error(dbResult.message || dbResult.status?.error?.message || "Databricks insert failed");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("pizzaflow_order_audit").insert({
        customer: customer.trim(),
        phone,
        total,
        payment_mode: paymentMode,
        databricks_status: "SUCCESS",
        error_message: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order inserted successfully",
      bill: { unitPrice, subtotal, discount, gst, total },
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
}
