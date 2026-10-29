"""Reset only workflow records for the local Aurora demo.

Attendance, staff and salary-type seed data remain intact so the same review
scenario can be replayed after every page refresh or server restart.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("AURORA_DB_PATH", str(BASE_DIR / "salary_test.sqlite3")))


def reset() -> None:
    if not DB_PATH.exists():
        return
    with sqlite3.connect(DB_PATH) as connection:
        for table in ("expense_vouchers", "payment_vouchers", "salary_submissions"):
            try:
                connection.execute(f"DELETE FROM {table}")
            except sqlite3.OperationalError:
                # The FastAPI startup hook creates these tables on first run.
                continue


if __name__ == "__main__":
    reset()
    print(f"Đã reset dữ liệu demo trong: {DB_PATH}")
