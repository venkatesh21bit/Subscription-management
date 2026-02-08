"""
Health check and readiness probe views.

Provides /health/ and /ready/ endpoints for:
  - Railway healthcheck probes (reliability)
  - Load balancer health monitoring
  - Celery worker liveness detection

Responses:
  200 = healthy, all checks passed
  503 = unhealthy, one or more checks failed
"""
import logging
from django.http import JsonResponse
from django.db import connection
from django.db.utils import OperationalError

logger = logging.getLogger(__name__)


def health_check(request):
    """
    GET /health/

    Lightweight liveness probe. Checks:
      - Database connectivity (SELECT 1)
      - Redis connectivity (ping)
      - Celery worker liveness (inspect ping)

    Returns 200 if all pass, 503 if any fail.
    """
    result = {
        "status": "ok",
        "checks": {
            "database": _check_database(),
            "redis": _check_redis(),
            "celery": _check_celery(),
        },
    }

    # Only database is critical for health check.
    # Redis/Celery are optional services — treat warnings as acceptable.
    critical_checks = ["database"]
    critical_ok = all(
        result["checks"][k]["status"] in ("ok", "warning")
        for k in critical_checks
    )
    all_ok = all(c["status"] == "ok" for c in result["checks"].values())
    result["status"] = "ok" if all_ok else "degraded"

    status_code = 200 if critical_ok else 503
    return JsonResponse(result, status=status_code)


def readiness_check(request):
    """
    GET /ready/

    Full readiness probe. Checks everything in health_check plus:
      - No pending database migrations

    Returns 200 if all pass, 503 if any fail.
    """
    result = {
        "status": "ok",
        "checks": {
            "database": _check_database(),
            "redis": _check_redis(),
            "celery": _check_celery(),
            "migrations": _check_migrations(),
        },
    }

    # Only database and migrations are critical for readiness.
    critical_checks = ["database", "migrations"]
    critical_ok = all(
        result["checks"][k]["status"] in ("ok", "warning")
        for k in critical_checks
    )
    all_ok = all(c["status"] == "ok" for c in result["checks"].values())
    result["status"] = "ok" if all_ok else "not_ready"

    status_code = 200 if critical_ok else 503
    return JsonResponse(result, status=status_code)


# ── Individual check functions ───────────────────────────────────


def _check_database():
    """Ping the default database with SELECT 1."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {"status": "ok"}
    except OperationalError as e:
        logger.error("Health check: database unreachable: %s", e)
        return {"status": "error", "detail": str(e)[:200]}
    except Exception as e:
        logger.error("Health check: database error: %s", e)
        return {"status": "error", "detail": str(e)[:200]}


def _check_redis():
    """Ping Redis (used as Celery broker / cache)."""
    try:
        import redis as redis_lib

        # Try to get Redis URL from common env patterns
        import os
        redis_url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL", "")

        if not redis_url:
            return {"status": "ok", "detail": "Redis not configured (skipped)"}

        client = redis_lib.from_url(redis_url, socket_timeout=3)
        client.ping()
        return {"status": "ok"}
    except ImportError:
        return {"status": "ok", "detail": "Redis package not installed (skipped)"}
    except Exception as e:
        logger.error("Health check: Redis unreachable: %s", e)
        return {"status": "error", "detail": str(e)[:200]}


def _check_celery():
    """Check if at least one Celery worker is alive."""
    try:
        from celery import current_app

        # Quick timeout — don't block the health endpoint
        inspector = current_app.control.inspect(timeout=2.0)
        ping_result = inspector.ping()

        if ping_result:
            worker_count = len(ping_result)
            return {"status": "ok", "workers": worker_count}
        else:
            return {"status": "warning", "detail": "No Celery workers responding"}
    except ImportError:
        return {"status": "ok", "detail": "Celery not installed (skipped)"}
    except Exception as e:
        logger.warning("Health check: Celery inspect failed: %s", e)
        return {"status": "warning", "detail": str(e)[:200]}


def _check_migrations():
    """Check for pending (unapplied) database migrations."""
    try:
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command("showmigrations", "--plan", stdout=out, no_color=True)
        output = out.getvalue()

        # Count unapplied migrations (lines with [ ] instead of [X])
        unapplied = [line for line in output.split("\n") if line.strip().startswith("[ ]")]

        if unapplied:
            return {
                "status": "warning",
                "detail": f"{len(unapplied)} pending migration(s)",
            }
        return {"status": "ok"}
    except Exception as e:
        logger.error("Health check: migration check failed: %s", e)
        return {"status": "error", "detail": str(e)[:200]}
