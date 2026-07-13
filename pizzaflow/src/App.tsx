import React, { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import ChatBot from "./components/ChatBot";
import { 
  Pizza, 
  User, 
  Phone, 
  Layers, 
  Sparkles, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ShoppingCart, 
  Calculator, 
  History, 
  AlertCircle,
  Database,
  FileCheck
} from 'lucide-react';
import { BASES, PIZZAS, TOPPINGS, PAYMENT_MODES, calculateBill, validateOrderInput, OrderBill, AuditRecord } from './types';

export default function App() {
  // Form states
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBase, setSelectedBase] = useState(BASES[0].name);
  const [selectedPizza, setSelectedPizza] = useState(PIZZAS[0].name);
  const [selectedTopping, setSelectedTopping] = useState(TOPPINGS[0].name);
  const [quantity, setQuantity] = useState('1');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');

  // Calculation and feedback states
  const [bill, setBill] = useState<OrderBill | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Recent orders
  const [recentOrders, setRecentOrders] = useState<AuditRecord[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Load recent orders from Express backend API
  const fetchRecentOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setRecentOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to load recent orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  // Compute live bill values as user changes selection (Instant reactive billing!)
  const getSelectedPrices = () => {
    const baseObj = BASES.find(b => b.name === selectedBase);
    const pizzaObj = PIZZAS.find(p => p.name === selectedPizza);
    const toppingObj = TOPPINGS.find(t => t.name === selectedTopping);
    return {
      basePrice: baseObj ? baseObj.price : 0,
      pizzaPrice: pizzaObj ? pizzaObj.price : 0,
      toppingPrice: toppingObj ? toppingObj.price : 0
    };
  };

  const { basePrice, pizzaPrice, toppingPrice } = getSelectedPrices();
  const currentBill = calculateBill(basePrice, pizzaPrice, toppingPrice, Number(quantity) || 1);

  // Validation function
  const validateForm = (showError = false) => {
    const error = validateOrderInput({
      customer,
      phone,
      base: selectedBase,
      pizza: selectedPizza,
      topping: selectedTopping,
      quantity: quantity === '' ? undefined : Number(quantity),
      paymentMode
    });
    if (showError) {
      setValidationError(error);
    }
    return !error;
  };

  // Run validation on live inputs as they change
  useEffect(() => {
    if (customer || phone || quantity !== '1') {
      validateForm(true);
    }
  }, [customer, phone, selectedBase, selectedPizza, selectedTopping, quantity, paymentMode]);

  const handleCalculateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) {
      return;
    }
    setBill(currentBill);
    setSuccessMessage(null);
    setErrorMessage(null);
    setWarningMessage(null);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear feedback states
    setSuccessMessage(null);
    setErrorMessage(null);
    setWarningMessage(null);

    if (!validateForm(true)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/submit-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customer.trim(),
          phone: phone.trim(),
          base: selectedBase,
          pizza: selectedPizza,
          topping: selectedTopping,
          quantity: Number(quantity),
          paymentMode,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage(result.message || 'Order submitted successfully!');
        setBill(result.bill);
        // Reset order form keeping customer details for faster checkout if requested,
        // but let's reset to defaults as specified.
        handleReset();
        fetchRecentOrders();
      } else {
        // Handled warning states gracefully (e.g. Supabase recorded but Databricks failed)
        if (result.warning) {
          setWarningMessage(result.warning);
          if (result.bill) setBill(result.bill);
          fetchRecentOrders();
        } else {
          setErrorMessage(result.error || 'Failed to submit order. Please check inputs.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while placing order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCustomer('');
    setPhone('');
    setSelectedBase(BASES[0].name);
    setSelectedPizza(PIZZAS[0].name);
    setSelectedTopping(TOPPINGS[0].name);
    setQuantity('1');
    setPaymentMode('Cash');
    setValidationError(null);
    setBill(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#2D2D2D] font-sans flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 md:px-8 bg-white border-b-4 border-[#FF6B6B] shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
              <Pizza size={24} className="animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-[#2D2D2D]">
              PIZZA<span className="text-[#FF6B6B]">FLOW</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="bg-[#FFE66D] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-[#4A4A4A] shadow-sm border border-[#2D2D2D]">
              Store: Downtown High-Oven
            </div>
            <div className="bg-[#4ECDC4] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-sm border border-[#2D2D2D]">
              Status: Kitchen Open
            </div>
          </div>
        </header>

        {/* Info alerts about configuration */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white border-4 border-[#2D2D2D] rounded-2xl flex items-start gap-3 shadow-[4px_4px_0_0_#2D2D2D]">
            <Database className="text-[#FF6B6B] shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-extrabold text-[#2D2D2D] text-sm uppercase">Databricks Integration</h4>
              <p className="text-[#4A4A4A] text-xs mt-1 leading-relaxed">
                Inserts core analytical record into the <code className="bg-amber-100/80 px-1.5 py-0.5 rounded text-[#2D2D2D] font-mono font-bold border border-[#2D2D2D]/10">colab.colabresult</code> table in real-time.
              </p>
            </div>
          </div>
          <div className="p-4 bg-white border-4 border-[#2D2D2D] rounded-2xl flex items-start gap-3 shadow-[4px_4px_0_0_#2D2D2D]">
            <FileCheck className="text-[#4ECDC4] shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-extrabold text-[#2D2D2D] text-sm uppercase">Supabase Audit Pipeline</h4>
              <p className="text-[#4A4A4A] text-xs mt-1 leading-relaxed">
                Logs transactional audit statuses inside the <code className="bg-blue-100/80 px-1.5 py-0.5 rounded text-[#2D2D2D] font-mono font-bold border border-[#2D2D2D]/10">pizzaflow_order_audit</code> table.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications and main Layout container */}
        <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6">
          {/* Success/Warning/Error Notifications */}
          {successMessage && (
            <div className="p-4 bg-[#E8F8F5] border-4 border-[#2D2D2D] rounded-2xl flex items-center gap-3 text-[#2D2D2D] shadow-[4px_4px_0_0_#2D2D2D] animate-fade-in" id="success-alert">
              <CheckCircle className="text-[#4ECDC4] shrink-0" size={24} />
              <div>
                <p className="font-extrabold text-sm uppercase">Order Successful!</p>
                <p className="text-xs font-medium text-[#4A4A4A]">{successMessage}</p>
              </div>
            </div>
          )}

          {warningMessage && (
            <div className="p-4 bg-[#FFF9E6] border-4 border-[#2D2D2D] rounded-2xl flex items-start gap-3 text-[#2D2D2D] shadow-[4px_4px_0_0_#2D2D2D]" id="warning-alert">
              <AlertCircle className="text-[#FFE66D] shrink-0 mt-0.5" size={24} />
              <div>
                <p className="font-extrabold text-sm uppercase">Order Processed with Warnings</p>
                <p className="text-xs font-medium text-[#4A4A4A]">{warningMessage}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-[#FFECEC] border-4 border-[#2D2D2D] rounded-2xl flex items-center gap-3 text-[#2D2D2D] shadow-[4px_4px_0_0_#2D2D2D]" id="error-alert">
              <XCircle className="text-[#FF6B6B] shrink-0" size={24} />
              <div>
                <p className="font-extrabold text-sm uppercase">Order Processing Error</p>
                <p className="text-xs font-medium text-[#4A4A4A]">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Main layout row split (Form + Tables vs Aside Sidebar) */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Form + Audit Log table on the Left */}
            <div className="flex-1 flex flex-col gap-6 w-full">
              {/* Order Placement Form */}
              <form className="bg-white border-b-8 border-r-8 border-[#2D2D2D] border-t-4 border-l-4 p-6 md:p-8 rounded-3xl space-y-6" onSubmit={handleSubmitOrder}>
                <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-[#2D2D2D]">
                  <span className="w-2 h-6 bg-[#FF6B6B] rounded-full"></span>
                  New Order Details
                </h2>

                {/* Inputs: Customer Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block" htmlFor="customer-name">
                      Customer Name <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <User size={16} />
                      </span>
                      <input
                        id="customer-name"
                        type="text"
                        required
                        placeholder="Enter customer name..."
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#F7F7F7] border-2 border-transparent focus:border-[#FF6B6B] rounded-xl outline-none font-medium text-[#2D2D2D] text-sm transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">Letters and spaces only, 2-40 chars</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block" htmlFor="phone-number">
                      Phone Number <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <Phone size={16} />
                      </span>
                      <input
                        id="phone-number"
                        type="tel"
                        required
                        placeholder="10-digit number..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full pl-10 pr-4 py-3 bg-[#F7F7F7] border-2 border-transparent focus:border-[#FF6B6B] rounded-xl outline-none font-medium text-[#2D2D2D] text-sm transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">Starts with 6, 7, 8, or 9 (exactly 10 digits)</p>
                  </div>
                </div>

                {/* Inputs: Menu Selection Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block" htmlFor="base-select">
                      Select Base <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="base-select"
                        value={selectedBase}
                        onChange={(e) => setSelectedBase(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-[#F7F7F7] border-2 border-transparent rounded-xl font-bold outline-none text-[#2D2D2D] text-sm appearance-none cursor-pointer focus:border-[#FF6B6B] transition-all"
                      >
                        {BASES.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name} (+₹{b.price})
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Layers size={16} />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block" htmlFor="pizza-select">
                      Select Pizza <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="pizza-select"
                        value={selectedPizza}
                        onChange={(e) => setSelectedPizza(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-[#F7F7F7] border-2 border-transparent rounded-xl font-bold outline-none text-[#2D2D2D] text-sm appearance-none cursor-pointer focus:border-[#FF6B6B] transition-all"
                      >
                        {PIZZAS.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} (+₹{p.price})
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Pizza size={16} />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block" htmlFor="topping-select">
                      Select Topping <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="topping-select"
                        value={selectedTopping}
                        onChange={(e) => setSelectedTopping(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-[#F7F7F7] border-2 border-transparent rounded-xl font-bold outline-none text-[#2D2D2D] text-sm appearance-none cursor-pointer focus:border-[#FF6B6B] transition-all"
                      >
                        {TOPPINGS.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} (+₹{t.price})
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Sparkles size={16} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity & Payment Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block" htmlFor="quantity-input">
                      Quantity <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <input
                      id="quantity-input"
                      type="number"
                      min="1"
                      max="10"
                      required
                      placeholder="Quantity (1-10)"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F7F7F7] border-2 border-transparent rounded-xl font-bold outline-none text-[#2D2D2D] text-sm focus:border-[#FF6B6B] transition-all"
                    />
                    <p className="text-[10px] text-gray-400">10% discount on qty ≥ 5</p>
                  </div>

                  {/* Payment Mode Buttons styled neo-brutalist */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-gray-500 block">
                      Payment Mode <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <div className="flex gap-2 h-[48px]">
                      {PAYMENT_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          id={`payment-btn-${mode}`}
                          onClick={() => setPaymentMode(mode)}
                          className={`flex-1 rounded-xl text-xs font-black transition-all border-2 border-[#2D2D2D] ${
                            paymentMode === mode
                              ? 'bg-[#2D2D2D] text-white shadow-[2px_2px_0_0_#000] translate-y-[-1px]'
                              : 'bg-white text-[#2D2D2D] hover:bg-slate-50'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Validation Message Box */}
                {validationError && (
                  <div className="p-3 bg-[#FFECEC] border-2 border-[#2D2D2D] rounded-xl text-[#FF6B6B] text-xs flex items-center gap-2 font-bold">
                    <AlertCircle size={16} />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Submit Controls (Vibrant theme style) */}
                <div className="flex gap-3 pt-4 border-t-2 border-dashed border-gray-200">
                  <button
                    type="submit"
                    id="submit-order-btn"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-[#FF6B6B] text-white font-black text-lg rounded-2xl shadow-[0_6px_0_0_#D14E4E] hover:translate-y-[2px] hover:shadow-[0_4px_0_0_#D14E4E] active:translate-y-[4px] active:shadow-[0_2px_0_0_#D14E4E] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="animate-spin" size={20} />
                    ) : (
                      <ShoppingCart size={20} />
                    )}
                    SUBMIT ORDER
                  </button>

                  <button
                    type="button"
                    id="reset-form-btn"
                    onClick={handleReset}
                    className="px-6 py-4 bg-white border-4 border-[#2D2D2D] font-bold rounded-2xl text-[#2D2D2D] hover:bg-slate-50 transition-all shadow-[4px_4px_0_0_#2D2D2D] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#2D2D2D] flex items-center gap-1.5"
                  >
                    <RefreshCw size={16} />
                    RESET
                  </button>
                </div>
              </form>

              {/* Recent Audit Log Section (Vibrant theme style) */}
              <section className="bg-white border-b-8 border-r-8 border-[#2D2D2D] border-t-4 border-l-4 p-6 rounded-3xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-[#2D2D2D]">
                    <span className="w-2 h-6 bg-[#4ECDC4] rounded-full"></span>
                    Recent Audit Records
                  </h2>
                  <button
                    id="refresh-logs-btn"
                    onClick={fetchRecentOrders}
                    className="flex items-center gap-1.5 text-xs font-black text-[#2D2D2D] bg-[#FFE66D] hover:bg-[#ffd83b] px-3 py-1.5 rounded-lg border-2 border-[#2D2D2D] transition-all cursor-pointer shadow-[2px_2px_0_0_#2D2D2D] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#2D2D2D]"
                  >
                    <RefreshCw size={12} className={isLoadingOrders ? 'animate-spin' : ''} />
                    REFRESH
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {isLoadingOrders && recentOrders.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                      <RefreshCw className="animate-spin text-[#FF6B6B]" size={32} />
                      <p className="text-sm font-bold">Loading historical orders...</p>
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="p-12 text-center text-[#2D2D2D]">
                      <ShoppingCart className="mx-auto text-[#FF6B6B] mb-3" size={36} />
                      <p className="text-sm font-black">No order records found in the audit table.</p>
                      <p className="text-xs text-slate-500 mt-1">Submit your first order to see it logged here.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-[#F7F7F7] rounded-lg">
                        <tr className="text-[#2D2D2D] text-xs font-black uppercase tracking-wider">
                          <th className="p-3">ID</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Total</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-[#2D2D2D]">
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                           <td
  className="p-3 text-xs font-mono text-gray-500 truncate max-w-[100px]"
  title={String(order.id)}
>
  #{order.id}
</td>
                            <td className="p-3">
                              <div className="font-bold text-[#2D2D2D]">{order.customer}</div>
                              <div className="text-[10px] text-gray-500">{order.phone}</div>
                            </td>
                            <td className="p-3 font-mono font-bold">{formatCurrency(order.total)}</td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border-2 border-[#2D2D2D] ${
                                  order.databricks_status === 'SUCCESS'
                                    ? 'bg-[#E8F8F5] text-emerald-800'
                                    : order.databricks_status === 'FAILED'
                                    ? 'bg-[#FFECEC] text-rose-800'
                                    : 'bg-[#FFF9E6] text-amber-800'
                                }`}
                              >
                                {order.databricks_status}
                              </span>
                              {order.error_message && (
                                <div className="text-[10px] text-[#FF6B6B] mt-0.5 max-w-[120px] truncate font-bold" title={order.error_message}>
                                  {order.error_message}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>

            {/* Aside Order Summary Column on the Right */}
            <aside className="w-full lg:w-[350px] bg-[#2D2D2D] text-white p-6 rounded-3xl flex flex-col gap-6 self-start border-b-8 border-r-8 border-[#1A1A1A]">
              <div className="flex flex-col items-center py-4 border-b border-dashed border-gray-600">
                <p className="text-[#FFE66D] font-black text-xs uppercase tracking-widest mb-2">Order Summary</p>
                <h3 className="text-4xl font-black font-mono" id="summary-total">
                  {formatCurrency(currentBill.total)}
                </h3>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Customer</span>
                  <span className="font-bold truncate max-w-[180px] text-white" id="summary-customer">
                    {customer.trim() || <em className="text-gray-500 not-italic font-medium">Not Entered</em>}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Phone</span>
                  <span className="font-bold font-mono text-white" id="summary-phone">
                    {phone || <em className="text-gray-500 not-italic font-medium">Not Entered</em>}
                  </span>
                </div>

                <div className="border-t border-gray-600/50 pt-3"></div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Selected Configuration</span>
                  <div className="bg-white/5 p-3 rounded-xl text-xs space-y-1 font-medium border border-gray-700">
                    <div>Base: {selectedBase} ({formatCurrency(basePrice)})</div>
                    <div>Pizza: {selectedPizza} ({formatCurrency(pizzaPrice)})</div>
                    <div>Topping: {selectedTopping} ({formatCurrency(toppingPrice)})</div>
                    <div className="text-[#FFE66D] font-extrabold mt-1">Quantity: {quantity || '1'}</div>
                  </div>
                </div>

                <div className="border-t border-gray-600/50 pt-3"></div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Unit Price</span>
                  <span className="font-bold font-mono text-white" id="summary-unit-price">
                    {formatCurrency(currentBill.unitPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Subtotal</span>
                  <span className="font-bold font-mono text-white" id="summary-subtotal">
                    {formatCurrency(currentBill.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-[#FFE66D]">
                  <span className="font-bold">Bulk Discount (10%)</span>
                  <span className="font-bold font-mono" id="summary-discount">
                    -{formatCurrency(currentBill.discount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">GST (18%)</span>
                  <span className="font-bold font-mono text-white" id="summary-gst">
                    +{formatCurrency(currentBill.gst)}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-600">
                <div className="bg-white/5 p-4 rounded-2xl space-y-2 mb-4 border border-gray-700">
                  <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Backend Sync Status</p>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#4ECDC4] shadow-[0_0_8px_#4ECDC4]"></div>
                    <span className="text-xs font-mono">Databricks Analytical Engine</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#4ECDC4] shadow-[0_0_8px_#4ECDC4]"></div>
                    <span className="text-xs font-mono">Supabase Audit Pipeline</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                    Payment Mode: <span className="text-white font-mono font-bold">{paymentMode}</span>
                  </div>
                </div>
                <button
                  type="button"
                  id="calculate-bill-btn"
                  onClick={handleCalculateBill}
                  className="w-full py-4 bg-[#FFE66D] text-[#2D2D2D] font-black rounded-2xl border-4 border-white shadow-[0_6px_0_0_#FFF] hover:translate-y-[2px] hover:shadow-[0_4px_0_0_#FFF] active:translate-y-[4px] active:shadow-[0_2px_0_0_#FFF] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Calculator size={18} />
                  CALCULATE BILL
                </button>
              </div>
            </aside>

          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="px-6 py-4 md:px-8 bg-[#2D2D2D] text-white flex flex-col sm:flex-row justify-between items-center text-[10px] font-bold uppercase tracking-widest shrink-0 gap-2 border-t-4 border-[#2D2D2D] mt-8">
        <div>PIZZAFLOW v2.4.0 • PRODUCTION READY</div>
        <div className="flex gap-4">
          <span>DB: colab.colabresult</span>
          <span className="text-[#FF6B6B] flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-[#FF6B6B] rounded-full"></span> LIVE INSTANCE
          </span>
        </div>
      </footer>
      <ChatBot />
    </div>
  );
}
