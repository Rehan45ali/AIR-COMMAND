"""
Unit tests for gesture recognition calculations and state transitions.
"""

import time
from python_engine.gesture_recognition import GestureRecognizer, GestureType, LandmarkIndex
from python_engine.config import GestureThresholds


def create_synthetic_hand(pinch_index: bool = False, pinch_middle: bool = False, open_palm: bool = False):
    """Generates synthetic 21 landmarks for testing."""
    landmarks = []
    for i in range(21):
        landmarks.append({"x": 0.5, "y": 0.5, "z": 0.0})

    # Wrist at (0.5, 0.8)
    landmarks[LandmarkIndex.WRIST] = {"x": 0.5, "y": 0.8, "z": 0.0}
    # Middle MCP at (0.5, 0.5) => scale = 0.3
    landmarks[LandmarkIndex.MIDDLE_MCP] = {"x": 0.5, "y": 0.5, "z": 0.0}

    # Finger PIPs (base of fingers)
    landmarks[LandmarkIndex.INDEX_PIP] = {"x": 0.45, "y": 0.4, "z": 0.0}
    landmarks[LandmarkIndex.MIDDLE_PIP] = {"x": 0.50, "y": 0.4, "z": 0.0}
    landmarks[LandmarkIndex.RING_PIP] = {"x": 0.55, "y": 0.4, "z": 0.0}
    landmarks[LandmarkIndex.PINKY_PIP] = {"x": 0.60, "y": 0.4, "z": 0.0}

    # Finger Tips
    if open_palm:
        # All tips above PIPs (extended)
        landmarks[LandmarkIndex.INDEX_TIP] = {"x": 0.45, "y": 0.2, "z": 0.0}
        landmarks[LandmarkIndex.MIDDLE_TIP] = {"x": 0.50, "y": 0.2, "z": 0.0}
        landmarks[LandmarkIndex.RING_TIP] = {"x": 0.55, "y": 0.2, "z": 0.0}
        landmarks[LandmarkIndex.PINKY_TIP] = {"x": 0.60, "y": 0.2, "z": 0.0}
        landmarks[LandmarkIndex.THUMB_TIP] = {"x": 0.30, "y": 0.3, "z": 0.0}
    else:
        # Only index extended
        landmarks[LandmarkIndex.INDEX_TIP] = {"x": 0.45, "y": 0.2, "z": 0.0}
        landmarks[LandmarkIndex.MIDDLE_TIP] = {"x": 0.50, "y": 0.6, "z": 0.0}  # curled
        landmarks[LandmarkIndex.RING_TIP] = {"x": 0.55, "y": 0.6, "z": 0.0}    # curled
        landmarks[LandmarkIndex.PINKY_TIP] = {"x": 0.60, "y": 0.6, "z": 0.0}   # curled
        landmarks[LandmarkIndex.THUMB_TIP] = {"x": 0.35, "y": 0.5, "z": 0.0}

    if pinch_index:
        # Move thumb tip very close to index tip
        landmarks[LandmarkIndex.THUMB_TIP] = {"x": 0.45, "y": 0.21, "z": 0.0}
    elif pinch_middle:
        # Move thumb tip close to middle tip
        landmarks[LandmarkIndex.THUMB_TIP] = {"x": 0.50, "y": 0.61, "z": 0.0}

    return landmarks


def test_hand_scale_computation():
    recognizer = GestureRecognizer()
    landmarks = create_synthetic_hand()
    scale = recognizer.compute_hand_scale(landmarks)
    assert scale > 0.25 and scale < 0.35


def test_move_gesture():
    recognizer = GestureRecognizer()
    landmarks = create_synthetic_hand(pinch_index=False)
    gesture, tele = recognizer.classify_gesture(landmarks)
    assert gesture == GestureType.MOVE


def test_left_click_gesture():
    thresholds = GestureThresholds(click_cooldown_ms=50, drag_hold_ms=300)
    recognizer = GestureRecognizer(thresholds)

    # 1. Pinch started
    pinch_hand = create_synthetic_hand(pinch_index=True)
    gesture, tele = recognizer.classify_gesture(pinch_hand)
    assert gesture in [GestureType.MOVE, GestureType.NONE]
    assert recognizer.was_pinching is True

    # 2. Release pinch quickly (< drag_hold_ms)
    time.sleep(0.05)
    open_hand = create_synthetic_hand(pinch_index=False)
    gesture, tele = recognizer.classify_gesture(open_hand)
    assert gesture == GestureType.LEFT_CLICK


def test_right_click_gesture():
    thresholds = GestureThresholds(click_cooldown_ms=50)
    recognizer = GestureRecognizer(thresholds)
    pinch_mid_hand = create_synthetic_hand(pinch_middle=True)
    gesture, tele = recognizer.classify_gesture(pinch_mid_hand)
    assert gesture == GestureType.RIGHT_CLICK


def test_fist_lock_gesture():
    recognizer = GestureRecognizer()
    # All fingers curled
    fist_hand = []
    for i in range(21):
        fist_hand.append({"x": 0.5, "y": 0.5, "z": 0.0})
    fist_hand[LandmarkIndex.WRIST] = {"x": 0.5, "y": 0.8, "z": 0.0}
    fist_hand[LandmarkIndex.MIDDLE_MCP] = {"x": 0.5, "y": 0.5, "z": 0.0}
    # All tips below PIPs (curled)
    for pip, tip in [(LandmarkIndex.INDEX_PIP, LandmarkIndex.INDEX_TIP),
                     (LandmarkIndex.MIDDLE_PIP, LandmarkIndex.MIDDLE_TIP),
                     (LandmarkIndex.RING_PIP, LandmarkIndex.RING_TIP),
                     (LandmarkIndex.PINKY_PIP, LandmarkIndex.PINKY_TIP)]:
        fist_hand[pip] = {"x": 0.5, "y": 0.4, "z": 0.0}
        fist_hand[tip] = {"x": 0.5, "y": 0.6, "z": 0.0}
    fist_hand[LandmarkIndex.THUMB_IP] = {"x": 0.45, "y": 0.5, "z": 0.0}
    fist_hand[LandmarkIndex.THUMB_TIP] = {"x": 0.48, "y": 0.6, "z": 0.0}

    gesture, tele = recognizer.classify_gesture(fist_hand)
    assert gesture == GestureType.FIST_LOCK


def test_peace_sign_gesture():
    recognizer = GestureRecognizer()
    peace_hand = []
    for i in range(21):
        peace_hand.append({"x": 0.5, "y": 0.5, "z": 0.0})
    peace_hand[LandmarkIndex.WRIST] = {"x": 0.5, "y": 0.8, "z": 0.0}
    peace_hand[LandmarkIndex.MIDDLE_MCP] = {"x": 0.5, "y": 0.5, "z": 0.0}
    # Index & Middle extended, spread apart
    peace_hand[LandmarkIndex.INDEX_PIP] = {"x": 0.45, "y": 0.4, "z": 0.0}
    peace_hand[LandmarkIndex.INDEX_TIP] = {"x": 0.35, "y": 0.2, "z": 0.0}
    peace_hand[LandmarkIndex.MIDDLE_PIP] = {"x": 0.50, "y": 0.4, "z": 0.0}
    peace_hand[LandmarkIndex.MIDDLE_TIP] = {"x": 0.60, "y": 0.2, "z": 0.0}
    # Ring & Pinky curled
    peace_hand[LandmarkIndex.RING_PIP] = {"x": 0.55, "y": 0.4, "z": 0.0}
    peace_hand[LandmarkIndex.RING_TIP] = {"x": 0.55, "y": 0.6, "z": 0.0}
    peace_hand[LandmarkIndex.PINKY_PIP] = {"x": 0.60, "y": 0.4, "z": 0.0}
    peace_hand[LandmarkIndex.PINKY_TIP] = {"x": 0.60, "y": 0.6, "z": 0.0}
    # Thumb curled
    peace_hand[LandmarkIndex.THUMB_IP] = {"x": 0.45, "y": 0.5, "z": 0.0}
    peace_hand[LandmarkIndex.THUMB_TIP] = {"x": 0.48, "y": 0.6, "z": 0.0}

    gesture, tele = recognizer.classify_gesture(peace_hand)
    assert gesture == GestureType.PEACE_SIGN
