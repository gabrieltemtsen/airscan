from __future__ import annotations

from rq import Connection, Worker

from app.worker.queue import get_redis


def main():
    redis_conn = get_redis()
    with Connection(redis_conn):
        w = Worker(["airscan"])
        w.work(with_scheduler=False)


if __name__ == "__main__":
    main()
