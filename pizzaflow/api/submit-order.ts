import { createClient } from "@supabase/supabase-js";
import {
  validateOrderInput,
  calculateBill,
  BASES,
  PIZZAS,
  TOPPINGS,
} from "../src/types";
import {
  insertOrderToDatabricks,
  isDatabricksConfigured,
} from "../src/databricks";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { customer, phone, base, pizza, topping, quantity, paymentMode } =
      req.body;

    const validationError = validateOrderInput({
      customer,
      phone,
      base,
      pizza,
      topping,
      quantity,
      paymentMode,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const baseItem = BASES.find((b) => b.name === base);
    const pizzaItem = PIZZAS.find((p) => p.name === pizza);
    const toppingItem = TOPPINGS.find((t) => t.name === topping);

    if (!baseItem || !pizzaItem || !toppingItem) {
      return res.status(400).json({
        success: false,
        error: "Invalid base, pizza, or topping selected.",
      });
    }

    const bill = calculateBill(
      baseItem.price,
      pizzaItem.price,
      toppingItem.price,
      Number(quantity)
    );

    let databricksStatus: "SUCCESS" | "FAILED" = "SUCCESS";
    let errorMessage: string | null = null;

    try {
      if (!isDatabricksConfigured()) {
        throw new Error("Databricks environment variables are missing.");
      }

      await insertOrderToDatabricks({
        customer: customer.trim(),
        phone,
        base,
        basePrice: baseItem.price,
        pizza,
        pizzaPrice: pizzaItem.price,
        topping,
        toppingPrice: toppingItem.price,
        quantity: Number(quantity),
        unitPrice: bill.unitPrice,
        subtotal: bill.subtotal,
        discount: bill.discount,
        gst: bill.gst,
        total: bill.total,
        paymentMode,
      });
    } catch (dbError: any) {
      databricksStatus = "FAILED";
      errorMessage = dbError.message || "Databricks insert failed.";
    }

    let auditRecord = null;

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("pizzaflow_order_audit")
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

      if (!error) {
        auditRecord = data;
      }
    }

    if (databricksStatus === "FAILED") {
      return res.status(200).json({
        success: false,
        warning: "Audit saved, but Databricks insert failed.",
        error: errorMessage,
        bill,
        auditRecord,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order inserted into Databricks successfully.",
      bill,
      auditRecord,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}
