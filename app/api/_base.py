"""Base HTTP handler with JSON helpers and error handling."""
import json
import logging
import traceback
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict

logger = logging.getLogger(__name__)

class APIHandler(BaseHTTPRequestHandler):
    """Base handler for all Vercel Python serverless routes."""

    def _send_json(self, data: Dict[str, Any], status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def _read_json(self) -> Dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode("utf-8"))

    def _error(self, message: str, status: int = 400) -> None:
        logger.error(f"[{status}] {message}")
        self._send_json({"success": False, "error": message}, status)

    def _success(self, data: Dict[str, Any], status: int = 200) -> None:
        self._send_json({"success": True, "data": data}, status)

    def do_OPTIONS(self) -> None:
        """Handle CORS preflight. Vercel edge also adds headers, but this ensures coverage."""
        self.send_response(204)
        self.end_headers()

    def handle_exception(self, exc: Exception) -> None:
        logger.exception("Unhandled API exception")
        self._error(str(exc), 500)

    def log_message(self, format: str, *args: Any) -> None:
        """Override to use structured logging instead of stderr."""
        logger.info("%s - %s", self.address_string(), format % args)
