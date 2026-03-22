"""Tier computation service — determines agent tier and SilkWeb fee.

Tier rules (agent qualifies if they meet ANY criterion for a tier):
  - seed:      memory < 100MB, age < 7d, tasks < 10        -> 0% fee
  - proven:    memory 100MB-10GB, age 7-30d OR tasks 10-100 -> 2% fee
  - expert:    memory 10GB-500GB, age 30-90d OR tasks 100-1000 -> 3% fee
  - authority: memory 500GB+, age 90+d OR tasks 1000+       -> 5% fee

The highest qualifying tier wins.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from api.models.agent import Agent

# Byte thresholds
_100MB = 100 * 1024 * 1024
_10GB = 10 * 1024 * 1024 * 1024
_500GB = 500 * 1024 * 1024 * 1024

# Tier definitions ordered from highest to lowest so we can short-circuit.
TIER_RULES: list[dict] = [
    {
        "name": "authority",
        "fee_pct": Decimal("0.0500"),
        "memory_min": _500GB,
        "age_days_min": 90,
        "tasks_min": 1000,
    },
    {
        "name": "expert",
        "fee_pct": Decimal("0.0300"),
        "memory_min": _10GB,
        "memory_max": _500GB,
        "age_days_min": 30,
        "age_days_max": 90,
        "tasks_min": 100,
        "tasks_max": 1000,
    },
    {
        "name": "proven",
        "fee_pct": Decimal("0.0200"),
        "memory_min": _100MB,
        "memory_max": _10GB,
        "age_days_min": 7,
        "age_days_max": 30,
        "tasks_min": 10,
        "tasks_max": 100,
    },
]

SEED_TIER = ("seed", Decimal("0.0000"))


def compute_tier(agent: Agent) -> tuple[str, Decimal]:
    """Compute the agent's tier and SilkWeb fee percentage.

    Returns (tier_name, fee_pct) where fee_pct is a Decimal like 0.0200 (2%).
    """
    memory = agent.memory_bytes or 0
    tasks = agent.tasks_completed or 0

    # Calculate age in days
    now = datetime.now(timezone.utc)
    created = agent.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_days = (now - created).days

    # Check tiers from highest to lowest — first match wins
    for rule in TIER_RULES:
        qualifies = False

        # Memory criterion
        mem_min = rule.get("memory_min", 0)
        mem_max = rule.get("memory_max")
        if mem_max is None:
            # Top tier — no upper bound
            if memory >= mem_min:
                qualifies = True
        else:
            if mem_min <= memory < mem_max:
                qualifies = True

        # Age criterion (OR — any single criterion qualifies)
        age_min = rule.get("age_days_min", 0)
        age_max = rule.get("age_days_max")
        if age_max is None:
            if age_days >= age_min:
                qualifies = True
        else:
            if age_min <= age_days < age_max:
                qualifies = True

        # Tasks criterion (OR)
        tasks_min = rule.get("tasks_min", 0)
        tasks_max = rule.get("tasks_max")
        if tasks_max is None:
            if tasks >= tasks_min:
                qualifies = True
        else:
            if tasks_min <= tasks < tasks_max:
                qualifies = True

        if qualifies:
            return rule["name"], rule["fee_pct"]

    return SEED_TIER


def next_tier_requirements(agent: Agent) -> dict | None:
    """Return what the agent needs to reach the next tier, or None if at max.

    Returns a dict with the next tier name and the remaining thresholds.
    """
    current_tier, _ = compute_tier(agent)

    memory = agent.memory_bytes or 0
    tasks = agent.tasks_completed or 0
    now = datetime.now(timezone.utc)
    created = agent.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_days = (now - created).days

    tier_order = ["seed", "proven", "expert", "authority"]
    current_idx = tier_order.index(current_tier)
    if current_idx >= len(tier_order) - 1:
        return None  # Already at maximum tier

    next_name = tier_order[current_idx + 1]

    # Find the matching rule
    next_rule = None
    for rule in TIER_RULES:
        if rule["name"] == next_name:
            next_rule = rule
            break

    if next_rule is None:
        return None

    requirements: dict = {"tier": next_name, "fee_pct": float(next_rule["fee_pct"]) * 100}
    needs = []

    mem_min = next_rule.get("memory_min", 0)
    if memory < mem_min:
        needs.append({
            "criterion": "memory_bytes",
            "current": memory,
            "required": mem_min,
            "description": f"Memory depth >= {_human_bytes(mem_min)}",
        })

    age_min = next_rule.get("age_days_min", 0)
    if age_days < age_min:
        needs.append({
            "criterion": "age_days",
            "current": age_days,
            "required": age_min,
            "description": f"Network age >= {age_min} days",
        })

    tasks_min = next_rule.get("tasks_min", 0)
    if tasks < tasks_min:
        needs.append({
            "criterion": "tasks_completed",
            "current": tasks,
            "required": tasks_min,
            "description": f"Tasks completed >= {tasks_min}",
        })

    requirements["needs"] = needs
    requirements["note"] = "Meet ANY one of the above criteria to qualify."
    return requirements


def _human_bytes(n: int) -> str:
    """Format bytes as a human-readable string."""
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(n) < 1024:
            return f"{n:.0f} {unit}"
        n //= 1024
    return f"{n:.0f} PB"
