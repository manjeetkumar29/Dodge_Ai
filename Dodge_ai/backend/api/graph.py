from fastapi import APIRouter, HTTPException, Query

from database.neo4j_client import run_query
from models.schemas import GraphData, NodeSearchResult

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/overview", response_model=GraphData)
async def get_graph_overview(
    limit: int = Query(default=300, le=5000),
    node_types: str | None = Query(default=None),
):
    if node_types:
        labels = [label.strip() for label in node_types.split(",") if label.strip()]
        label_filter = "|".join(labels)
        node_query = f"""
        MATCH (n:{label_filter})
        WITH n LIMIT {limit}
        RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
        """
    else:
        node_query = f"""
        MATCH (n)
        WITH n LIMIT {limit}
        RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
        """

    nodes_raw = await run_query(node_query)
    node_ids = [row["id"] for row in nodes_raw]
    if node_ids:
        edges_raw = await run_query(
            """
            MATCH (a)-[r]->(b)
            WHERE id(a) IN $ids AND id(b) IN $ids
            RETURN id(a) AS source, id(b) AS target, type(r) AS rel_type
            LIMIT 1800
            """,
            {"ids": node_ids},
        )
    else:
        edges_raw = []

    nodes = []
    for row in nodes_raw:
        props = row.get("props", {})
        label = row.get("labels", ["Unknown"])[0]
        display_id = (
            props.get("SalesOrder")
            or props.get("BillingDocument")
            or props.get("OutboundDelivery")
            or props.get("BusinessPartner")
            or props.get("AccountingDocument")
            or props.get("PaymentDocument")
            or props.get("Product")
            or props.get("Plant")
            or str(row["id"])
        )
        nodes.append(
            {
                "id": str(row["id"]),
                "label": label,
                "display_id": str(display_id),
                "properties": {key: (str(value) if value is not None else None) for key, value in props.items()},
            }
        )

    edges = [
        {"source": str(edge["source"]), "target": str(edge["target"]), "type": edge["rel_type"]}
        for edge in edges_raw
    ]
    return GraphData(nodes=nodes, edges=edges, node_count=len(nodes), edge_count=len(edges))


@router.get("/node/{node_id}")
async def get_node_detail(node_id: int):
    results = await run_query(
        """
        MATCH (n)
        WHERE id(n) = $node_id
        OPTIONAL MATCH (n)-[r]-(neighbor)
        RETURN
            labels(n) AS labels,
            properties(n) AS props,
            count(r) AS connection_count,
            collect(DISTINCT {
                type: type(r),
                neighbor_label: labels(neighbor)[0],
                neighbor_props: properties(neighbor)
            })[..10] AS connections
        """,
        {"node_id": node_id},
    )
    if not results:
        raise HTTPException(status_code=404, detail="Node not found")
    return results[0]


@router.get("/search", response_model=NodeSearchResult)
async def search_nodes(
    q: str = Query(..., min_length=1),
    label: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
):
    if label:
        query = f"""
        MATCH (n:{label})
        WHERE any(prop IN keys(n) WHERE toLower(toString(n[prop])) CONTAINS toLower($q))
        RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
        LIMIT $limit
        """
    else:
        query = """
        MATCH (n)
        WHERE any(prop IN keys(n) WHERE toLower(toString(n[prop])) CONTAINS toLower($q))
        RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props
        LIMIT $limit
        """

    results = await run_query(query, {"q": q, "limit": limit})
    nodes = [
        {
            "id": str(row["id"]),
            "label": row["labels"][0] if row["labels"] else "Unknown",
            "properties": row["props"],
        }
        for row in results
    ]
    return NodeSearchResult(nodes=nodes, total=len(nodes))


@router.get("/stats")
async def get_graph_stats():
    try:
        results = await run_query(
            """
            CALL apoc.meta.stats()
            YIELD labels, relTypesCount, nodeCount, relCount
            RETURN labels, relTypesCount, nodeCount, relCount
            """
        )
        return results[0] if results else {}
    except Exception:
        node_counts = await run_query(
            """
            MATCH (n)
            RETURN labels(n)[0] AS label, count(n) AS count
            ORDER BY count DESC
            """
        )
        rel_counts = await run_query(
            """
            MATCH ()-[r]->()
            RETURN type(r) AS type, count(r) AS count
            ORDER BY count DESC
            """
        )
        return {"node_counts": node_counts, "relationship_counts": rel_counts}


@router.get("/highlights/{session_id}")
async def get_highlighted_nodes(session_id: str, node_ids: str = Query(...)):
    ids = [int(item) for item in node_ids.split(",") if item.isdigit()]
    if not ids:
        return {"nodes": [], "edges": []}

    return await run_query(
        """
        MATCH (n)
        WHERE id(n) IN $ids
        OPTIONAL MATCH (n)-[r]-(m)
        WHERE id(m) IN $ids
        RETURN
            id(n) AS id,
            labels(n) AS labels,
            properties(n) AS props,
            id(startNode(r)) AS src,
            id(endNode(r)) AS tgt,
            type(r) AS rel_type
        """,
        {"ids": ids},
    )
