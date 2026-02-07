# Subscription Workflow API - Quick Reference

This guide provides a quick reference for the complete subscription-to-invoice workflow as shown in your UI diagram.

## 🔄 Complete Workflow

```
Subscription (Draft) 
    ↓ [Add Items]
Subscription (with Order Lines)
    ↓ [Confirm]
Subscription (Confirmed/Active)
    ↓ [Create Order]
Order (Draft)
    ↓ [Confirm Order]
Order (Confirmed)
    ↓ [Create Invoice]
Invoice (Draft)
    ↓ [Confirm Invoice + Payment]
Invoice (Posted/Paid)
```

## 📋 API Endpoints by Workflow Stage

### Stage 1: Subscription Management

| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| List subscriptions | GET | `/api/subscriptions/subscriptions/` | All |
| Filter by status | GET | `/api/subscriptions/subscriptions/?status=DRAFT` | Any |
| Get subscription details | GET | `/api/subscriptions/subscriptions/<id>/` | Any |
| Create subscription | POST | `/api/subscriptions/subscriptions/` | → DRAFT |
| Update subscription | PATCH | `/api/subscriptions/subscriptions/<id>/` | DRAFT |
| Add order line | POST | `/api/subscriptions/subscriptions/<id>/items/` | DRAFT |
| Update order line | PUT | `/api/subscriptions/subscriptions/<id>/items/<item_id>/` | DRAFT |
| Delete order line | DELETE | `/api/subscriptions/subscriptions/<id>/items/<item_id>/` | DRAFT |
| Confirm subscription | POST | `/api/subscriptions/subscriptions/<id>/status/` | DRAFT → CONFIRMED |

### Stage 2: Order Creation from Subscription

| Action | Method | Endpoint | Required Status |
|--------|--------|----------|-----------------|
| Create order from subscription | POST | `/api/subscriptions/subscriptions/<id>/create-order/` | CONFIRMED/ACTIVE |
| List subscription orders | GET | `/api/subscriptions/subscriptions/<id>/orders/` | Any |

### Stage 3: Invoice Creation from Order

| Action | Method | Endpoint | Required Status |
|--------|--------|----------|-----------------|
| Create invoice from order | POST | `/api/subscriptions/orders/<order_id>/create-invoice/` | CONFIRMED/IN_PROGRESS |
| List subscription invoices | GET | `/api/subscriptions/subscriptions/<id>/invoices/` | Any |

### Stage 4: Invoice Confirmation & Payment

| Action | Method | Endpoint | Required Status |
|--------|--------|----------|-----------------|
| Confirm invoice | POST | `/api/subscriptions/invoices/<invoice_id>/confirm/` | DRAFT |
| Confirm with payment | POST | `/api/subscriptions/invoices/<invoice_id>/confirm/` | DRAFT → PAID |

## 📨 Request Examples

### 1. Create Subscription with Items

```bash
# Step 1: Create subscription
curl -X POST http://localhost:8000/api/subscriptions/subscriptions/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "party": "party-uuid",
    "plan": "plan-uuid",
    "start_date": "2026-02-01",
    "next_billing_date": "2026-03-01",
    "currency": "currency-uuid",
    "payment_terms": "Net 30",
    "status": "DRAFT"
  }'

# Step 2: Add items (repeat for each product)
curl -X POST http://localhost:8000/api/subscriptions/subscriptions/<id>/items/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "product-uuid",
    "quantity": "10",
    "unit_price": "99.00",
    "tax_rate": "18.00"
  }'

# Step 3: Confirm subscription
curl -X POST http://localhost:8000/api/subscriptions/subscriptions/<id>/status/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "confirm"
  }'
```

### 2. Create Order from Subscription

```bash
curl -X POST http://localhost:8000/api/subscriptions/subscriptions/<id>/create-order/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "order_date": "2026-02-07",
    "delivery_date": "2026-02-20",
    "customer_po_number": "PO-12345"
  }'

# Response includes order_id
```

### 3. Create Invoice from Order

```bash
curl -X POST http://localhost:8000/api/subscriptions/orders/<order_id>/create-invoice/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_date": "2026-02-07",
    "due_date": "2026-03-09"
  }'

# Response includes invoice_id
```

### 4. Confirm Invoice with Payment

```bash
curl -X POST http://localhost:8000/api/subscriptions/invoices/<invoice_id>/confirm/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "Credit Card",
    "amount": "1166.20",
    "payment_date": "2026-02-07"
  }'
```

## 🎯 Status Transitions

### Subscription Status Flow

```
DRAFT → confirm → CONFIRMED → activate → ACTIVE
                                         ↓
                                      pause ↔ PAUSED
                                         ↓
                                      cancel → CANCELLED
                                                   ↓
                                                close → CLOSED
```

### Order Status Flow

```
DRAFT → confirm → CONFIRMED → create_invoice → INVOICE_CREATED_PENDING_POSTING
                                                         ↓
                                                    INVOICED
```

### Invoice Status Flow

```
DRAFT → confirm → POSTED
         ↓
      (with payment)
         ↓
       PAID
```

## 🔍 Filtering & Search

### Filter Subscriptions by Status

```bash
# Get draft subscriptions (New tab in UI)
GET /api/subscriptions/subscriptions/?status=DRAFT

# Get confirmed subscriptions (Confirm tab in UI)
GET /api/subscriptions/subscriptions/?status=CONFIRMED

# Get active subscriptions
GET /api/subscriptions/subscriptions/?status=ACTIVE

# Get cancelled subscriptions (Cancel tab in UI)
GET /api/subscriptions/subscriptions/?status=CANCELLED
```

### Search Subscriptions

```bash
# Search by subscription number or customer name
GET /api/subscriptions/subscriptions/?search=SUB-20260207

# Filter by customer
GET /api/subscriptions/subscriptions/?party=party-uuid

# Filter by plan
GET /api/subscriptions/subscriptions/?plan=plan-uuid
```

## 📊 Response Data Structures

### Subscription List (Page 1 UI)

```json
{
  "subscriptions": [{
    "id": "uuid",
    "subscription_number": "SUB-20260207-000001",
    "customer": "Customer Name",
    "full_name": "John Doe",
    "expiration": "2026-12-31",
    "monthly": "99.00",
    "plan_name": "Premium Plan",
    "status": "ACTIVE",
    "status_display": "Active"
  }],
  "count": 1
}
```

### Subscription Detail (Page 2 UI with Order Lines)

```json
{
  "id": "uuid",
  "subscription_number": "SUB-20260207-000001",
  "customer": "Customer Name",
  "quotation_template_name": "Standard Template",
  "recurring_plan": "Premium Plan",
  "payment_term": "Net 30",
  "payment_method": "Credit Card",
  "payment_done": true,
  "order_lines": [
    {
      "product_name": "Product A",
      "quantity": "10.0000",
      "unit_price": "99.00",
      "discount_pct": "0.00",
      "tax_rate": "18.00",
      "line_total": 99.00,
      "tax_amount": 17.82,
      "total": 116.82
    }
  ],
  "subtotal": 99.00,
  "tax_total": 17.82,
  "grand_total": 116.82
}
```

### Order Creation Response

```json
{
  "message": "Sales order created successfully",
  "order_id": "uuid",
  "order_number": "SO-20260207-000001",
  "status": "DRAFT"
}
```

### Invoice Creation Response

```json
{
  "message": "Invoice created successfully",
  "invoice_id": "uuid",
  "invoice_number": "INV-20260207-000001",
  "status": "DRAFT"
}
```

## ⚠️ Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Can only create orders from confirmed or active subscriptions" | Subscription not confirmed | Confirm subscription first |
| "Subscription has no items to order" | No order lines added | Add items before creating order |
| "Can only create invoices from confirmed orders" | Order not confirmed | Confirm order first (use Orders API) |
| "Order already has an invoice" | Invoice already exists | Get existing invoice from order |
| "Can only confirm draft invoices" | Invoice already confirmed | Check invoice status |

## 🎨 UI Mapping

### Subscription List View (First View in Diagram)

- **Tabs**: Filter by status (New=DRAFT, Confirm=CONFIRMED, etc.)
- **Table Columns**: subscription_number, customer, expiration, monthly, plan_name, status
- **Action**: Click row → Navigate to detail view

### Subscription Detail View (Second View in Diagram)

- **Header**: subscription_number, customer, expiration, quotation_template
- **Fields**: recurring_plan, payment_term, payment_method, payment_done
- **Order Lines Table**: Product, Quantity, Unit Price, Taxes, Amount
- **Buttons**: 
  - "Confirm" → POST to `/status/` with action="confirm"
  - "Create Order" → POST to `/create-order/`

### Order Creation View (Third View in Diagram)

- **Fields**: Customer, Invoice State, Due date
- **Order Lines**: Product, Quantity, Unit Price, Taxes, Amount
- **Buttons**:
  - "Confirm" → Confirm order (use existing Orders API)
  - "Cancel" → Cancel order

### Invoice View (Fourth View in Diagram)

- **Fields**: party, Payment method, Amount, Payment date
- **Buttons**:
  - "Confirm" → POST to `/invoices/<id>/confirm/` with payment details
  - "Cancel" → Cancel invoice

## 🔗 Navigation Flow

```
Subscription List 
    ↓ [Click subscription]
Subscription Detail (with Confirm button if DRAFT)
    ↓ [Click Confirm]
Subscription Detail (confirmed, with Create Order button)
    ↓ [Click Create Order]
Order Creation View (Draft)
    ↓ [Click Confirm]
Order View (Confirmed, with Create Invoice button)
    ↓ [Click Create Invoice]
Invoice View (Draft, with payment fields)
    ↓ [Enter payment & Click Confirm]
Invoice View (Posted/Paid)
```

## 🚀 Quick Start Checklist

- [ ] Run migrations: `python manage.py migrate subscriptions`
- [ ] Test subscription CRUD endpoints
- [ ] Test subscription status transitions
- [ ] Test order creation from subscription
- [ ] Test invoice creation from order
- [ ] Test invoice confirmation with payment
- [ ] Integrate with frontend UI views
- [ ] Test complete workflow end-to-end

## 📚 Full Documentation

See [SUBSCRIPTION_API_DOCUMENTATION.md](./SUBSCRIPTION_API_DOCUMENTATION.md) for complete API reference with all fields, validation rules, and detailed examples.
