import json
import logging
import re

import httpx
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from config import get_settings
from database.neo4j_client import run_query
from database.schema import SCHEMA_DESCRIPTION
from llm.guardrails import check_message_safety, sanitize_cypher_limit, validate_cypher_query
from llm.prompts import ANSWER_GENERATION_PROMPT, CYPHER_GENERATION_PROMPT, SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class GraphAgent:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=httpx.Timeout(3600.0),
        )
        self.model = settings.llm_model
        self.conversation_history: list[dict] = []

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(min=2, max=30))
    async def _call_llm(self, messages: list[dict], response_format: str = "text") -> str:
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
        }
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    async def _generate_cypher(self, question: str) -> dict:
        prompt = CYPHER_GENERATION_PROMPT.format(question=question)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        raw = await self._call_llm(messages, response_format="json")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group())
            return {"cypher": None, "explanation": "Failed to generate query"}

    async def _execute_cypher(self, cypher: str) -> list[dict]:
        is_safe, reason = validate_cypher_query(cypher)
        if not is_safe:
            logger.warning("Unsafe Cypher blocked: %s", reason)
            return []
        return await run_query(sanitize_cypher_limit(cypher))

    async def _generate_answer(self, question: str, cypher: str, results: list[dict]) -> dict:
        results_str = json.dumps(results[:8], separators=(",", ":"), default=str)
        if len(results_str) > 2000:
            results_str = results_str[:2000] + "... [truncated for length]"

        prompt = ANSWER_GENERATION_PROMPT.format(
            question=question,
            cypher=cypher,
            count=len(results),
            results=results_str,
        )
        messages = [
            {"role": "system", "content": "You are Dodge AI, an expert Graph Agent. Synthesize the provided graph results into a clear business answer without hallucinating data. Adhere strictly to the requested JSON layout formatting constraints."},
            *self.conversation_history[-4:],
            {"role": "user", "content": prompt},
        ]
        raw = await self._call_llm(messages, response_format="json")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group())
            return {"answer": raw, "follow_up_questions": []}

    async def _extract_highlight_ids(self, results: list[dict]) -> list[dict]:
        highlights: list[dict] = []
        for record in results[:50]:
            for value in record.values():
                if isinstance(value, dict):
                    labels = value.get("labels", [])
                    props = value.get("properties", {})
                    if labels and props:
                        highlights.append({"label": labels[0], "properties": props})
        return highlights

    async def chat(self, message: str, session_id: str = "default") -> dict:
        is_safe, reason = check_message_safety(message)
        if not is_safe:
            return {
                "answer": reason,
                "cypher": None,
                "results": [],
                "highlights": [],
                "error": None,
            }

        try:
            cypher_result = await self._generate_cypher(message)
            cypher = cypher_result.get("cypher")
            results: list[dict] = []

            if cypher:
                try:
                    results = await self._execute_cypher(cypher)
                except Exception as exc:
                    logger.error("Query failed, attempting fix: %s", exc)
                    fix_messages = [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": (
                                f"This Cypher query failed with error '{exc}'. Fix it:\n{cypher}\n"
                                'Return only the fixed query as JSON: {"cypher": "..."}'
                            ),
                        },
                    ]
                    fix_raw = await self._call_llm(fix_messages, response_format="json")
                    fix_data = json.loads(fix_raw)
                    cypher = fix_data.get("cypher", cypher)
                    results = await self._execute_cypher(cypher)

                answer_data = await self._generate_answer(message, cypher, results)
            else:
                raw_ans = await self._call_llm(
                    [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        *self.conversation_history[-6:],
                        {"role": "user", "content": message},
                    ]
                )
                answer_data = {"answer": raw_ans, "follow_up_questions": []}

            answer = answer_data.get("answer", answer_data.get("response", "No answer generated."))
            follow_ups = answer_data.get("follow_up_questions", answer_data.get("followUpQuestions", []))

            self.conversation_history.append({"role": "user", "content": message})
            self.conversation_history.append({"role": "assistant", "content": answer})

            return {
                "answer": answer,
                "cypher": cypher,
                "results": results[:100],
                "highlights": await self._extract_highlight_ids(results),
                "followUpQuestions": follow_ups,
                "error": None,
            }
        except Exception as exc:
            logger.error("Agent error: %s", exc, exc_info=True)
            return {
                "answer": "I encountered an error processing your request. Please try again.",
                "cypher": None,
                "results": [],
                "highlights": [],
                "error": str(exc),
            }


_agents: dict[str, GraphAgent] = {}


def get_agent(session_id: str = "default") -> GraphAgent:
    if session_id not in _agents:
        _agents[session_id] = GraphAgent()
    return _agents[session_id]
