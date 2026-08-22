// Simple in-memory order management
// For production, replace with a database (MongoDB, PostgreSQL, etc.)

const orders = new Map();
let orderCounter = 1000;

function createOrder(customerPhone, customerName, items, notes = "") {
  const orderId = `KAB-${++orderCounter}`;
  const order = {
    id: orderId,
    customerPhone,
    customerName,
    items,
    notes,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.set(orderId, order);

  // Also store by phone for easy lookup
  const customerOrders = orders.get(`phone:${customerPhone}`) || [];
  customerOrders.push(orderId);
  orders.set(`phone:${customerPhone}`, customerOrders);

  return order;
}

function getOrder(orderId) {
  return orders.get(orderId) || null;
}

function getCustomerOrders(phone) {
  const orderIds = orders.get(`phone:${phone}`) || [];
  return orderIds.map(id => orders.get(id)).filter(Boolean);
}

function updateOrderStatus(orderId, status) {
  const order = orders.get(orderId);
  if (!order) return null;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
}

function formatOrder(order) {
  let msg = `📋 *Order ${order.id}*\n`;
  msg += `👤 ${order.customerName}\n`;
  msg += `📱 ${order.customerPhone}\n`;
  msg += `📅 ${new Date(order.createdAt).toLocaleString()}\n`;
  msg += `📦 Status: ${order.status.toUpperCase()}\n\n`;
  msg += `*Items:*\n`;
  order.items.forEach(item => {
    msg += `  • ${item.qty}x ${item.name} - $${(item.price * item.qty).toFixed(2)}\n`;
  });
  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  msg += `\n💰 *Total: $${total.toFixed(2)} TTD*`;
  if (order.notes) msg += `\n📝 Notes: ${order.notes}`;
  return msg;
}

module.exports = { createOrder, getOrder, getCustomerOrders, updateOrderStatus, formatOrder };
