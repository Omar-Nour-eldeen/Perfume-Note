import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://drzqsxnpbjfpnvqzruqs.supabase.co';
const supabaseKey = 'sb_publishable_pd_tmZjv9LXMCaw6cpStXw_ySYRdBtM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
  console.log("Checking triggers on orders, order_items, and returns...");
  
  // Create a dummy product
  const { data: pData, error: pErr } = await supabase.from('products').insert({
    title_en: 'Test Product ' + Date.now(),
    title_ar: 'منتج تجريبي ' + Date.now(),
    price: 100,
    stock: 100
  }).select().single();
  
  if (pErr) {
    console.error("Error creating product:", pErr);
    return;
  }
  
  console.log("Created test product:", pData.id, "Initial Stock:", pData.stock);
  
  // Create a dummy order
  const { data: oData, error: oErr } = await supabase.from('orders').insert({
    user_id: null,
    total: 100,
    status: 'pending',
    payment_method: 'Cash on Delivery',
    customer_name: 'Test Customer',
    phone: '123456789',
    address: 'Test Address',
    city: 'Test City'
  }).select().single();
  
  if (oErr) {
    console.error("Error creating order:", oErr);
    return;
  }
  
  console.log("Created pending order:", oData.id);
  
  // Insert order item
  const { error: oiErr } = await supabase.from('order_items').insert({
    order_id: oData.id,
    product_id: pData.id,
    title: pData.title_en,
    price: 100,
    quantity: 1
  });
  
  if (oiErr) {
    console.error("Error inserting order item:", oiErr);
    return;
  }
  
  console.log("Inserted order item (quantity 1).");
  
  // Check stock after insert
  const { data: check1 } = await supabase.from('products').select('stock').eq('id', pData.id).single();
  console.log("Stock after inserting order item (EXPECT 100):", check1?.stock);
  
  // Update order to processing
  console.log("Updating order to processing...");
  await supabase.from('orders').update({ status: 'processing' }).eq('id', oData.id);
  
  // Check stock after update
  const { data: check2 } = await supabase.from('products').select('stock').eq('id', pData.id).single();
  console.log("Stock after confirming order (EXPECT 99):", check2?.stock);
  
  // Update order to cancelled
  console.log("Updating order to cancelled...");
  await supabase.from('orders').update({ status: 'cancelled' }).eq('id', oData.id);
  
  // Check stock after cancel
  const { data: check3 } = await supabase.from('products').select('stock').eq('id', pData.id).single();
  console.log("Stock after cancelling order (EXPECT 100):", check3?.stock);
  
  console.log("Done checking triggers.");
}

checkTriggers();
