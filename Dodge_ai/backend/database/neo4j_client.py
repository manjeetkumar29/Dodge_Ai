import logging

from neo4j import AsyncDriver, AsyncGraphDatabase

from config import get_settings

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


async def get_driver() -> AsyncDriver:
    global _driver
    settings = get_settings()
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.neo4j_user, settings.NEO4J_PASSWORD),
        )
        logger.info("Neo4j driver initialized")
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


async def run_query(cypher: str, parameters: dict | None = None) -> list[dict]:
    driver = await get_driver()
    settings = get_settings()
    session_kwargs = {"database": settings.NEO4J_DATABASE} if settings.NEO4J_DATABASE else {}
    async with driver.session(**session_kwargs) as session:
        result = await session.run(cypher, parameters or {})
        return await result.data()


async def run_write_query(cypher: str, parameters: dict | None = None):
    driver = await get_driver()
    settings = get_settings()
    session_kwargs = {"database": settings.NEO4J_DATABASE} if settings.NEO4J_DATABASE else {}
    async with driver.session(**session_kwargs) as session:
        result = await session.run(cypher, parameters or {})
        return await result.consume()
