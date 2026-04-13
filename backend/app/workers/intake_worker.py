from __future__ import annotations

import signal
import time

from app.services.intake_processing_service import process_intake_job
from app.services.intake_queue_service import start_intake_worker, stop_intake_worker


_running = True


def _handle_stop(_signum, _frame) -> None:
    global _running
    _running = False


def main() -> None:
    signal.signal(signal.SIGINT, _handle_stop)
    signal.signal(signal.SIGTERM, _handle_stop)

    start_intake_worker(process_intake_job)
    try:
        while _running:
            time.sleep(1)
    finally:
        stop_intake_worker()


if __name__ == "__main__":
    main()
