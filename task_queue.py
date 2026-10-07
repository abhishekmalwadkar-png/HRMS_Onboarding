"""
Asynchronous Background Task Queue & Resilient Retry Engine
------------------------------------------------------------
Provides an in-memory, thread-safe asynchronous execution queue with:
  1. Exponential backoff retry mechanism for transient network/API failures.
  2. Decorator `@retry_on_failure` for synchronous resilience.
  3. Background worker threads for asynchronous workflow execution.
  4. Task execution history, live status tracking, and health metrics.
"""

import time
import uuid
import queue
import threading
import logging
import functools
from typing import Callable, Any, Dict, List, Optional

logger = logging.getLogger("HRMS.TaskQueue")

class TaskStatus:
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    RETRYING = "RETRYING"
    FAILED = "FAILED"

class TaskItem:
    def __init__(
        self,
        name: str,
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        max_retries: int = 3,
        initial_delay: float = 2.0,
        backoff_factor: float = 2.0,
        on_success: Optional[Callable] = None,
        on_failure: Optional[Callable] = None
    ):
        self.id = f"task-{uuid.uuid4().hex[:8]}"
        self.name = name
        self.func = func
        self.args = args or ()
        self.kwargs = kwargs or {}
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.backoff_factor = backoff_factor
        self.on_success = on_success
        self.on_failure = on_failure

        self.status = TaskStatus.QUEUED
        self.attempts = 0
        self.created_at = time.time()
        self.started_at: Optional[float] = None
        self.completed_at: Optional[float] = None
        self.result: Any = None
        self.error: Optional[str] = None
        self.next_retry_at: float = 0.0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "attempts": self.attempts,
            "maxRetries": self.max_retries,
            "createdAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.created_at)),
            "startedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.started_at)) if self.started_at else None,
            "completedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.completed_at)) if self.completed_at else None,
            "durationSec": round(self.completed_at - self.started_at, 2) if (self.completed_at and self.started_at) else None,
            "error": self.error,
            "result": str(self.result)[:200] if self.result is not None else None
        }


class AsyncTaskQueue:
    def __init__(self, num_workers: int = 3):
        self._queue = queue.Queue()
        self._num_workers = num_workers
        self._history: Dict[str, TaskItem] = {}
        self._history_order: List[str] = []
        self._lock = threading.Lock()
        self._workers: List[threading.Thread] = []
        self._running = False

        # Metrics
        self._metrics = {
            "totalEnqueued": 0,
            "totalSuccess": 0,
            "totalFailed": 0,
            "totalRetried": 0
        }

        self.start()

    def start(self):
        if self._running:
            return
        self._running = True
        for i in range(self._num_workers):
            t = threading.Thread(target=self._worker_loop, name=f"HRMS-Worker-{i+1}", daemon=True)
            t.start()
            self._workers.append(t)
        print(f"[TaskQueue] Started background task queue with {self._num_workers} worker threads.")

    def stop(self):
        self._running = False

    def enqueue(
        self,
        name: str,
        func: Callable,
        *args,
        max_retries: int = 3,
        initial_delay: float = 2.0,
        backoff_factor: float = 2.0,
        on_success: Optional[Callable] = None,
        on_failure: Optional[Callable] = None,
        **kwargs
    ) -> str:
        task = TaskItem(
            name=name,
            func=func,
            args=args,
            kwargs=kwargs,
            max_retries=max_retries,
            initial_delay=initial_delay,
            backoff_factor=backoff_factor,
            on_success=on_success,
            on_failure=on_failure
        )
        with self._lock:
            self._history[task.id] = task
            self._history_order.insert(0, task.id)
            if len(self._history_order) > 200:
                oldest = self._history_order.pop()
                self._history.pop(oldest, None)
            self._metrics["totalEnqueued"] += 1

        self._queue.put(task)
        print(f"[TaskQueue] Enqueued task: {task.name} (ID: {task.id})")
        return task.id

    def _worker_loop(self):
        while self._running:
            try:
                task: TaskItem = self._queue.get(timeout=1.0)
            except queue.Empty:
                continue

            if task.next_retry_at > time.time():
                # Sleep remaining delay or re-queue
                time.sleep(max(0.1, min(1.0, task.next_retry_at - time.time())))
                self._queue.put(task)
                self._queue.task_done()
                continue

            self._execute_task(task)
            self._queue.task_done()

    def _execute_task(self, task: TaskItem):
        task.attempts += 1
        task.status = TaskStatus.RUNNING
        if not task.started_at:
            task.started_at = time.time()

        print(f"[TaskQueue] Executing {task.name} (ID: {task.id}, Attempt {task.attempts}/{task.max_retries + 1})...")

        try:
            res = task.func(*task.args, **task.kwargs)
            task.result = res
            task.status = TaskStatus.SUCCESS
            task.completed_at = time.time()
            task.error = None
            with self._lock:
                self._metrics["totalSuccess"] += 1
            print(f"[TaskQueue ✓] Task succeeded: {task.name} (ID: {task.id})")

            if task.on_success and callable(task.on_success):
                try:
                    task.on_success(res)
                except Exception as cb_err:
                    print(f"[TaskQueue Warning] on_success callback error: {cb_err}")

        except Exception as e:
            task.error = str(e)
            print(f"[TaskQueue !] Attempt {task.attempts} failed for {task.name}: {e}")

            if task.attempts <= task.max_retries:
                # Calculate exponential delay
                delay = task.initial_delay * (task.backoff_factor ** (task.attempts - 1))
                task.status = TaskStatus.RETRYING
                task.next_retry_at = time.time() + delay
                with self._lock:
                    self._metrics["totalRetried"] += 1
                print(f"[TaskQueue ↻] Retrying {task.name} in {delay:.1f}s (Attempt {task.attempts + 1}/{task.max_retries + 1})...")
                self._queue.put(task)
            else:
                task.status = TaskStatus.FAILED
                task.completed_at = time.time()
                with self._lock:
                    self._metrics["totalFailed"] += 1
                print(f"[TaskQueue ✗] Task failed permanently after {task.attempts} attempts: {task.name}")

                if task.on_failure and callable(task.on_failure):
                    try:
                        task.on_failure(task.error)
                    except Exception as cb_err:
                        print(f"[TaskQueue Warning] on_failure callback error: {cb_err}")

    def get_task(self, task_id: str) -> Optional[dict]:
        with self._lock:
            t = self._history.get(task_id)
            return t.to_dict() if t else None

    def list_tasks(self, limit: int = 50) -> List[dict]:
        with self._lock:
            return [self._history[tid].to_dict() for tid in self._history_order[:limit] if tid in self._history]

    def get_metrics(self) -> dict:
        with self._lock:
            return {
                **self._metrics,
                "activeWorkers": len([w for w in self._workers if w.is_alive()]),
                "pendingQueueSize": self._queue.qsize(),
                "historyCount": len(self._history)
            }


# ----------------------------------------------------------------------
# SYNCHRONOUS RETRY DECORATOR WITH EXPONENTIAL BACKOFF
# ----------------------------------------------------------------------
def retry_on_failure(
    max_retries: int = 3,
    initial_delay: float = 1.5,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Decorator that automatically retries a function with exponential backoff
    if any of the specified exceptions are raised.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_err = None
            for attempt in range(1, max_retries + 2):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_err = e
                    if attempt <= max_retries:
                        print(f"[Retry Engine ↻] '{func.__name__}' failed (Attempt {attempt}/{max_retries + 1}): {e}. Retrying in {delay:.1f}s...")
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        print(f"[Retry Engine ✗] '{func.__name__}' failed permanently after {attempt} attempts: {e}")
            raise last_err
        return wrapper
    return decorator


# Global Task Queue Singleton
task_queue = AsyncTaskQueue(num_workers=3)
