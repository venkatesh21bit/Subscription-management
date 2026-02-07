"use client"

import React, { useState, useEffect } from "react"
import { Plus, Trash2, Send, Check, FileText, TrendingUp, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { apiClient } from "@/utils/api"

type SubscriptionStatus = "Quotation" | "Quotation Sent" | "Confirmed"

interface Product {
    id: string;
    name: string;
    sku: string;
    price: string;
}

interface ProductsResponse {
    products: Product[];
}

interface Customer {
    id: string;
    name: string;
    party_type: string;
    is_retailer: boolean;
    credit_limit?: string;
    phone?: string;
    email?: string;
    is_active: boolean;
}

interface CustomersResponse {
    parties?: Customer[];
}

interface QuotationTemplate {
    id: string;
    name: string;
    description?: string;
    plan?: string;
    plan_name?: string;
    validity_days?: number;
    last_forever?: boolean;
    end_after_value?: string;
    end_after_period?: string;
    products?: Array<{
        product: string;
        quantity: string;
        description: string;
    }>;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

interface QuotationTemplatesResponse {
    templates?: QuotationTemplate[];
}

interface RecurringPlan {
    id: string;
    name: string;
    billing_period: string;
    billing_interval: number;
    duration?: number;
    reminder_days?: number;
    closable?: boolean;
    pausable?: boolean;
    resumable?: boolean;
    is_active?: boolean;
}

interface RecurringPlansResponse {
    recurring_plans?: RecurringPlan[];
}

interface OrderLine {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    taxes: number;
    amount: number;
}

// Helper function to get appropriate badge color for status
const getStatusBadgeColor = (status: SubscriptionStatus) => {
    switch (status) {
        case "Quotation":
            return "bg-gray-500 hover:bg-gray-600"
        case "Quotation Sent":
            return "bg-yellow-500 hover:bg-yellow-600"
        case "Confirmed":
            return "bg-green-600 hover:bg-green-700"
        default:
            return "bg-gray-500"
    }
}

export default function CreateSubscriptionPage() {
    const [status, setStatus] = useState<SubscriptionStatus>("Quotation")
    const [activeTab, setActiveTab] = useState("orderLines")
    const [showInvoice, setShowInvoice] = useState(false)
    const [invoiceState, setInvoiceState] = useState<"Draft" | "Confirmed">("Draft")
    const [subscriptionNumber, setSubscriptionNumber] = useState<string>("Loading...")
    const [products, setProducts] = useState<Product[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [quotationTemplates, setQuotationTemplates] = useState<QuotationTemplate[]>([])
    const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingCustomers, setLoadingCustomers] = useState(false)
    const [loadingTemplates, setLoadingTemplates] = useState(false)
    const [loadingPlans, setLoadingPlans] = useState(false)
    const [orderLines, setOrderLines] = useState<OrderLine[]>([])
    const [invoiceOrderLines, setInvoiceOrderLines] = useState<OrderLine[]>([])
    
    // Form field states
    const [selectedCustomer, setSelectedCustomer] = useState<string>("")
    const [selectedTemplate, setSelectedTemplate] = useState<string>("")
    const [selectedRecurringPlan, setSelectedRecurringPlan] = useState<string>("")
    const [expiration, setExpiration] = useState<string>("")
    const [orderDate, setOrderDate] = useState<string>("")
    const [paymentTerms, setPaymentTerms] = useState<string>("")
    const [nextInvoice, setNextInvoice] = useState<string>("")
    const [salesperson, setSalesperson] = useState<string>("")
    const [startDate, setStartDate] = useState<string>("")
    const [paymentMethod, setPaymentMethod] = useState<string>("")
    const [paymentDone, setPaymentDone] = useState<boolean>(false)
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null)

    // Fetch subscription number and products on component mount
    useEffect(() => {
        fetchSubscriptionNumber()
        fetchProducts()
        fetchCustomers()
        fetchQuotationTemplates()
        fetchRecurringPlans()
    }, [])

    const fetchSubscriptionNumber = async () => {
        try {
            // Generate subscription number based on current count
            const response = await apiClient.get('/subscriptions/subscriptions/')
            const count = (response.data as { subscriptions?: unknown[] })?.subscriptions?.length || 0
            const newNumber = `SUB${String(count + 1).padStart(5, '0')}`
            setSubscriptionNumber(newNumber)
        } catch (error) {
            console.error('Error fetching subscription number:', error)
            setSubscriptionNumber('SUB00001')
        }
    }

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const response = await apiClient.get<ProductsResponse>('/catalog/products/')
            setProducts(response.data?.products || [])
        } catch (error) {
            console.error('Error fetching products:', error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const fetchCustomers = async () => {
        try {
            setLoadingCustomers(true)
            const response = await apiClient.get<any>('/party/?party_type=CUSTOMER')
            console.log('Customers response:', response.data)
            // Handle the response - should have a 'parties' property
            let customerData = response.data?.parties || response.data || []
            if (!Array.isArray(customerData)) {
                customerData = []
            }
            console.log('Processed customers:', customerData.length, 'customers')
            setCustomers(customerData)
        } catch (error) {
            console.error('Error fetching customers:', error)
            setCustomers([])
        } finally {
            setLoadingCustomers(false)
        }
    }

    const fetchQuotationTemplates = async () => {
        try {
            setLoadingTemplates(true)
            const response = await apiClient.get<any>('/subscriptions/quotation-templates-config/')
            console.log('Quotation templates response:', response.data)
            
            // Handle different response structures
            let templateData = response.data
            if (templateData && typeof templateData === 'object') {
                // Check for 'templates' property (backend returns this)
                if (templateData.templates) {
                    templateData = templateData.templates
                }
                // Check for 'quotation_templates' property (legacy)
                else if (templateData.quotation_templates) {
                    templateData = templateData.quotation_templates
                }
                // If response is a single object, wrap it in an array
                else if (!Array.isArray(templateData) && templateData.id) {
                    templateData = [templateData]
                }
            }
            
            const finalData = Array.isArray(templateData) ? templateData : []
            console.log('Final quotation templates data:', finalData, 'Count:', finalData.length)
            setQuotationTemplates(finalData)
        } catch (error) {
            console.error('Error fetching quotation templates:', error)
            setQuotationTemplates([])
        } finally {
            setLoadingTemplates(false)
        }
    }

    const fetchRecurringPlans = async () => {
        try {
            setLoadingPlans(true)
            const response = await apiClient.get<any>('/subscriptions/recurring-plans/')
            console.log('Recurring plans response:', response.data)
            console.log('Response.data type:', typeof response.data, 'Is array:', Array.isArray(response.data))
            
            // Handle the response - it might be an array or an object with various properties
            let planData = response.data
            if (planData && typeof planData === 'object') {
                // Check for paginated response (DRF format with 'results')
                if (planData.results) {
                    planData = planData.results
                }
                // Check for 'plans' property (common API structure)
                else if (planData.plans) {
                    planData = planData.plans
                }
                // If it's an object with a recurring_plans property, use that
                else if (planData.recurring_plans) {
                    planData = planData.recurring_plans
                }
                // If the response is a single object (not an array), wrap it
                else if (!Array.isArray(planData) && planData.id) {
                    planData = [planData]
                }
            }
            
            const finalData = Array.isArray(planData) ? planData : []
            console.log('Final recurring plans data:', finalData, 'Count:', finalData.length)
            setRecurringPlans(finalData)
        } catch (error) {
            console.error('Error fetching recurring plans:', error)
            setRecurringPlans([])
        } finally {
            setLoadingPlans(false)
        }
    }

    const addOrderLine = () => {
        const newLine: OrderLine = {
            id: `line-${Date.now()}`,
            product_id: '',
            product_name: '',
            quantity: 1,
            unit_price: 0,
            discount: 0,
            taxes: 0,
            amount: 0
        }
        setOrderLines([...orderLines, newLine])
    }

    const addInvoiceOrderLine = () => {
        const newLine: OrderLine = {
            id: `line-${Date.now()}`,
            product_id: '',
            product_name: '',
            quantity: 1,
            unit_price: 0,
            discount: 0,
            taxes: 0,
            amount: 0
        }
        setInvoiceOrderLines([...invoiceOrderLines, newLine])
    }

    const updateOrderLine = (id: string, field: keyof OrderLine, value: any) => {
        setOrderLines(orderLines.map(line => {
            if (line.id === id) {
                const updated = { ...line, [field]: value }
                // Recalculate amount
                if (field === 'quantity' || field === 'unit_price' || field === 'discount' || field === 'taxes') {
                    const subtotal = updated.quantity * updated.unit_price
                    updated.amount = subtotal - updated.discount + updated.taxes
                }
                // Update product name when product is selected
                if (field === 'product_id') {
                    const product = products.find(p => p.id === value)
                    if (product) {
                        updated.product_name = product.name
                        updated.unit_price = parseFloat(product.price) || 0
                        updated.amount = updated.quantity * updated.unit_price - updated.discount + updated.taxes
                    }
                }
                return updated
            }
            return line
        }))
    }

    const updateInvoiceOrderLine = (id: string, field: keyof OrderLine, value: any) => {
        setInvoiceOrderLines(invoiceOrderLines.map(line => {
            if (line.id === id) {
                const updated = { ...line, [field]: value }
                if (field === 'quantity' || field === 'unit_price' || field === 'discount' || field === 'taxes') {
                    const subtotal = updated.quantity * updated.unit_price
                    updated.amount = subtotal - updated.discount + updated.taxes
                }
                if (field === 'product_id') {
                    const product = products.find(p => p.id === value)
                    if (product) {
                        updated.product_name = product.name
                        updated.unit_price = parseFloat(product.price) || 0
                        updated.amount = updated.quantity * updated.unit_price - updated.discount + updated.taxes
                    }
                }
                return updated
            }
            return line
        }))
    }

    const removeOrderLine = (id: string) => {
        setOrderLines(orderLines.filter(line => line.id !== id))
    }

    const removeInvoiceOrderLine = (id: string) => {
        setInvoiceOrderLines(invoiceOrderLines.filter(line => line.id !== id))
    }

    const calculateTotal = (lines: OrderLine[]) => {
        return lines.reduce((sum, line) => sum + line.amount, 0).toFixed(2)
    }

    const handleTemplateSelection = (templateId: string) => {
        setSelectedTemplate(templateId)
        // Find the selected template
        const selectedTemplate = quotationTemplates.find(t => t.id === templateId)
        if (!selectedTemplate || !selectedTemplate.products || selectedTemplate.products.length === 0) {
            return
        }

        // Clear existing order lines and add template products
        const newOrderLines: OrderLine[] = selectedTemplate.products.map((templateProduct: any) => {
            // Find product details from products state
            const productDetails = products.find(p => p.id === templateProduct.product)
            const unitPrice = productDetails ? parseFloat(productDetails.price || '0') : 0

            return {
                id: `line-${Date.now()}-${Math.random()}`,
                product_id: templateProduct.product,
                product_name: productDetails?.name || '',
                quantity: parseInt(templateProduct.quantity) || 1,
                unit_price: unitPrice,
                discount: 0,
                taxes: 0,
                amount: (parseInt(templateProduct.quantity) || 1) * unitPrice
            }
        })

        setOrderLines(newOrderLines)
    }

    const handleSendSubscription = async () => {
        try {
            setLoading(true)
            
            // Validate required fields
            if (!selectedCustomer) {
                alert('Please select a customer')
                return
            }
            if (!selectedRecurringPlan) {
                alert('Please select a recurring plan')
                return
            }
            if (orderLines.length === 0) {
                alert('Please add at least one order line')
                return
            }

            // Prepare subscription data
            const subscriptionData = {
                party: selectedCustomer,
                plan: selectedRecurringPlan,
                quotation_template: selectedTemplate || null,
                start_date: startDate || new Date().toISOString().split('T')[0],
                end_date: expiration || null,
                next_billing_date: nextInvoice || new Date().toISOString().split('T')[0],
                payment_terms: paymentTerms || null,
                payment_method: paymentMethod || null,
                payment_done: paymentDone,
                status: 'QUOTATION',
                currency: null // Will be set by backend based on company default
            }

            // Create subscription
            const response = await apiClient.post<{ id: string }>('/subscriptions/subscriptions/', subscriptionData)
            const createdSubscription = response.data as { id: string }
            if (!createdSubscription?.id) {
                throw new Error('Failed to create subscription: no ID returned')
            }
            setSubscriptionId(createdSubscription.id)

            // Create subscription items (order lines)
            const itemPromises = orderLines.map(line => 
                apiClient.post(`/subscriptions/subscriptions/${createdSubscription.id}/items/`, {
                    product: line.product_id,
                    quantity: line.quantity,
                    unit_price: line.unit_price,
                    discount_pct: line.discount,
                    tax_rate: line.taxes,
                    description: line.product_name
                })
            )

            await Promise.all(itemPromises)

            // Update status to Quotation Sent
            setStatus("Quotation Sent")
            alert('Subscription sent successfully!')
        } catch (error: any) {
            console.error('Error sending subscription:', error)
            alert(`Failed to send subscription: ${error.response?.data?.error || error.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmSubscription = async () => {
        try {
            setLoading(true)
            
            // If subscription doesn't exist yet, create it first with CONFIRMED status
            if (!subscriptionId) {
                // Validate required fields
                if (!selectedCustomer) {
                    alert('Please select a customer')
                    return
                }
                if (!selectedRecurringPlan) {
                    alert('Please select a recurring plan')
                    return
                }
                if (orderLines.length === 0) {
                    alert('Please add at least one order line')
                    return
                }

                // Prepare subscription data
                const subscriptionData = {
                    party: selectedCustomer,
                    plan: selectedRecurringPlan,
                    quotation_template: selectedTemplate || null,
                    start_date: startDate || new Date().toISOString().split('T')[0],
                    end_date: expiration || null,
                    next_billing_date: nextInvoice || new Date().toISOString().split('T')[0],
                    payment_terms: paymentTerms || null,
                    payment_method: paymentMethod || null,
                    payment_done: paymentDone,
                    status: 'CONFIRMED',
                    currency: null // Will be set by backend based on company default
                }

                // Create subscription
                const response = await apiClient.post<{ id: string }>('/subscriptions/subscriptions/', subscriptionData)
                const createdSubscription = response.data
                if (!createdSubscription?.id) {
                    throw new Error('Failed to create subscription: no ID returned')
                }
                setSubscriptionId(createdSubscription.id)

                // Create subscription items (order lines)
                const itemPromises = orderLines.map(line => 
                    apiClient.post(`/subscriptions/subscriptions/${createdSubscription.id}/items/`, {
                        product: line.product_id,
                        quantity: line.quantity,
                        unit_price: line.unit_price,
                        discount_pct: line.discount,
                        tax_rate: line.taxes,
                        description: line.product_name
                    })
                )

                await Promise.all(itemPromises)
            } else {
                // Update existing subscription status to CONFIRMED
                await apiClient.post(`/subscriptions/subscriptions/${subscriptionId}/status/`, {
                    action: 'confirm'
                })
            }

            // Update status to Confirmed
            setStatus("Confirmed")
            alert('Subscription confirmed successfully!')
        } catch (error: any) {
            console.error('Error confirming subscription:', error)
            alert(`Failed to confirm subscription: ${error.response?.data?.error || error.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header Section with Status Indicator */}
            <div className="mb-6 max-w-7xl mx-auto">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-sm text-gray-400 mb-1">Once the Order is confirmed, no one can make any changes to the order line.</p>
                        <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
                    </div>
                    {/* Status Badge - Top Right */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300 font-medium">State of subscription:</span>
                        <Badge className={`${getStatusBadgeColor(status)} text-white px-4 py-1.5 text-sm font-medium`}>
                            {status}
                        </Badge>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap border-t border-b border-gray-700 py-3">
                    {status === "Quotation" ? (
                        <>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                New
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                            <Button
                                size="sm"
                                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={handleSendSubscription}
                                disabled={loading}
                            >
                                <Send className="h-4 w-4" />
                                {loading ? 'Sending...' : 'Send'}
                            </Button>
                            <Button
                                size="sm"
                                className="gap-2 bg-green-600 hover:bg-green-700"
                                onClick={handleConfirmSubscription}
                                disabled={loading}
                            >
                                <Check className="h-4 w-4" />
                                {loading ? 'Confirming...' : 'Confirm'}
                            </Button>
                        </>
                    ) : status === "Quotation Sent" ? (
                        <>
                            <Button
                                size="sm"
                                className="gap-2 bg-green-600 hover:bg-green-700"
                                onClick={() => setStatus("Confirmed")}
                            >
                                <Check className="h-4 w-4" />
                                Confirm
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setStatus("Quotation")}
                            >
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                        </>
                    ) : status === "Confirmed" ? (
                        <>
                            <Button
                                size="sm"
                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                                onClick={() => setShowInvoice(true)}
                            >
                                <FileText className="h-4 w-4" />
                                Create Invoice
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Renew
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Upsell
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700">
                                <X className="h-4 w-4" />
                                Close
                            </Button>
                        </>
                    ) : null}
                </div>
            </div>

            {/* Main Content Area - Conditional Rendering */}
            {showInvoice ? (
                <div className="space-y-6 max-w-7xl mx-auto">
                    {/* Invoice View Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Invoice Details</h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowInvoice(false)}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Back to Subscription
                        </Button>
                    </div>

                    {/* Invoice Action Buttons */}
                    <div className="flex gap-2 flex-wrap border-t border-b border-gray-700 py-3">
                        {invoiceState === "Draft" ? (
                            <>
                                <Button
                                    size="sm"
                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                    onClick={() => setInvoiceState("Confirmed")}
                                >
                                    <Check className="h-4 w-4" />
                                    Confirm Invoice
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Send className="h-4 w-4" />
                                    Send by Email
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2 text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                                    <FileText className="h-4 w-4" />
                                    Register Payment
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Send className="h-4 w-4" />
                                    Send by Email
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Invoice Form Card */}
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="pt-0">
                            {invoiceState === "Draft" ? (
                                <>
                                    {/* Invoice Fields Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="invoiceCustomer" className="text-sm font-medium text-white">Customer Name</Label>
                                            <Select>
                                                <SelectTrigger id="invoiceCustomer" className="bg-gray-700 border-gray-600 text-white">
                                                    <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select Customer..."} className="text-white" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                    {customers.map((customer) => (
                                                        <SelectItem key={customer.id} value={customer.id.toString()}>
                                                            {customer.name} {customer.email && `(${customer.email})`}
                                                        </SelectItem>
                                                    ))}
                                                    {customers.length === 0 && !loadingCustomers && (
                                                        <SelectItem value="no-customers" disabled>
                                                            No customers available
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="invoiceDate" className="text-sm font-medium text-white">Invoice Date</Label>
                                            <Input id="invoiceDate" type="date" className="text-white bg-gray-700 border-gray-600" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dueDate" className="text-sm font-medium text-white">Due Date</Label>
                                            <Input id="dueDate" type="date" className="text-white bg-gray-700 border-gray-600" />
                                        </div>
                                    </div>

                                    {/* Tabs for Order Lines and Other Info */}
                                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                                        <TabsList className="bg-gray-700 border-gray-600 grid w-full max-w-md grid-cols-2 mb-4">
                                            <TabsTrigger value="orderLines" className="text-sm data-[state=active]:bg-gray-600">Order Lines</TabsTrigger>
                                            <TabsTrigger value="otherInfo" className="text-sm data-[state=active]:bg-gray-600">Other Info</TabsTrigger>
                                        </TabsList>

                                        {/* Order Lines Tab */}
                                        <TabsContent value="orderLines" className="mt-4 space-y-4">
                                        <div className="rounded-lg border border-gray-700 overflow-hidden bg-gray-800\">
                                            <Table>
                                                <TableHeader className="bg-gray-700">
                                                    <TableRow>
                                                        <TableHead className="font-semibold text-white">Product</TableHead>
                                                        <TableHead className="font-semibold text-white">Quantity</TableHead>
                                                        <TableHead className="font-semibold text-white">Unit Price</TableHead>
                                                        <TableHead className="font-semibold text-white">Discount</TableHead>
                                                        <TableHead className="font-semibold text-white">Taxes</TableHead>
                                                        <TableHead className="text-right font-semibold text-white">
                                                            Amount
                                                        </TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {loading ? (
                                                        <TableRow>
                                                            <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                                                                <p className="text-base font-medium">Loading products...</p>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : invoiceOrderLines.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={7}
                                                                className="text-center py-12 text-gray-400"
                                                            >
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <FileText className="h-12 w-12 text-gray-500" />
                                                                    <p className="text-base">No order lines added yet</p>
                                                                    <p className="text-sm text-gray-500">Click "Add Line" below to get started</p>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        invoiceOrderLines.map((line) => (
                                                            <TableRow key={line.id}>
                                                                <TableCell className="p-2">
                                                                    <Select value={line.product_id} onValueChange={(value) => updateInvoiceOrderLine(line.id, 'product_id', value)}>
                                                                        <SelectTrigger className="border-gray-600 bg-gray-700 text-white">
                                                                            <SelectValue placeholder="Select product..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                                            {products.map((product) => (
                                                                                <SelectItem key={product.id} value={product.id}>
                                                                                    {product.name} ({product.sku})
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        value={line.quantity} 
                                                                        onChange={(e) => updateInvoiceOrderLine(line.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                        min="1" 
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={line.unit_price}
                                                                        onChange={(e) => updateInvoiceOrderLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                        placeholder="0.00" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={line.discount}
                                                                        onChange={(e) => updateInvoiceOrderLine(line.id, 'discount', parseFloat(e.target.value) || 0)}
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={line.taxes}
                                                                        onChange={(e) => updateInvoiceOrderLine(line.id, 'taxes', parseFloat(e.target.value) || 0)}
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right p-2 text-white font-medium">
                                                                    ${line.amount.toFixed(2)}
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                        onClick={() => removeInvoiceOrderLine(line.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="gap-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                                                onClick={addInvoiceOrderLine}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Line
                                            </Button>
                                            <div className="text-sm font-medium text-white">
                                                Total: <span className="text-white text-base">${calculateTotal(invoiceOrderLines)}</span>
                                            </div>
                                        </div>
                                        </TabsContent>

                                        {/* Other Info Tab */}
                                        <TabsContent value="otherInfo" className="mt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
                                                <div className="space-y-2">
                                                <Label htmlFor="salesperson" className="text-sm font-medium text-white">Salesperson</Label>
                                                <Input
                                                    id="salesperson"
                                                    placeholder="Enter salesperson name"
                                                    className="border-gray-600 bg-gray-700 text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                <Label htmlFor="startDate" className="text-sm font-medium text-white">Start Date</Label>
                                                <Input id="startDate" type="date" className="border-gray-600 bg-gray-700 text-white" />
                                                </div>
                                                <div className="space-y-2">
                                                <Label htmlFor="paymentMethod" className="text-sm font-medium text-white">Payment Method</Label>
                                                <Select>
                                                    <SelectTrigger id="paymentMethod" className="border-gray-600 bg-gray-700 text-white">
                                                        <SelectValue placeholder="Select method..." className="text-white" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                        <SelectItem value="credit_card">
                                                            Credit Card
                                                        </SelectItem>
                                                        <SelectItem value="bank_transfer">
                                                            Bank Transfer
                                                        </SelectItem>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                        <SelectItem value="check">Check</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                </div>
                                                <div className="space-y-2 flex items-center gap-2 pt-8">
                                                    <input
                                                        type="checkbox"
                                                        id="paymentDone"
                                                        className="h-4 w-4 rounded border-gray-600"
                                                    />
                                                    <Label htmlFor="paymentDone" className="cursor-pointer text-sm font-medium text-white">
                                                        Payment Done
                                                    </Label>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="rounded-full bg-green-900 p-4">
                                            <Check className="h-12 w-12 text-green-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white mb-2">Invoice Confirmed</h3>
                                            <p className="text-gray-400">The invoice has been confirmed successfully.</p>
                                        </div>
                                        <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Register Payment
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto">
                    {/* Form Card */}
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="pt-0">
                            {/* Top Grid - Subscription Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 mb-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="subscriptionNumber" className="text-sm font-medium text-white">
                                            Subscription Number
                                        </Label>
                                        <Input
                                            id="subscriptionNumber"
                                            value={subscriptionNumber}
                                            readOnly
                                            className="bg-gray-700 border-gray-600 text-white font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer" className="text-sm font-medium text-white">
                                            Customer
                                        </Label>
                                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                            <SelectTrigger id="customer" className="border-gray-600 bg-gray-700 text-white">
                                                <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select Customer..."} className="text-white" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                {customers.map((customer) => (
                                                    <SelectItem key={customer.id} value={customer.id}>
                                                        {customer.name} {customer.email && `(${customer.email})`}
                                                    </SelectItem>
                                                ))}
                                                {customers.length === 0 && !loadingCustomers && (
                                                    <SelectItem value="no-customers" disabled>
                                                        No customers available
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="quotationTemplate" className="text-sm font-medium text-white">
                                            Quotation Template
                                        </Label>
                                        <Select onValueChange={handleTemplateSelection}>
                                            <SelectTrigger id="quotationTemplate" className="border-gray-600 bg-gray-700 text-white">
                                                <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select template..."} className="text-white" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                {quotationTemplates.map((template) => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.name}
                                                    </SelectItem>
                                                ))}
                                                {quotationTemplates.length === 0 && !loadingTemplates && (
                                                    <SelectItem value="no-templates" disabled>
                                                        No templates available
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    {status === "Confirmed" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="orderDate" className="text-sm font-medium text-white">Order Date</Label>
                                            <Input id="orderDate" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="border-gray-600 bg-gray-700 text-white" />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="expiration" className="text-sm font-medium text-white">
                                            Expiration
                                        </Label>
                                        <Input id="expiration" type="date" value={expiration} onChange={(e) => setExpiration(e.target.value)} className="border-gray-600 bg-gray-700 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="recurringPlan" className="text-sm font-medium text-white">
                                            Recurring Plan
                                        </Label>
                                        <Select value={selectedRecurringPlan} onValueChange={setSelectedRecurringPlan}>
                                            <SelectTrigger id="recurringPlan" className="border-gray-600 bg-gray-700 text-white">
                                                <SelectValue placeholder={loadingPlans ? "Loading plans..." : "Select recurring plan..."} className="text-white" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                {recurringPlans.map((plan) => (
                                                    <SelectItem key={plan.id} value={plan.id}>
                                                        {plan.name} ({plan.billing_period})
                                                    </SelectItem>
                                                ))}
                                                {recurringPlans.length === 0 && !loadingPlans && (
                                                    <SelectItem value="no-plans" disabled>
                                                        No plans available
                                                    </SelectItem>
                                                )}\n                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="paymentTerms" className="text-sm font-medium text-white">
                                            Payment Terms
                                        </Label>
                                        <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                                            <SelectTrigger id="paymentTerms" className="border-gray-600 bg-gray-700 text-white">
                                                <SelectValue placeholder="Select payment terms..." className="text-white" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                <SelectItem value="immediate">Immediate</SelectItem>
                                                <SelectItem value="15days">15 Days</SelectItem>
                                                <SelectItem value="30days">30 Days</SelectItem>
                                                <SelectItem value="60days">60 Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {status === "Confirmed" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="nextInvoice" className="text-sm font-medium text-white">
                                                Next Invoice
                                            </Label>
                                            <Input id="nextInvoice" type="date" value={nextInvoice} onChange={(e) => setNextInvoice(e.target.value)} className="border-gray-600 bg-gray-700 text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tabs Section */}
                            <div className="border-t border-gray-700 pt-6 mt-6">
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList className="bg-gray-700 border-gray-600 grid w-full max-w-md grid-cols-2 mb-4">
                                        <TabsTrigger value="orderLines" className="text-sm data-[state=active]:bg-gray-600">
                                            Order Lines
                                        </TabsTrigger>
                                        <TabsTrigger value="otherInfo" className="text-sm data-[state=active]:bg-gray-600">
                                            Other Info
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Order Lines Tab */}
                                    <TabsContent value="orderLines" className="mt-4 space-y-4">
                                        <div className="rounded-lg border border-gray-700 overflow-hidden bg-gray-800">
                                            <Table>
                                                <TableHeader className="bg-gray-700">
                                                    <TableRow>
                                                        <TableHead className="font-semibold text-white">Product</TableHead>
                                                        <TableHead className="font-semibold text-white">Quantity</TableHead>
                                                        <TableHead className="font-semibold text-white">Unit Price</TableHead>
                                                        <TableHead className="font-semibold text-white">Discount</TableHead>
                                                        <TableHead className="font-semibold text-white">Taxes</TableHead>
                                                        <TableHead className="text-right font-semibold text-white">
                                                            Amount
                                                        </TableHead>
                                                        <TableHead className="w-[50px]"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {orderLines.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell
                                                                colSpan={7}
                                                                className="text-center py-12 text-gray-400"
                                                            >
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <FileText className="h-12 w-12 text-gray-500" />
                                                                    <p className="text-base">No order lines added yet</p>
                                                                    <p className="text-sm text-gray-500">Click "Add Line" below to get started</p>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        orderLines.map((line) => (
                                                            <TableRow key={line.id}>
                                                                <TableCell className="p-2">
                                                                    <Select value={line.product_id} onValueChange={(value) => updateOrderLine(line.id, 'product_id', value)}>
                                                                        <SelectTrigger className="border-gray-600 bg-gray-700 text-white">
                                                                            <SelectValue placeholder="Select product..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                                            {products.map((product) => (
                                                                                <SelectItem key={product.id} value={product.id}>
                                                                                    {product.name} ({product.sku})
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        value={line.quantity} 
                                                                        onChange={(e) => updateOrderLine(line.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                        min="1" 
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={line.unit_price}
                                                                        onChange={(e) => updateOrderLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                        placeholder="0.00" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={line.discount}
                                                                        onChange={(e) => updateOrderLine(line.id, 'discount', parseFloat(e.target.value) || 0)}
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Input 
                                                                        type="number" 
                                                                        step="0.01" 
                                                                        value={line.taxes}
                                                                        onChange={(e) => updateOrderLine(line.id, 'taxes', parseFloat(e.target.value) || 0)}
                                                                        className="border-gray-600 bg-gray-700 text-white" 
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right p-2 text-white font-medium">
                                                                    ${line.amount.toFixed(2)}
                                                                </TableCell>
                                                                <TableCell className="p-2">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                        onClick={() => removeOrderLine(line.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="gap-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                                                onClick={addOrderLine}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Line
                                            </Button>
                                            <div className="text-sm font-medium text-white">
                                                Total: <span className="text-white text-base">${calculateTotal(orderLines)}</span>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Other Info Tab */}
                                    <TabsContent value="otherInfo" className="mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
                                            <div className="space-y-2">
                                                <Label htmlFor="salesperson" className="text-sm font-medium text-white">
                                                    Salesperson
                                                </Label>
                                                <Input
                                                    id="salesperson"
                                                    placeholder="Enter salesperson name"
                                                    value={salesperson}
                                                    onChange={(e) => setSalesperson(e.target.value)}
                                                    className="border-gray-600 bg-gray-700 text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="startDate" className="text-sm font-medium text-white">
                                                    Start Date
                                                </Label>
                                                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-gray-600 bg-gray-700 text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="paymentMethod" className="text-sm font-medium text-white">
                                                    Payment Method
                                                </Label>
                                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                    <SelectTrigger id="paymentMethod" className="border-gray-600 bg-gray-700 text-white">
                                                        <SelectValue placeholder="Select method..." className="text-white" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                        <SelectItem value="credit_card">
                                                            Credit Card
                                                        </SelectItem>
                                                        <SelectItem value="bank_transfer">
                                                            Bank Transfer
                                                        </SelectItem>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                        <SelectItem value="check">Check</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 flex items-center gap-2 pt-8">
                                                <input
                                                    type="checkbox"
                                                    id="paymentDone"
                                                    checked={paymentDone}
                                                    onChange={(e) => setPaymentDone(e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-600"
                                                />
                                                <Label htmlFor="paymentDone" className="cursor-pointer text-sm font-medium text-white">
                                                    Payment Done
                                                </Label>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
