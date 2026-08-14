"""
Shared helper utilities.
"""


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp a value between lo and hi."""
    return max(lo, min(hi, value))


def euclidean_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """Return the Euclidean distance between two 2D points."""
    return ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
