export interface PizzaOrder {
  customer: string;
  phone: string;
  base: string;
  basePrice: number;
  pizza: string;
  pizzaPrice: number;
  topping: string;
  toppingPrice: number;
  quantity: number;
  paymentMode: string;
}

export interface OrderBill {
  unitPrice: number;
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
}

export interface AuditRecord {
  id: string;
  customer: string;
  phone: string;
  total: number;
  payment_mode: string;
  databricks_status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error_message: string | null;
  created_at: string;
}

export const BASES = [
  { id: 'thin', name: 'Thin Crust', price: 50 },
  { id: 'cheese', name: 'Cheese Burst', price: 90 },
  { id: 'pan', name: 'Pan Base', price: 70 },
];

export const PIZZAS = [
  { id: 'margherita', name: 'Margherita', price: 150 },
  { id: 'farmhouse', name: 'Farmhouse', price: 220 },
  { id: 'paneer', name: 'Paneer Pizza', price: 250 },
];

export const TOPPINGS = [
  { id: 'extra_cheese', name: 'Extra Cheese', price: 40 },
  { id: 'olives', name: 'Olives', price: 30 },
  { id: 'jalapeno', name: 'Jalapeno', price: 35 },
];

export const PAYMENT_MODES = ['Cash', 'Card', 'UPI'] as const;

export function validateOrderInput(order: Partial<PizzaOrder>): string | null {
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

  if (!order.paymentMode || !PAYMENT_MODES.includes(order.paymentMode as any)) {
    return `Invalid payment mode selected: ${order.paymentMode}`;
  }

  return null;
}

export function calculateBill(basePrice: number, pizzaPrice: number, toppingPrice: number, quantity: number): OrderBill {
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
