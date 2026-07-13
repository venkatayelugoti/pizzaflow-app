import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: "Supabase environment variables are missing",
        hasUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("pizzaflow_order_audit")
      .insert({
        customer: "Vercel Test User",
        phone: "9876543210",
        total: 100,
        payment_mode: "UPI",
        databricks_status: "TEST",
        error_message: null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supabase insert from Vercel is working",
      record: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Unexpected server error",
    });
  }
}
