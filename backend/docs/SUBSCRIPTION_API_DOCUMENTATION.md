# Subscription Management API Documentation

This document provides comprehensive documentation for the Subscription Management API endpoints that match your UI design.

## Overview

The API provides endpoints for managing subscriptions, subscription items (order lines), quotations, and related data. The endpoints are designed to support the two-page UI:
1. **Page 1**: List of subscriptions
2. **Page 2**: Detailed subscription view with order lines

## Base URL

```
/api/subscriptions/
```

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Subscriptions

### 1. List All Subscriptions (Page 1 UI)

**Endpoint**: `GET /api/subscriptions/subscriptions/`

Returns a list of all subscriptions for the authenticated user's company. This matches the first page UI showing the subscription list.

**Query Parameters**:
- `status` (optional): Filter by status (DRAFT, ACTIVE, CANCELLED, etc.)
- `search` (optional): Search by subscription number or customer name
- `party` (optional): Filter by party ID (UUID)
- `plan` (optional): Filter by plan ID (UUID)

**Response**:
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "subscription_number": "SUB-20260207-000001",
      "customer": "Customer 1",
      "customer_id": "uuid",
      "full_name": "John Doe",
      "expiration": "2026-12-31",
      "monthly": "99.00",
      "plan_name": "Premium Plan",
      "recurring_plan": "Premium Plan",
      "status": "ACTIVE",
      "status_display": "Active",
      "start_date": "2026-01-01",
      "created_at": "2026-02-07T10:00:00Z"
    }
  ],
  "count": 1
}
```

**Fields Explanation**:
- `subscription_number`: Unique subscription identifier
- `customer`: Customer/party name
- `full_name`: Full name of the contact person
- `expiration`: End date of subscription (null if no end date)
- `monthly`: Monthly recurring revenue (MRR)
- `plan_name` / `recurring_plan`: Name of the subscription plan
- `status`: Current status code
- `status_display`: Human-readable status

### 2. Get Subscription Details (Page 2 UI)

**Endpoint**: `GET /api/subscriptions/subscriptions/<subscription_id>/`

Returns detailed information about a specific subscription including order lines. This matches the second page UI.

**Response**:
```json
{
  "id": "uuid",
  "subscription_number": "SUB-20260207-000001",
  "customer": "Customer 1",
  "customer_id": "uuid",
  "party_details": {
    "id": "uuid",
    "name": "Customer 1",
    "email": "customer@example.com",
    "phone": "+1234567890"
  },
  "expiration": "2026-12-31",
  "start_date": "2026-01-01",
  "next_billing_date": "2026-03-01",
  "last_billing_date": "2026-02-01",
  "billing_cycle_count": 2,
  "quotation_template": "uuid",
  "quotation_template_name": "Standard Template",
  "quotation_template_details": {
    "id": "uuid",
    "name": "Standard Template",
    "plan_name": "Premium Plan"
  },
  "recurring_plan": "Premium Plan",
  "plan_name": "Premium Plan",
  "plan_details": {
    "id": "uuid",
    "name": "Premium Plan",
    "billing_interval": "MONTHLY",
    "billing_interval_display": "Monthly",
    "base_price": "99.00"
  },
  "payment_term": "Net 30",
  "payment_terms": "Net 30",
  "payment_method": "Credit Card",
  "payment_done": true,
  "monthly_value": "99.00",
  "currency": "uuid",
  "status": "ACTIVE",
  "status_display": "Active",
  "order_lines": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Product A",
      "quantity": "10.0000",
      "unit_price": "9.90",
      "discount_pct": "0.00",
      "tax_rate": "18.00",
      "line_total": 99.00,
      "tax_amount": 17.82,
      "total": 116.82
    }
  ],
  "subtotal": 99.00,
  "tax_total": 17.82,
  "grand_total": 116.82,
  "terms_and_conditions": "Standard T&C",
  "notes": "Internal notes",
  "created_at": "2026-02-07T10:00:00Z"
}
```

**Key Fields**:
- `order_lines`: Array of subscription items (products in the subscription)
- `quotation_template`: Reference to the template used
- `payment_method`: Payment method used (e.g., "Credit Card", "Bank Transfer")
- `payment_done`: Boolean indicating if payment is completed
- `subtotal`, `tax_total`, `grand_total`: Calculated totals from order lines

### 3. Create New Subscription

**Endpoint**: `POST /api/subscriptions/subscriptions/`

Creates a new subscription.

**Request Body**:
```json
{
  "party": "uuid",
  "plan": "uuid",
  "quotation_template": "uuid",
  "start_date": "2026-02-01",
  "end_date": "2026-12-31",
  "next_billing_date": "2026-03-01",
  "payment_terms": "Net 30",
  "payment_method": "Credit Card",
  "payment_done": false,
  "currency": "uuid",
  "status": "DRAFT"
}
```

**Response**: Returns the detailed subscription object (same as GET detail endpoint)

### 4. Update Subscription

**Endpoint**: `PUT /api/subscriptions/subscriptions/<subscription_id>/`

Full update of a subscription.

**Endpoint**: `PATCH /api/subscriptions/subscriptions/<subscription_id>/`

Partial update of a subscription.

**Request Body** (PATCH example):
```json
{
  "payment_method": "Bank Transfer",
  "payment_done": true
}
```

### 5. Delete Subscription

**Endpoint**: `DELETE /api/subscriptions/subscriptions/<subscription_id>/`

Deletes a subscription (only if in DRAFT status).

**Response**: 204 No Content

---

## Subscription Status Management

### Update Subscription Status

**Endpoint**: `POST /api/subscriptions/subscriptions/<subscription_id>/status/`

Updates the subscription status with workflow transitions.

**Request Body**:
```json
{
  "action": "confirm",
  "reason": "Optional reason for cancellation"
}
```

**Available Actions**:
- `confirm`: DRAFT → CONFIRMED
- `activate`: CONFIRMED → ACTIVE
- `pause`: ACTIVE → PAUSED
- `resume`: PAUSED → ACTIVE
- `cancel`: ACTIVE/PAUSED → CANCELLED (requires `reason`)
- `close`: CANCELLED/ACTIVE → CLOSED

**Response**:
```json
{
  "message": "Subscription confirmed successfully",
  "subscription": {
    // Full subscription details
  }
}
```

---

## Subscription Items (Order Lines)

### 1. List Subscription Items

**Endpoint**: `GET /api/subscriptions/subscriptions/<subscription_id>/items/`

Returns all items (order lines) for a subscription.

**Response**:
```json
{
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Product A",
      "quantity": "10.0000",
      "unit_price": "9.90",
      "discount_pct": "0.00",
      "tax_rate": "18.00",
      "description": "Custom description",
      "line_total": 99.00,
      "tax_amount": 17.82,
      "total": 116.82
    }
  ],
  "count": 1
}
```

### 2. Add Item to Subscription

**Endpoint**: `POST /api/subscriptions/subscriptions/<subscription_id>/items/`

Adds a new item to the subscription.

**Request Body**:
```json
{
  "product": "uuid",
  "product_variant": "uuid",
  "quantity": "10.0000",
  "unit_price": "9.90",
  "discount_pct": "0.00",
  "tax_rate": "18.00",
  "description": "Optional custom description"
}
```

**Note**: Can only add items to subscriptions in DRAFT or QUOTATION status.

### 3. Update Subscription Item

**Endpoint**: `PUT /api/subscriptions/subscriptions/<subscription_id>/items/<item_id>/`

Updates a subscription item.

### 4. Delete Subscription Item

**Endpoint**: `DELETE /api/subscriptions/subscriptions/<subscription_id>/items/<item_id>/`

Deletes a subscription item (only for DRAFT/QUOTATION subscriptions).

---

## Supporting Endpoints

### 1. List Subscription Plans

**Endpoint**: `GET /api/subscriptions/plans/`

Returns all active subscription plans.

**Response**:
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Premium Plan",
      "billing_interval": "MONTHLY",
      "billing_interval_display": "Monthly",
      "billing_interval_count": 1,
      "base_price": "99.00",
      "is_active": true
    }
  ],
  "count": 1
}
```

### 2. List Quotation Templates

**Endpoint**: `GET /api/subscriptions/quotation-templates/`

Returns all active quotation templates.

**Response**:
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Standard Template",
      "description": "Standard quotation template",
      "plan": "uuid",
      "plan_name": "Premium Plan",
      "validity_days": 30,
      "is_active": true
    }
  ],
  "count": 1
}
```

### 3. List Quotations

**Endpoint**: `GET /api/subscriptions/quotations/`

Returns all quotations with optional status filtering.

**Query Parameters**:
- `status` (optional): Filter by status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)

### 4. Get Quotation Details

**Endpoint**: `GET /api/subscriptions/quotations/<quotation_id>/`

Returns detailed information about a specific quotation.

---

## Status Codes

- `200 OK`: Successful GET/PUT/PATCH request
- `201 Created`: Successful POST request
- `204 No Content`: Successful DELETE request
- `400 Bad Request`: Invalid request data or business rule violation
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

For validation errors:

```json
{
  "field_name": ["Error message for this field"],
  "another_field": ["Another error message"]
}
```

---

## Business Rules

1. **Status Transitions**: 
   - Subscriptions follow a specific workflow: DRAFT → QUOTATION → CONFIRMED → ACTIVE → PAUSED/CANCELLED/CLOSED
   - Only certain status transitions are allowed (use the status update endpoint)

2. **Item Modifications**:
   - Can only add/edit/delete items when subscription is in DRAFT or QUOTATION status
   - Once ACTIVE, items are locked

3. **Deletion**:
   - Can only delete subscriptions in DRAFT status
   - For active subscriptions, use the cancel action instead

4. **Plan Constraints**:
   - Some plans may not allow pausing (check `is_pausable`)
   - Some plans may not allow manual closing (check `is_closable`)

---

## Example Workflows

### Creating a New Subscription

1. Get available plans: `GET /api/subscriptions/plans/`
2. Get available templates: `GET /api/subscriptions/quotation-templates/`
3. Create subscription: `POST /api/subscriptions/subscriptions/`
4. Add order lines: `POST /api/subscriptions/subscriptions/<id>/items/`
5. Confirm subscription: `POST /api/subscriptions/subscriptions/<id>/status/` with action "confirm"
6. Activate subscription: `POST /api/subscriptions/subscriptions/<id>/status/` with action "activate"

### Viewing Subscription Details

1. List subscriptions: `GET /api/subscriptions/subscriptions/`
2. Get specific details: `GET /api/subscriptions/subscriptions/<id>/`
3. View order lines: Included in detail response as `order_lines` array

### Updating Payment Information

```javascript
PATCH /api/subscriptions/subscriptions/<id>/
{
  "payment_method": "Credit Card",
  "payment_done": true
}
```

---

## Frontend Integration Notes

### Page 1: Subscription List

Use `GET /api/subscriptions/subscriptions/` to populate the table showing:
- Subscription number
- Customer name
- Full name
- Expiration date
- Monthly value
- Plan name
- Status

### Page 2: Subscription Detail

Use `GET /api/subscriptions/subscriptions/<id>/` to populate the detail view showing:
- All subscription header fields
- Quotation template
- Recurring plan
- Payment terms and method
- Payment done checkbox
- Order lines table
- Calculated totals (subtotal, tax, grand total)

The `order_lines` field contains all the line items with calculated totals for easy display.

---

## Subscription-to-Invoice Workflow

The complete workflow as shown in the UI diagram supports the following process:

**Subscription → Order → Invoice → Payment**

### Workflow Overview

1. **Create Subscription Draft** with order lines (products)
2. **Confirm Subscription** to activate it
3. **Create Order** from the confirmed subscription
4. **Confirm Order** to process it
5. **Create Invoice** from the confirmed order
6. **Confirm Invoice** to finalize and optionally record payment

---

## Workflow Endpoints

### 1. Create Order from Subscription

**Endpoint**: `POST /api/subscriptions/subscriptions/<subscription_id>/create-order/`

Creates a sales order (draft) from a confirmed or active subscription. All subscription items are copied to the order.

**Request Body**:
```json
{
  "order_date": "2026-02-07",
  "delivery_date": "2026-02-20",
  "customer_po_number": "PO-12345",
  "notes": "Custom order notes"
}
```

**Response**:
```json
{
  "message": "Sales order created successfully",
  "order_id": "uuid",
  "order_number": "SO-20260207-000001",
  "status": "DRAFT"
}
```

**Validation**:
- Subscription must be in CONFIRMED or ACTIVE status
- Subscription must have at least one item

**Workflow**: Subscription (confirmed) → Order (draft)

### 2. List Orders from Subscription

**Endpoint**: `GET /api/subscriptions/subscriptions/<subscription_id>/orders/`

Returns all orders created for the subscription's customer.

**Response**:
```json
{
  "orders": [
    {
      "id": "uuid",
      "order_number": "SO-20260207-000001",
      "order_date": "2026-02-07",
      "status": "CONFIRMED",
      "delivery_date": "2026-02-20",
      "confirmed_at": "2026-02-07T10:00:00Z",
      "invoiced_at": null
    }
  ],
  "count": 1
}
```

### 3. Create Invoice from Order

**Endpoint**: `POST /api/subscriptions/orders/<order_id>/create-invoice/`

Creates an invoice (draft) from a confirmed order. All order items are copied to the invoice lines.

**Request Body**:
```json
{
  "invoice_date": "2026-02-07",
  "due_date": "2026-03-09",
  "payment_terms": "Net 30"
}
```

**Response**:
```json
{
  "message": "Invoice created successfully",
  "invoice_id": "uuid",
  "invoice_number": "INV-20260207-000001",
  "status": "DRAFT"
}
```

**Validation**:
- Order must be in CONFIRMED or IN_PROGRESS status
- Order must not already have an invoice

**Side Effects**:
- Updates order status to INVOICE_CREATED_PENDING_POSTING
- Sets order.invoiced_at timestamp

**Workflow**: Order (confirmed) → Invoice (draft)

### 4. Confirm Invoice

**Endpoint**: `POST /api/subscriptions/invoices/<invoice_id>/confirm/`

Confirms an invoice and optionally records payment. Changes status from DRAFT to POSTED (or PAID if full payment is recorded).

**Request Body**:
```json
{
  "payment_method": "Credit Card",
  "amount": "1000.00",
  "payment_date": "2026-02-07"
}
```

**Response**:
```json
{
  "message": "Invoice confirmed successfully",
  "invoice_id": "uuid",
  "invoice_number": "INV-20260207-000001",
  "status": "POSTED"
}
```

**Validation**:
- Invoice must be in DRAFT status

**Side Effects**:
- Updates invoice status to POSTED (or PAID if full payment provided)
- Sets invoice.posted_at timestamp
- If payment amount >= invoice total, marks invoice as PAID

**Workflow**: Invoice (draft) → Invoice (posted/paid)

### 5. List Invoices from Subscription

**Endpoint**: `GET /api/subscriptions/subscriptions/<subscription_id>/invoices/`

Returns all invoices created for the subscription's customer.

**Response**:
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-20260207-000001",
      "invoice_date": "2026-02-07",
      "due_date": "2026-03-09",
      "status": "POSTED",
      "posted_at": "2026-02-07T10:00:00Z",
      "sales_order__order_number": "SO-20260207-000001"
    }
  ],
  "count": 1
}
```

---

## Complete Workflow Example

### Step-by-Step Subscription to Payment Flow

#### Step 1: Create Subscription Draft

```javascript
POST /api/subscriptions/subscriptions/
{
  "party": "customer-uuid",
  "plan": "plan-uuid",
  "start_date": "2026-02-01",
  "next_billing_date": "2026-03-01",
  "currency": "currency-uuid",
  "status": "DRAFT"
}
```

#### Step 2: Add Order Lines to Subscription

```javascript
POST /api/subscriptions/subscriptions/<subscription_id>/items/
{
  "product": "product-uuid",
  "quantity": "10",
  "unit_price": "99.00",
  "tax_rate": "18.00"
}
```

#### Step 3: Confirm Subscription

```javascript
POST /api/subscriptions/subscriptions/<subscription_id>/status/
{
  "action": "confirm"
}
```

#### Step 4: Create Order from Subscription

```javascript
POST /api/subscriptions/subscriptions/<subscription_id>/create-order/
{
  "order_date": "2026-02-07",
  "delivery_date": "2026-02-20"
}
```

Response includes `order_id` for next step.

#### Step 5: Confirm the Order

(Use your existing orders API)

```javascript
POST /api/orders/<order_id>/confirm/
```

#### Step 6: Create Invoice from Order

```javascript
POST /api/subscriptions/orders/<order_id>/create-invoice/
{
  "invoice_date": "2026-02-07",
  "due_date": "2026-03-09"
}
```

Response includes `invoice_id` for next step.

#### Step 7: Confirm Invoice with Payment

```javascript
POST /api/subscriptions/invoices/<invoice_id>/confirm/
{
  "payment_method": "Credit Card",
  "amount": "1166.20",
  "payment_date": "2026-02-07"
}
```

---

## UI State Management

### Subscription Page Views

Based on your UI diagram, the subscription page has multiple views with different tabs:

**Tab States**: New, Confirm, Send, Cancel, etc.

Filter subscriptions by status:
```
GET /api/subscriptions/subscriptions/?status=DRAFT
GET /api/subscriptions/subscriptions/?status=CONFIRMED
GET /api/subscriptions/subscriptions/?status=ACTIVE
GET /api/subscriptions/subscriptions/?status=CANCELLED
```

### Order Page Views

The order creation page shows:
- Customer/Invoice State
- Due date
- Order lines with Product, Quantity, Unit Price, Taxes, Amount
- Confirm and Cancel buttons

### Invoice Page Views

The invoice page shows:
- Customer/party
- Payment method
- Amount
- Payment date
- Confirm and Cancel buttons

---

## Error Handling

### Common Error Responses

**Invalid Status Transition**:
```json
{
  "error": "Can only create orders from confirmed or active subscriptions"
}
```

**Missing Items**:
```json
{
  "error": "Subscription has no items to order"
}
```

**Already Processed**:
```json
{
  "error": "Order already has an invoice",
  "invoice_id": "uuid",
  "invoice_number": "INV-20260207-000001"
}
```

---

## Business Rules

### Subscription to Order

1. ✓ Subscription must be CONFIRMED or ACTIVE
2. ✓ Subscription must have items
3. ✓ All items are copied to the order
4. ✓ Order starts in DRAFT status

### Order to Invoice

1. ✓ Order must be CONFIRMED or IN_PROGRESS
2. ✓ Order can only have one invoice
3. ✓ All order items are copied to invoice lines
4. ✓ Invoice starts in DRAFT status
5. ✓ Order status updated to INVOICE_CREATED_PENDING_POSTING

### Invoice Confirmation

1. ✓ Invoice must be DRAFT
2. ✓ Can optionally include payment information
3. ✓ If full payment provided, status becomes PAID
4. ✓ Otherwise, status becomes POSTED

---

## Migration Required

After implementing these changes, run:

```bash
python manage.py makemigrations subscriptions
python manage.py migrate
```

This will create the database migrations for the new fields:
- `payment_method`
- `payment_done`
- `quotation_template`
