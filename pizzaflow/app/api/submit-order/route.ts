import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DBSQLClient } from '@databricks/sql';

// PizzaFlow Pricing Config
const BASES = [
  { name: 'Thin Crust', price: 50 },
  { name: 'Cheese Burst', price: 90 },
  { name: 'Pan Base', price: 70 },
];

const PIZZAS = [
  { name: 'Margherita', price: 150 },
  { name: 'Farmhouse', price: 220 },
  { name: 'Paneer Pizza', price: 250 },
];

const TOPPINGS = [
  { name: 'Extra Cheese', price: 40 },
  { name: 'Olives', price: 30 },
  { name: 'Jalapeno', price: 35 },
];

const PAYMENT_MODES = ['Cash', 'Card', 'UPI'];

function calculateBill(basePrice: number, pizzaPrice: number, toppingPrice: number, quantity: number) {
  const unitPrice = basePrice + pizzaPrice + toppingPrice;
  const subtotal = unitPrice * quantity;
  const discount = quantity >= 5 ? Math.round(subtotal * 0.10 * 100) / 100 : 0;
  const taxableAmount = subtotal - discount;
  const gst = Math.round(taxableAmount * 0.18 * 100) / 100;
  const total = Math.round((taxableAmount + gst) * 100) / 100;

  return {
    unitPrice,
    subtotal,
    discount,
    gst,
    total,
  };
}

function validateOrderInput(order: any): string | null {
  if (!order.customer || typeof order.customer !== 'string') {
    return 'Customer name is required.';
  }
  const cleanName = order.customer.trim();
  if (cleanName.length < 2 || cleanName.length > 40) {
    return 'Customer name must be between 2 and 40 characters.';
  }
  if (!/^[a-zA-Z\s]+$/.test(cleanName)) {
    return 'Customer name can only contain letters and spaces.';
  }

  if (!order.phone || typeof order.phone !== 'string') {
    return 'Phone number is required.';
  }
  if (!/^[6-9]\d{9}$/.test(order.phone)) {
    return 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.';
  }

  if (order.quantity === undefined || order.quantity === null) {
    return 'Quantity is required.';
  }
  const qty = Number(order.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    return 'Quantity must be an integer between 1 and 10.';
  }

  const baseItem = BASES.find((b) => b.name === order.base);
  if (!baseItem) {
    return `Invalid base selected: ${order.base}`;
  }

  const pizzaItem = PIZZAS.find((p) => p.name === order.pizza);
  if (!pizzaItem) {
    return `Invalid pizza selected: ${order.pizza}`;
  }

  const toppingItem = TOPPINGS.find((t) => t.name === order.topping);
  if (!toppingItem) {
    return `Invalid topping selected: ${order.topping}`;
  }

  if (!order.paymentMode || !PAYMENT_MODES.includes(order.paymentMode)) {
    return `Invalid payment mode selected: ${order.paymentMode}`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, phone, base, pizza, topping, quantity, paymentMode } = body;

    // 1. Backend Input Validation
    const validationError = validateOrderInput(body);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const baseItem = BASES.find((b) => b.name === base)!;
    const pizzaItem = PIZZAS.find((p) => p.name === pizza)!;
    const toppingItem = TOPPINGS.find((t) => t.name === topping)!;

    // 2. Backend Pricing Recalculation
    const bill = calculateBill(
      baseItem.price,
      pizzaItem.price,
      toppingItem.price,
      Number(quantity)
    );

    let databricksStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let errorMessage: string | null = null;

    // 3. Insert order into Databricks table colab.colabresult
    const host = process.env.DATABRICKS_HOST;
    const httpPath = process.env.DATABRICKS_HTTP_PATH;
    const token = process.env.DATABRICKS_TOKEN;
    const schema = process.env.DATABRICKS_SCHEMA || 'colab';
    const table = process.env.DATABRICKS_TABLE || 'colabresult';

    if (host && httpPath && token) {
      const client = new DBSQLClient();
      try {
        const session = await client.connect({ host, path: httpPath, token });
        const escapeStr = (val: string) => val.replace(/'/g, "''");
        const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const sqlQuery = `INSERT INTO ${schema}.${table} (
          Timestamp, Customer, Phone, Base, Base_Price, Pizza, Pizza_Price, 
          Topping, Topping_Price, Quantity, Unit_Price, Subtotal, Discount, GST, Total, Payment_Mode
        ) VALUES (
          TIMESTAMP('${timestampStr}'),
          '${escapeStr(customer.trim())}',
          '${escapeStr(phone.trim())}',
          '${escapeStr(base)}',
          ${baseItem.price},
          '${escapeStr(pizza)}',
          ${pizzaItem.price},
          '${escapeStr(topping)}',
          ${toppingItem.price},
          ${Number(quantity)},
          ${bill.unitPrice},
          ${bill.subtotal},
          ${bill.discount},
          ${bill.gst},
          ${bill.total},
          '${escapeStr(paymentMode)}'
        )`;

        const queryOperation = await session.executeStatement(sqlQuery, { runAsync: false });
        await queryOperation.close();
        await session.close();
        await client.close();
      } catch (dbError: any) {
        console.error('Next.js Databricks Insert Error:', dbError);
        databricksStatus = 'FAILED';
        errorMessage = dbError.message || 'Unknown Databricks error';
      }
    } else {
      console.warn('Next.js Databricks environment variables missing; skipping insert.');
      databricksStatus = 'FAILED';
      errorMessage = 'Databricks environment variables are missing.';
    }

    // 4. Insert Audit Log into Supabase table pizzaflow_order_audit
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    let supabaseRecord = null;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error: supabaseError } = await supabase
        .from('pizzaflow_order_audit')
        .insert({
          customer: customer.trim(),
          phone,
          total: bill.total,
          payment_mode: paymentMode,
          databricks_status: databricksStatus,
          error_message: errorMessage,
        })
        .select()
        .single();

      if (supabaseError) {
        console.error('Next.js Supabase Audit Log error:', supabaseError);
      } else {
        supabaseRecord = data;
      }
    } else {
      console.warn('Next.js Supabase config missing; skipping audit log entry.');
    }

    if (databricksStatus === 'FAILED') {
      return NextResponse.json({
        success: false,
        warning: 'Order captured in Supabase, but Databricks pipeline failed.',
        error: errorMessage,
        bill,
        auditRecord: supabaseRecord,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pizza order processed, stored, and audited successfully!',
      bill,
      auditRecord: supabaseRecord,
    });

  } catch (error: any) {
    console.error('Next.js POST API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
