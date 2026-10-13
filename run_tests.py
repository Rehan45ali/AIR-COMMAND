#!/usr/bin/env python3
"""
Test runner for GestureMouse AI test suite
Runs all test functions in python_engine/tests/ without requiring external pytest.
"""

import sys
import os
import inspect
import importlib.util

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))


def run_all_tests():
    test_dir = os.path.join(os.path.dirname(__file__), "python_engine", "tests")
    test_files = [f for f in os.listdir(test_dir) if f.startswith("test_") and f.endswith(".py")]
    
    total_run = 0
    passed = 0
    failed = 0

    print("=" * 60)
    print("  GestureMouse AI Automated Test Suite")
    print("=" * 60)

    for test_file in sorted(test_files):
        file_path = os.path.join(test_dir, test_file)
        module_name = test_file[:-3]
        
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        test_funcs = [getattr(mod, name) for name in dir(mod) if name.startswith("test_") and callable(getattr(mod, name))]

        for func in test_funcs:
            total_run += 1
            test_name = f"{module_name}.{func.__name__}"
            try:
                func()
                print(f"  [PASS] {test_name}")
                passed += 1
            except AssertionError as e:
                print(f"  [FAIL] {test_name}: {e}")
                failed += 1
            except Exception as e:
                print(f"  [ERROR] {test_name}: {type(e).__name__} - {e}")
                failed += 1

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {total_run} tests.")
    print("=" * 60)
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
