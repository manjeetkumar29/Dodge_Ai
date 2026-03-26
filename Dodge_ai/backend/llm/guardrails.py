import re

ALLOWED_TOPICS = [
    "order",
    "sales",
    "billing",
    "invoice",
    "payment",
    "delivery",
    "shipment",
    "product",
    "material",
    "customer",
    "partner",
    "plant",
    "journal",
    "accounting",
    "revenue",
    "o2c",
    "sap",
    "erp",
    "document",
    "schedule",
    "cancellation",
    "storage",
    "warehouse",
    "quantity",
    "amount",
    "currency",
    "company",
    "organization",
    "analyze",
    "show",
    "find",
    "list",
    "count",
    "total",
    "sum",
    "which",
    "what",
    "how",
    "when",
    "where",
    "who",
    "graph",
    "node",
    "relationship",
    "connected",
    "linked",
    "cash",
    "receivable",
    "ledger",
    "entry",
]

BLOCKED_PATTERNS = [
    r"\b(password|secret|api.?key|token|credential)\b",
    r"\b(hack|exploit|injection|drop\s+table|delete\s+all)\b",
    r"\b(personal\s+info|social\s+security|credit\s+card)\b",
    r"(ignore\s+previous|forget\s+instructions|jailbreak|dan\s+mode)",
    r"\b(weather|recipe|joke|movie|sport|news|politics|religion)\b",
    r"\b(write\s+code|generate\s+script|create\s+program)\b(?!.*cypher)",
]

CYPHER_DANGEROUS_PATTERNS = [
    r"\bDELETE\b",
    r"\bDETACH\s+DELETE\b",
    r"\bDROP\b",
    r"\bCREATE\s+USER\b",
    r"\bCREATE\s+DATABASE\b",
    r"\bSET\s+PASSWORD\b",
    r"\bCALL\s+dbms\b",
    r"\bCALL\s+apoc\.periodic\.commit\b",
]


def check_message_safety(message: str) -> tuple[bool, str]:
    msg_lower = message.lower()

    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, msg_lower, re.IGNORECASE):
            return (
                False,
                "I can only help with SAP Order-to-Cash data analysis. Please ask about orders, billing, deliveries, or other O2C topics.",
            )

    words = msg_lower.split()
    if len(words) > 5:
        has_relevant = any(any(topic in word for topic in ALLOWED_TOPICS) for word in words)
        if not has_relevant:
            return (
                False,
                "I'm specialized in SAP Order-to-Cash analysis. Please ask me about sales orders, billing documents, deliveries, payments, or related O2C topics.",
            )

    return True, ""


def validate_cypher_query(cypher: str) -> tuple[bool, str]:
    for pattern in CYPHER_DANGEROUS_PATTERNS:
        if re.search(pattern, cypher, re.IGNORECASE):
            return False, f"Generated query contains unsafe operation: {pattern}"

    if not re.search(r"\b(MATCH|RETURN|WITH|CALL|UNWIND)\b", cypher, re.IGNORECASE):
        return False, "Query does not appear to be a valid read query"

    return True, ""


def sanitize_cypher_limit(cypher: str, max_limit: int = 500) -> str:
    if not re.search(r"\bLIMIT\s+\d+", cypher, re.IGNORECASE):
        cypher = cypher.rstrip().rstrip(";")
        cypher += f" LIMIT {max_limit}"
    return cypher
