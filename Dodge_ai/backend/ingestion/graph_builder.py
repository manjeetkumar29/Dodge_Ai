import logging

from database.neo4j_client import run_write_query
from database.schema import SCHEMA_INDEXES
from ingestion.data_loader import df_to_records, load_csv_folder

logger = logging.getLogger(__name__)

BATCH_SIZE = 500


async def initialize_schema() -> None:
    for idx_query in SCHEMA_INDEXES:
        try:
            await run_write_query(idx_query)
        except Exception as exc:
            logger.warning("Index creation warning: %s", exc)
    logger.info("Schema indexes created")


async def _batch_upsert(label: str, id_field: str, records: list[dict]) -> None:
    if not records:
        return

    for index in range(0, len(records), BATCH_SIZE):
        batch = records[index : index + BATCH_SIZE]
        cypher = f"""
        UNWIND $batch AS row
        MERGE (n:{label} {{{id_field}: row.{id_field}}})
        SET n += row
        """
        await run_write_query(cypher, {"batch": batch})

    logger.info("Upserted %s %s nodes", len(records), label)


async def _batch_relate(
    label_a: str,
    id_a: str,
    rel: str,
    label_b: str,
    id_b: str,
    records: list[dict],
    prop_a: str | None = None,
    prop_b: str | None = None,
) -> None:
    if not records:
        return

    prop_a = prop_a or id_a
    prop_b = prop_b or id_b

    for index in range(0, len(records), BATCH_SIZE):
        batch = records[index : index + BATCH_SIZE]
        cypher = f"""
        UNWIND $batch AS row
        MATCH (a:{label_a} {{{id_a}: row.{prop_a}}})
        MATCH (b:{label_b} {{{id_b}: row.{prop_b}}})
        MERGE (a)-[:{rel}]->(b)
        """
        await run_write_query(cypher, {"batch": batch})


async def load_sales_orders() -> None:
    await _batch_upsert("SalesOrder", "SalesOrder", df_to_records(load_csv_folder("sales_order_headers")))


async def load_sales_order_items() -> None:
    records = df_to_records(load_csv_folder("sales_order_items"))
    keyed = [
        {**record, "SalesOrderItem_Key": f"{record.get('SalesOrder')}_{record.get('SalesOrderItem')}"}
        for record in records
    ]
    await _batch_upsert("SalesOrderItem", "SalesOrderItem_Key", keyed)
    await _batch_relate(
        "SalesOrder",
        "SalesOrder",
        "HAS_ITEM",
        "SalesOrderItem",
        "SalesOrderItem_Key",
        [
            {
                "SalesOrder": record.get("SalesOrder"),
                "SalesOrderItem_Key": f"{record.get('SalesOrder')}_{record.get('SalesOrderItem')}",
            }
            for record in records
            if record.get("SalesOrder")
        ],
    )


async def load_sales_order_schedules() -> None:
    records = df_to_records(load_csv_folder("sales_order_schedule_lines"))
    keyed = [
        {
            **record,
            "SalesOrderScheduleLine_Key": f"{record.get('SalesOrder')}_{record.get('SalesOrderItem')}_{record.get('ScheduleLine', '')}",
        }
        for record in records
    ]
    await _batch_upsert("SalesOrderScheduleLine", "SalesOrderScheduleLine_Key", keyed)
    for record in keyed:
        record["SalesOrderItem_Key"] = f"{record.get('SalesOrder')}_{record.get('SalesOrderItem')}"
    await _batch_relate(
        "SalesOrderItem",
        "SalesOrderItem_Key",
        "HAS_SCHEDULE",
        "SalesOrderScheduleLine",
        "SalesOrderScheduleLine_Key",
        keyed,
    )


async def load_outbound_deliveries() -> None:
    records = df_to_records(load_csv_folder("outbound_delivery_headers"))
    await _batch_upsert("OutboundDelivery", "OutboundDelivery", records)

    so_records = [record for record in records if record.get("SalesOrder") or record.get("ReferenceSDDocument")]
    for record in so_records:
        record["_SalesOrder"] = record.get("SalesOrder") or record.get("ReferenceSDDocument")

    if not so_records:
        return

    cypher = """
    UNWIND $batch AS row
    MATCH (d:OutboundDelivery {OutboundDelivery: row.OutboundDelivery})
    MATCH (s:SalesOrder {SalesOrder: row._SalesOrder})
    MERGE (d)-[:FULFILLS]->(s)
    """
    for index in range(0, len(so_records), BATCH_SIZE):
        await run_write_query(cypher, {"batch": so_records[index : index + BATCH_SIZE]})


async def load_outbound_delivery_items() -> None:
    records = df_to_records(load_csv_folder("outbound_delivery_items"))
    keyed = [
        {**record, "OutboundDeliveryItem_Key": f"{record.get('OutboundDelivery')}_{record.get('DeliveryItem', '')}"}
        for record in records
    ]
    await _batch_upsert("OutboundDeliveryItem", "OutboundDeliveryItem_Key", keyed)
    await _batch_relate(
        "OutboundDeliveryItem",
        "OutboundDeliveryItem_Key",
        "PART_OF_DELIVERY",
        "OutboundDelivery",
        "OutboundDelivery",
        keyed,
    )

    delivery_to_order = [record for record in keyed if record.get("ReferenceSDDocument")]
    if delivery_to_order:
        cypher = """
        UNWIND $batch AS row
        MATCH (d:OutboundDelivery {OutboundDelivery: row.OutboundDelivery})
        MATCH (s:SalesOrder {SalesOrder: row.ReferenceSDDocument})
        MERGE (d)-[:FULFILLS]->(s)
        """
        for index in range(0, len(delivery_to_order), BATCH_SIZE):
            await run_write_query(cypher, {"batch": delivery_to_order[index : index + BATCH_SIZE]})


async def load_billing_documents() -> None:
    records = df_to_records(load_csv_folder("billing_document_headers"))
    await _batch_upsert("BillingDocument", "BillingDocument", records)

    so_records = [record for record in records if record.get("ReferenceDocument") or record.get("SalesDocument")]
    for record in so_records:
        record["_SalesOrder"] = record.get("SalesDocument") or record.get("ReferenceDocument")

    if not so_records:
        return

    cypher = """
    UNWIND $batch AS row
    MATCH (b:BillingDocument {BillingDocument: row.BillingDocument})
    MATCH (s:SalesOrder {SalesOrder: row._SalesOrder})
    MERGE (b)-[:BILLS]->(s)
    """
    for index in range(0, len(so_records), BATCH_SIZE):
        await run_write_query(cypher, {"batch": so_records[index : index + BATCH_SIZE]})


async def load_billing_document_items() -> None:
    records = df_to_records(load_csv_folder("billing_document_items"))
    keyed = [
        {
            **record,
            "BillingDocumentItem_Key": f"{record.get('BillingDocument')}_{record.get('BillingDocumentItem', '')}",
        }
        for record in records
    ]
    await _batch_upsert("BillingDocumentItem", "BillingDocumentItem_Key", keyed)
    await _batch_relate(
        "BillingDocumentItem",
        "BillingDocumentItem_Key",
        "PART_OF_BILLING",
        "BillingDocument",
        "BillingDocument",
        keyed,
    )

    billing_to_order = [record for record in keyed if record.get("ReferenceSDDocument")]
    if billing_to_order:
        cypher = """
        UNWIND $batch AS row
        MATCH (b:BillingDocument {BillingDocument: row.BillingDocument})
        MATCH (d:OutboundDelivery {OutboundDelivery: row.ReferenceSDDocument})-[:FULFILLS]->(s:SalesOrder)
        MERGE (b)-[:BILLS]->(s)
        """
        for index in range(0, len(billing_to_order), BATCH_SIZE):
            await run_write_query(cypher, {"batch": billing_to_order[index : index + BATCH_SIZE]})


async def load_billing_cancellations() -> None:
    records = df_to_records(load_csv_folder("billing_document_cancellations"))
    for record in records:
        if not record.get("CancelledBillingDocument") and record.get("BillingDocument"):
            record["CancelledBillingDocument"] = record["BillingDocument"]
    await _batch_upsert("BillingCancellation", "CancelledBillingDocument", records)

    cancel_records = [record for record in records if record.get("CancelledBillingDocument")]
    if not cancel_records:
        return

    cypher = """
    UNWIND $batch AS row
    MATCH (c:BillingCancellation {CancelledBillingDocument: row.CancelledBillingDocument})
    MATCH (b:BillingDocument {BillingDocument: row.CancelledBillingDocument})
    MERGE (c)-[:CANCELS]->(b)
    """
    for index in range(0, len(cancel_records), BATCH_SIZE):
        await run_write_query(cypher, {"batch": cancel_records[index : index + BATCH_SIZE]})


async def load_journal_entries() -> None:
    records = df_to_records(load_csv_folder("journal_entry_items_accounts_receivable"))
    keyed = [
        {
            **record,
            "JournalEntry_Key": f"{record.get('AccountingDocument')}_{record.get('AccountingDocumentItem', '')}_{record.get('CompanyCode', '')}",
        }
        for record in records
    ]
    await _batch_upsert("JournalEntry", "JournalEntry_Key", keyed)

    ref_records = [record for record in keyed if record.get("ReferenceDocument")]
    for record in ref_records:
        record["_BillingDocument"] = record.get("ReferenceDocument")

    if not ref_records:
        return

    cypher = """
    UNWIND $batch AS row
    MATCH (j:JournalEntry {JournalEntry_Key: row.JournalEntry_Key})
    MATCH (b:BillingDocument {BillingDocument: row._BillingDocument})
    MERGE (j)-[:RECORDS]->(b)
    """
    for index in range(0, len(ref_records), BATCH_SIZE):
        await run_write_query(cypher, {"batch": ref_records[index : index + BATCH_SIZE]})


async def load_payments() -> None:
    records = df_to_records(load_csv_folder("payments_accounts_receivable"))
    keyed = [
        {
            **record,
            "Payment_Key": f"{record.get('PaymentDocument', record.get('AccountingDocument', ''))}_{record.get('CompanyCode', '')}",
        }
        for record in records
    ]
    await _batch_upsert("Payment", "Payment_Key", keyed)

    ref_records = [record for record in keyed if record.get("ClearingDocument") or record.get("ReferenceDocument")]
    for record in ref_records:
        record["_BillingDocument"] = record.get("ClearingDocument") or record.get("ReferenceDocument")

    if not ref_records:
        return

    cypher = """
    UNWIND $batch AS row
    MATCH (p:Payment {Payment_Key: row.Payment_Key})
    MATCH (b:BillingDocument {BillingDocument: row._BillingDocument})
    MERGE (p)-[:SETTLES]->(b)
    """
    for index in range(0, len(ref_records), BATCH_SIZE):
        await run_write_query(cypher, {"batch": ref_records[index : index + BATCH_SIZE]})


async def load_business_partners() -> None:
    await _batch_upsert("BusinessPartner", "BusinessPartner", df_to_records(load_csv_folder("business_partners")))


async def load_business_partner_addresses() -> None:
    records = df_to_records(load_csv_folder("business_partner_addresses"))
    keyed = [
        {
            **record,
            "BusinessPartnerAddress_Key": f"{record.get('BusinessPartner')}_{record.get('AddressID', '')}",
        }
        for record in records
    ]
    await _batch_upsert("BusinessPartnerAddress", "BusinessPartnerAddress_Key", keyed)
    await _batch_relate(
        "BusinessPartner",
        "BusinessPartner",
        "HAS_ADDRESS",
        "BusinessPartnerAddress",
        "BusinessPartnerAddress_Key",
        keyed,
    )


async def load_customer_company() -> None:
    records = df_to_records(load_csv_folder("customer_company_assignments"))
    keyed = [
        {**record, "CustomerCompany_Key": f"{record.get('Customer')}_{record.get('CompanyCode', '')}"}
        for record in records
    ]
    await _batch_upsert("CustomerCompany", "CustomerCompany_Key", keyed)
    for record in keyed:
        record["_BusinessPartner"] = record.get("Customer") or record.get("BusinessPartner")

    bp_records = [record for record in keyed if record.get("_BusinessPartner")]
    if not bp_records:
        return

    cypher = """
    UNWIND $batch AS row
    MATCH (bp:BusinessPartner {BusinessPartner: row._BusinessPartner})
    MATCH (cc:CustomerCompany {CustomerCompany_Key: row.CustomerCompany_Key})
    MERGE (bp)-[:HAS_COMPANY_DATA]->(cc)
    """
    for index in range(0, len(bp_records), BATCH_SIZE):
        await run_write_query(cypher, {"batch": bp_records[index : index + BATCH_SIZE]})


async def load_customer_sales_area() -> None:
    records = df_to_records(load_csv_folder("customer_sales_area_assignments"))
    keyed = [
        {
            **record,
            "CustomerSalesArea_Key": f"{record.get('Customer')}_{record.get('SalesOrganization', '')}_{record.get('DistributionChannel', '')}",
        }
        for record in records
    ]
    await _batch_upsert("CustomerSalesArea", "CustomerSalesArea_Key", keyed)
    for record in keyed:
        record["_BusinessPartner"] = record.get("Customer") or record.get("BusinessPartner")

    bp_records = [record for record in keyed if record.get("_BusinessPartner")]
    if not bp_records:
        return

    cypher = """
    UNWIND $batch AS row
    MATCH (bp:BusinessPartner {BusinessPartner: row._BusinessPartner})
    MATCH (csa:CustomerSalesArea {CustomerSalesArea_Key: row.CustomerSalesArea_Key})
    MERGE (bp)-[:HAS_SALES_AREA]->(csa)
    """
    for index in range(0, len(bp_records), BATCH_SIZE):
        await run_write_query(cypher, {"batch": bp_records[index : index + BATCH_SIZE]})


async def load_products() -> None:
    await _batch_upsert("Product", "Product", df_to_records(load_csv_folder("products")))
    cypher = """
    MATCH (i:SalesOrderItem)
    WHERE i.Material IS NOT NULL
    MATCH (p:Product {Product: i.Material})
    MERGE (i)-[:FOR_PRODUCT]->(p)
    """
    await run_write_query(cypher)


async def load_product_descriptions() -> None:
    records = df_to_records(load_csv_folder("product_descriptions"))
    keyed = [
        {**record, "ProductDescription_Key": f"{record.get('Product')}_{record.get('Language', '')}"}
        for record in records
    ]
    await _batch_upsert("ProductDescription", "ProductDescription_Key", keyed)
    await _batch_relate(
        "Product",
        "Product",
        "HAS_DESCRIPTION",
        "ProductDescription",
        "ProductDescription_Key",
        keyed,
    )


async def load_plants() -> None:
    await _batch_upsert("Plant", "Plant", df_to_records(load_csv_folder("plants")))


async def load_product_plants() -> None:
    records = df_to_records(load_csv_folder("product_plants"))
    keyed = [
        {**record, "ProductPlant_Key": f"{record.get('Product')}_{record.get('Plant', '')}"}
        for record in records
    ]
    await _batch_upsert("ProductPlant", "ProductPlant_Key", keyed)
    await _batch_relate("Product", "Product", "STORED_AT", "ProductPlant", "ProductPlant_Key", keyed)
    await _batch_relate("ProductPlant", "ProductPlant_Key", "IN_PLANT", "Plant", "Plant", keyed)


async def load_product_storage_locations() -> None:
    records = df_to_records(load_csv_folder("product_storage_locations"))
    keyed = [
        {
            **record,
            "ProductStorageLocation_Key": f"{record.get('Product')}_{record.get('Plant', '')}_{record.get('StorageLocation', '')}",
            "ProductPlant_Key": f"{record.get('Product')}_{record.get('Plant', '')}",
        }
        for record in records
    ]
    await _batch_upsert("ProductStorageLocation", "ProductStorageLocation_Key", keyed)
    await _batch_relate(
        "ProductPlant",
        "ProductPlant_Key",
        "HAS_STORAGE",
        "ProductStorageLocation",
        "ProductStorageLocation_Key",
        keyed,
    )


async def link_sales_orders_to_partners() -> None:
    cypher = """
    MATCH (s:SalesOrder)
    WHERE s.SoldToParty IS NOT NULL
    MATCH (bp:BusinessPartner {BusinessPartner: s.SoldToParty})
    MERGE (s)-[:SOLD_TO]->(bp)
    """
    await run_write_query(cypher)


async def link_extended_relationships() -> None:
    queries = [
        # Billing Headers to Customer
        """
        MATCH (b:BillingDocument)
        WHERE b.SoldToParty IS NOT NULL
        MATCH (bp:BusinessPartner {BusinessPartner: b.SoldToParty})
        MERGE (b)-[:BILLED_TO]->(bp)
        """,
        """
        MATCH (c:BillingCancellation)
        WHERE c.SoldToParty IS NOT NULL
        MATCH (bp:BusinessPartner {BusinessPartner: c.SoldToParty})
        MERGE (c)-[:CANCELLED_FOR]->(bp)
        """,
        # Accounting to Customer
        """
        MATCH (p:Payment)
        WHERE p.Customer IS NOT NULL
        MATCH (bp:BusinessPartner {BusinessPartner: p.Customer})
        MERGE (p)-[:FROM_CUSTOMER]->(bp)
        """,
        """
        MATCH (j:JournalEntry)
        WHERE j.Customer IS NOT NULL
        MATCH (bp:BusinessPartner {BusinessPartner: j.Customer})
        MERGE (j)-[:FOR_CUSTOMER]->(bp)
        """,
        # Item to Product Linking
        """
        MATCH (i:BillingDocumentItem)
        WHERE i.Material IS NOT NULL
        MATCH (p:Product {Product: i.Material})
        MERGE (i)-[:FOR_PRODUCT]->(p)
        """,
        # OutboundDeliveryItem to SalesOrderItem
        """
        MATCH (d:OutboundDeliveryItem)
        WHERE d.ReferenceSDDocument IS NOT NULL AND d.ReferenceSDDocumentItem IS NOT NULL
        MATCH (s:SalesOrderItem {SalesOrderItem_Key: d.ReferenceSDDocument + '_' + d.ReferenceSDDocumentItem})
        MERGE (d)-[:DELIVERED_FROM_ORDER_ITEM]->(s)
        """,
        # BillingDocumentItem to OutboundDeliveryItem
        """
        MATCH (b:BillingDocumentItem)
        WHERE b.ReferenceSDDocument IS NOT NULL AND b.ReferenceSDDocumentItem IS NOT NULL
        MATCH (d:OutboundDeliveryItem {OutboundDeliveryItem_Key: b.ReferenceSDDocument + '_' + b.ReferenceSDDocumentItem})
        MERGE (b)-[:BILLED_FROM_DELIVERY_ITEM]->(d)
        """,
        # BillingDocumentItem to SalesOrderItem
        """
        MATCH (b:BillingDocumentItem)
        WHERE b.ReferenceSDDocument IS NOT NULL AND b.ReferenceSDDocumentItem IS NOT NULL
        MATCH (s:SalesOrderItem {SalesOrderItem_Key: b.ReferenceSDDocument + '_' + b.ReferenceSDDocumentItem})
        MERGE (b)-[:BILLED_FROM_ORDER_ITEM]->(s)
        """,
        # SalesOrderItem to Plant
        """
        MATCH (s:SalesOrderItem)
        WHERE s.ProductionPlant IS NOT NULL
        MATCH (p:Plant {Plant: s.ProductionPlant})
        MERGE (s)-[:IN_PRODUCTION_PLANT]->(p)
        """,
        # SalesOrderItem to ProductStorageLocation
        """
        MATCH (s:SalesOrderItem)
        WHERE s.Material IS NOT NULL AND s.ProductionPlant IS NOT NULL AND s.StorageLocation IS NOT NULL
        MATCH (psl:ProductStorageLocation {ProductStorageLocation_Key: s.Material + '_' + s.ProductionPlant + '_' + s.StorageLocation})
        MERGE (s)-[:RESERVED_AT_STORAGE]->(psl)
        """,
        # OutboundDeliveryItem to Plant
        """
        MATCH (d:OutboundDeliveryItem)
        WHERE d.Plant IS NOT NULL
        MATCH (p:Plant {Plant: d.Plant})
        MERGE (d)-[:DELIVERED_FROM_PLANT]->(p)
        """,
        # OutboundDeliveryItem to ProductStorageLocation
        """
        MATCH (d:OutboundDeliveryItem)-[:DELIVERED_FROM_ORDER_ITEM]->(s:SalesOrderItem)-[:FOR_PRODUCT]->(p:Product)
        WHERE d.Plant IS NOT NULL AND d.StorageLocation IS NOT NULL
        MATCH (psl:ProductStorageLocation {ProductStorageLocation_Key: p.Product + '_' + d.Plant + '_' + d.StorageLocation})
        MERGE (d)-[:DELIVERED_FROM_STORAGE]->(psl)
        """
    ]
    for q in queries:
        await run_write_query(q)


async def run_full_ingestion() -> list[dict]:
    logger.info("Starting full ingestion")
    await initialize_schema()

    loaders = [
        ("Sales Orders", load_sales_orders),
        ("Sales Order Items", load_sales_order_items),
        ("Sales Order Schedules", load_sales_order_schedules),
        ("Business Partners", load_business_partners),
        ("Business Partner Addresses", load_business_partner_addresses),
        ("Customer Company", load_customer_company),
        ("Customer Sales Area", load_customer_sales_area),
        ("Plants", load_plants),
        ("Products", load_products),
        ("Product Descriptions", load_product_descriptions),
        ("Product Plants", load_product_plants),
        ("Product Storage Locations", load_product_storage_locations),
        ("Outbound Deliveries", load_outbound_deliveries),
        ("Outbound Delivery Items", load_outbound_delivery_items),
        ("Billing Documents", load_billing_documents),
        ("Billing Document Items", load_billing_document_items),
        ("Billing Cancellations", load_billing_cancellations),
        ("Journal Entries", load_journal_entries),
        ("Payments", load_payments),
        ("Link Sales Orders to Partners", link_sales_orders_to_partners),
        ("Link Extended Relationships", link_extended_relationships),
    ]

    results: list[dict] = []
    for name, loader in loaders:
        try:
            logger.info("Loading: %s", name)
            await loader()
            results.append({"step": name, "status": "success"})
        except Exception as exc:
            logger.error("Error in %s: %s", name, exc, exc_info=True)
            results.append({"step": name, "status": "error", "error": str(exc)})

    logger.info("Ingestion complete")
    return results
