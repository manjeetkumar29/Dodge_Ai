"""
Graph Schema for SAP Order-to-Cash
"""

SCHEMA_INDEXES = [
    "CREATE INDEX sales_order_idx IF NOT EXISTS FOR (n:SalesOrder) ON (n.SalesOrder)",
    "CREATE INDEX sales_order_item_idx IF NOT EXISTS FOR (n:SalesOrderItem) ON (n.SalesOrderItem_Key)",
    "CREATE INDEX sales_order_schedule_idx IF NOT EXISTS FOR (n:SalesOrderScheduleLine) ON (n.SalesOrderScheduleLine_Key)",
    "CREATE INDEX outbound_delivery_idx IF NOT EXISTS FOR (n:OutboundDelivery) ON (n.OutboundDelivery)",
    "CREATE INDEX outbound_delivery_item_idx IF NOT EXISTS FOR (n:OutboundDeliveryItem) ON (n.OutboundDeliveryItem_Key)",
    "CREATE INDEX billing_doc_idx IF NOT EXISTS FOR (n:BillingDocument) ON (n.BillingDocument)",
    "CREATE INDEX billing_doc_item_idx IF NOT EXISTS FOR (n:BillingDocumentItem) ON (n.BillingDocumentItem_Key)",
    "CREATE INDEX billing_cancel_idx IF NOT EXISTS FOR (n:BillingCancellation) ON (n.CancelledBillingDocument)",
    "CREATE INDEX journal_entry_idx IF NOT EXISTS FOR (n:JournalEntry) ON (n.JournalEntry_Key)",
    "CREATE INDEX payment_idx IF NOT EXISTS FOR (n:Payment) ON (n.Payment_Key)",
    "CREATE INDEX business_partner_idx IF NOT EXISTS FOR (n:BusinessPartner) ON (n.BusinessPartner)",
    "CREATE INDEX business_partner_addr_idx IF NOT EXISTS FOR (n:BusinessPartnerAddress) ON (n.BusinessPartnerAddress_Key)",
    "CREATE INDEX customer_company_idx IF NOT EXISTS FOR (n:CustomerCompany) ON (n.CustomerCompany_Key)",
    "CREATE INDEX customer_sales_area_idx IF NOT EXISTS FOR (n:CustomerSalesArea) ON (n.CustomerSalesArea_Key)",
    "CREATE INDEX product_idx IF NOT EXISTS FOR (n:Product) ON (n.Product)",
    "CREATE INDEX product_desc_idx IF NOT EXISTS FOR (n:ProductDescription) ON (n.ProductDescription_Key)",
    "CREATE INDEX product_plant_idx IF NOT EXISTS FOR (n:ProductPlant) ON (n.ProductPlant_Key)",
    "CREATE INDEX product_storage_idx IF NOT EXISTS FOR (n:ProductStorageLocation) ON (n.ProductStorageLocation_Key)",
    "CREATE INDEX plant_idx IF NOT EXISTS FOR (n:Plant) ON (n.Plant)",
]

SCHEMA_DESCRIPTION = """
The SAP Order-to-Cash graph contains these node types:
- SalesOrder: Main sales order header (SalesOrder ID, SalesOrderType, SoldToParty, SalesOrganization, TotalNetAmount, etc.)
- SalesOrderItem: Line items of a sales order (Material, RequestedQuantity, NetAmount, etc.)
- SalesOrderScheduleLine: Schedule lines for delivery (ScheduleLine, ScheduledQuantity, etc.)
- OutboundDelivery: Delivery document header (OutboundDelivery, ShippingPoint, DeliveryDate, etc.)
- OutboundDeliveryItem: Items within a delivery
- BillingDocument: Invoice/billing header (BillingDocument, BillingType, BillingDate, NetAmount, etc.)
- BillingDocumentItem: Line items on a billing document
- BillingCancellation: Cancellation records for billing docs (ALWAYS traverse -[:CANCELS]-> to BillingDocument to get amounts and dates)
- JournalEntry: Accounting entries (AccountingDocument, CompanyCode, GlAccount, Amount, etc.)
- Payment: AR payment records (PaymentDocument, PaymentAmount, etc.)
- BusinessPartner: Customer/partner (BusinessPartner, BusinessPartnerFullName, etc.)
- BusinessPartnerAddress: Address details
- CustomerCompany: Customer's company-level data
- CustomerSalesArea: Customer's sales area assignments
- Product: Material/product master (Product, ProductType, BaseUnit, etc.)
- ProductDescription: Product text descriptions
- ProductPlant: Plant-level product data
- ProductStorageLocation: Storage location data
- Plant: Physical plant/warehouse

Key relationships:
- SalesOrder -[:HAS_ITEM]-> SalesOrderItem
- SalesOrderItem -[:HAS_SCHEDULE]-> SalesOrderScheduleLine
- SalesOrder -[:SOLD_TO]-> BusinessPartner
- SalesOrderItem -[:FOR_PRODUCT]-> Product
- OutboundDelivery -[:FULFILLS]-> SalesOrder
- OutboundDeliveryItem -[:PART_OF_DELIVERY]-> OutboundDelivery
- BillingDocument -[:BILLS]-> SalesOrder
- BillingDocumentItem -[:PART_OF_BILLING]-> BillingDocument
- BillingCancellation -[:CANCELS]-> BillingDocument
- JournalEntry -[:RECORDS]-> BillingDocument
- Payment -[:SETTLES]-> BillingDocument
- BusinessPartner -[:HAS_ADDRESS]-> BusinessPartnerAddress
- BusinessPartner -[:HAS_COMPANY_DATA]-> CustomerCompany
- BusinessPartner -[:HAS_SALES_AREA]-> CustomerSalesArea
- Product -[:HAS_DESCRIPTION]-> ProductDescription
- Product -[:STORED_AT]-> ProductPlant
- ProductPlant -[:HAS_STORAGE]-> ProductStorageLocation
- ProductPlant -[:IN_PLANT]-> Plant
"""
