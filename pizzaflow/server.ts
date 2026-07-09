import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { validateOrderInput, calculateBill, BASES, PIZZAS, TOPPINGS } from './src/types.js';
import { insertOrderToDatabricks, isDatabricksConfigured } from './src/databricks.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase Admin inside server to avoid exposing SUPABASE_SERVICE_ROLE_KEY to the client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

// Get recent orders from the audit table
app.get('/api/orders', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(200).json({
        success: true,
        orders: [],
        warning: 'Supabase Admin client not initialized. Using empty local orders array.'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('pizzaflow_order_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching audit records:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, orders: data || [] });
  } catch (error: any) {
    console.error('Get orders catch:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Submit pizza order endpoint
app.post('/api/submit-order', async (req, res) => {
  const { customer, phone, base, pizza, topping, quantity, paymentMode } = req.body;

  try {
    // 1. Validate input data on the backend
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
      return res.status(400).json({ success: false, error: validationError });
    }

    // Find select item details to compute bill correctly
    const baseItem = BASES.find((b) => b.name === base)!;
    const pizzaItem = PIZZAS.find((p) => p.name === pizza)!;
    const toppingItem = TOPPINGS.find((t) => t.name === topping)!;

    // 2. Recalculate bill on the backend
    const bill = calculateBill(
      baseItem.price,
      pizzaItem.price,
      toppingItem.price,
      Number(quantity)
    );

    let databricksStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let errorMessage: string | null = null;

    // 3. Attempt insert to Databricks
    try {
      if (isDatabricksConfigured()) {
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
      } else {
        throw new Error('Databricks server environment variables are not set.');
      }
    } catch (dbError: any) {
      console.error('Databricks insertion failed:', dbError.message);
      databricksStatus = 'FAILED';
      errorMessage = dbError.message || 'Unknown Databricks error';
    }

    // 4. Create an audit record in Supabase
    let supabaseRecord = null;
    if (supabaseAdmin) {
      const { data, error: auditError } = await supabaseAdmin
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

      if (auditError) {
        console.error('Supabase Audit Insertion Error:', auditError.message);
      } else {
        supabaseRecord = data;
      }
    } else {
      console.warn('Supabase Admin client is not configured; skipped audit recording.');
    }

    // 5. Response handling
    if (databricksStatus === 'FAILED') {
      return res.status(200).json({
        success: false,
        warning: 'Order saved in audit log, but Databricks insertion failed.',
        error: errorMessage,
        bill,
        auditRecord: supabaseRecord,
      });
    }

    return res.json({
      success: true,
      message: 'Order placed successfully and recorded in Databricks!',
      bill,
      auditRecord: supabaseRecord,
    });

  } catch (error: any) {
    console.error('Order Submission Core Fail:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Configure Vite middleware or production static folder serving
async function configureApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PizzaFlow server running on http://localhost:${PORT}`);
  });
}

configureApp();
