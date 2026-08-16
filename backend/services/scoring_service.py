"""
Scoring service — compute game scores from session telemetry.

Percentage-Based Formula (0% – 100%):

  1. EXPLORATION & COMPLETION BASE (70% weight)
     - Proportional to correct connections found: (completed / total_required) * 70%
     - Encourages exploring and connecting every right node without fear of penalty.

  2. SPEED & TIME EFFICIENCY (30% weight)
     - Rewards players for fast constellation discovery:
       time_ratio = clamp(time_elapsed / time_limit, 0, 1)
       time_score = (1.0 - time_ratio) * 30%

  3. NO MISTAKE PENALTY (0% deduction)
     - Wrong connections do not subtract points (forgiving for motion/mouse controls).
     - Allows free exploration of the starfield.

Total Score = (Completion Base + Speed Score) -> Formatted as a clean percentage (e.g. 96.5%).
"""

COMPLETION_WEIGHT = 70.0  # Max 70% from connecting valid stars
SPEED_WEIGHT      = 30.0  # Max 30% from speed / remaining time


def compute_score(
    wrong_connections: int,
    total_clicks: int,
    time_elapsed_ms: int,
    wand_travel_dist: float,
    time_limit_sec: int,
    accuracy: float = 100.0,
    completed_connections: int = 0,
    total_connections: int = 0,
) -> float:
    """
    Return a percentage score between 0.0% and 100.0%.

    Parameters
    ----------
    wrong_connections : number of incorrect node-pair attempts (no penalty)
    total_clicks      : raw click / tap count
    time_elapsed_ms   : milliseconds taken to complete
    wand_travel_dist  : cumulative pixel distance moved
    time_limit_sec    : the challenge's allotted time (seconds)
    accuracy          : tracing shape accuracy (optional)
    completed_connections : number of correct connections drawn
    total_connections : total required connections in the constellation

    Returns
    -------
    float  0.0 – 100.0 (Percentage Score)
    """
    time_sec   = max(0.0, time_elapsed_ms / 1000.0)
    time_limit = max(time_limit_sec, 1)

    # 1. Completion & Exploration Percentage (0% to 70%)
    if total_connections > 0:
        completion_ratio = max(0.0, min(1.0, completed_connections / total_connections))
    else:
        completion_ratio = 1.0 if completed_connections > 0 else 0.0

    completion_score = completion_ratio * COMPLETION_WEIGHT

    # 2. Speed / Time Efficiency (0% to 30%)
    # Faster finish = higher speed score
    time_ratio = min(1.0, time_sec / time_limit)
    speed_score = SPEED_WEIGHT * max(0.0, 1.0 - time_ratio) * completion_ratio

    # Total Percentage Score (0% to 100%)
    final_score = round(max(0.0, min(100.0, completion_score + speed_score)), 1)

    print(
        f"[SCORE] completion={completed_connections}/{total_connections} ({completion_score:.1f}%) | "
        f"time={time_sec:.1f}s/{time_limit}s -> speed_score={speed_score:.1f}% | "
        f"mistakes={wrong_connections} (0 penalty) | "
        f"TOTAL={final_score:.1f}%"
    )

    return final_score

