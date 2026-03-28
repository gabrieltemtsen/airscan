from __future__ import annotations

import sys

from rq import Worker

from app.worker.queue import get_redis


def main() -> None:
    redis_conn = get_redis()
    if redis_conn is None:
        print("REDIS_URL is not set. Worker cannot start.")
        sys.exit(1)

    # RQ v2+ no longer exposes Connection context manager; pass connection directly.
    worker = Worker(["airscan"], connection=redis_conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
