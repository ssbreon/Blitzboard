import json
import logging
import os
import secrets
import hashlib
import threading
from functools import wraps
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
from time import time
from urllib.parse import urlparse
from uuid import uuid4

from azure.core import MatchConditions
from azure.core.exceptions import HttpResponseError, ResourceExistsError, ResourceNotFoundError
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential
import azure.functions as func
import accounts
import authentication

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

COSMOS_ENDPOINT = os.getenv("COSMOS_ENDPOINT") or os.getenv("COSMOSDB_ENDPOINT")
COSMOS_KEY = os.getenv("COSMOS_KEY") or os.getenv("COSMOSDB_KEY")
COSMOS_DATABASE = os.getenv("COSMOS_DATABASE", "blitzboard-studio")
COSMOS_CONTAINER = os.getenv("COSMOS_CONTAINER", "playboard")
AUTH_MODE = os.getenv("AUTH_MODE", "").lower()
DEV_AUTH_SECRET = os.getenv("DEV_AUTH_SECRET", "")
DEV_USER_ID = os.getenv("DEV_USER_ID", "local-coach")
DEV_USER_NAME = os.getenv("DEV_USER_NAME", "Local Coach")
CONTENT_TYPES = ("playbooks", "plays", "playGroupings", "slides", "exports", "gamePlans", "scoutPlays", "scheduleEvents")
STATUS_TYPES = {"playbooks", "gamePlans", "plays", "scoutPlays"}
AFFILIATE_PARTNERS = (
    {"id": "hudl", "name": "Hudl", "description": "Video tools for coaching teams.", "setting": "AFFILIATE_URL_HUDL"},
    {"id": "gorout", "name": "GoRoute", "description": "Resources for building and managing a football program.", "setting": "AFFILIATE_URL_GOROUT"},
    {"id": "teambuildr", "name": "TeamBuildr", "description": "Strength and conditioning planning tools.", "setting": "AFFILIATE_URL_TEAMBUILDR"},
    {"id": "coachtube", "name": "CoachTube", "description": "Courses and clinics for coaches.", "setting": "AFFILIATE_URL_COACHTUBE"},
)
SEARCH_MAX_LENGTH = 256
SEARCH_RESULT_LIMIT = 100
SEARCH_REQUEST_LIMIT = 60
SEARCH_WINDOW_SECONDS = 60
request_workspace = ContextVar("request_workspace", default=None)
logger = logging.getLogger(__name__)
accounts.validate_environment(COSMOS_ENDPOINT)


def with_record_status(entity_type, record):
    if record is not None and entity_type in STATUS_TYPES:
        return {"recordStatus": "Active", **record}
    return record


def validate_record_status(entity_type, payload):
    if entity_type in STATUS_TYPES and "recordStatus" in payload and payload["recordStatus"] not in ("Active", "Archived"):
        raise accounts.AccountError("VALIDATION_ERROR", "recordStatus must be Active or Archived")


def schedule_range(req):
    bounds = {key: req.params.get(key) for key in ("start", "end")}
    for key, value in bounds.items():
        if value is None:
            continue
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d").date()
            if parsed.isoformat() != value:
                raise ValueError
        except (ValueError, TypeError):
            raise accounts.AccountError("VALIDATION_ERROR", f"{key} must be a valid date in YYYY-MM-DD format") from None
    if bounds["start"] and bounds["end"] and bounds["start"] > bounds["end"]:
        raise accounts.AccountError("VALIDATION_ERROR", "start must not be after end")
    return bounds


class Storage:
    def __init__(self):
        self.memory = {entity: {} for entity in (*CONTENT_TYPES, "profiles", "workspaces", "memberships", "invitations", "outbox", "searchRateLimits", "affiliateClicks")}
        self.usage = {}
        self.lock = threading.RLock()
        self.container = None
        if COSMOS_ENDPOINT and COSMOS_KEY:
            # Disable endpoint discovery: the emulator advertises its internal
            # container IP, which isn't reachable from the host.
            client = CosmosClient(
                COSMOS_ENDPOINT,
                COSMOS_KEY,
                connection_verify=False,
                enable_endpoint_discovery=False,
            )
            database = client.create_database_if_not_exists(id=COSMOS_DATABASE)
            self.container = database.create_container_if_not_exists(
                id=COSMOS_CONTAINER,
                partition_key={"paths": ["/partitionKey"], "kind": "Hash"},
            )
        elif COSMOS_ENDPOINT:
            client = CosmosClient(
                COSMOS_ENDPOINT,
                credential=DefaultAzureCredential(),
                enable_endpoint_discovery=False,
            )
            database = client.get_database_client(COSMOS_DATABASE)
            self.container = database.get_container_client(COSMOS_CONTAINER)

    def list(self, entity_type, parent_id=None, category=None, name_prefix=None, owner_id=None, workspace_id=None, fields=None, parent_ids=None, start=None, end=None):
        scope = workspace_id or (request_workspace.get()["id"] if owner_id and request_workspace.get() else None)
        date_field = {"scheduleEvents": "eventDate", "gamePlans": "gameDate"}.get(entity_type)
        if self.container:
            selection = ", ".join(f"c.{field}" for field in fields) if fields else "*"
            query = f"SELECT {selection} FROM c WHERE c.entityType = @entityType"
            parameters = [{"name": "@entityType", "value": entity_type}]
            if parent_id:
                query += " AND c.parentId = @parentId"
                parameters.append({"name": "@parentId", "value": parent_id})
            if parent_ids is not None:
                query += " AND ARRAY_CONTAINS(@parentIds, c.parentId)"
                parameters.append({"name": "@parentIds", "value": list(parent_ids)})
            if category is not None:
                query += " AND c.category = @category"
                parameters.append({"name": "@category", "value": category})
            if name_prefix:
                query += " AND STARTSWITH(c.name, @namePrefix, true)"
                parameters.append({"name": "@namePrefix", "value": name_prefix})
            if date_field and start:
                query += f" AND c.{date_field} >= @start"
                parameters.append({"name": "@start", "value": start})
            if date_field and end:
                query += f" AND c.{date_field} <= @end"
                parameters.append({"name": "@end", "value": end})
            if owner_id and not scope:
                query += " AND c.ownerId = @ownerId"
                parameters.append({"name": "@ownerId", "value": owner_id})
            records = list(self.container.query_items(query, parameters=parameters, enable_cross_partition_query=True))
        else:
            records = list(self.memory[entity_type].values())
        workspace = self.get("workspaces", scope) if scope else None
        records = [with_record_status(entity_type, record) for record in records if (not parent_id or record.get("parentId") == parent_id)
            and (parent_ids is None or record.get("parentId") in parent_ids)
                and (category is None or record.get("category") == category)
                and (not name_prefix or (record.get("name") or "").casefold().startswith(name_prefix.casefold()))
                and (not date_field or not start or (record.get(date_field) or "") >= start)
                and (not date_field or not end or bool(record.get(date_field)) and record[date_field] <= end)
                and (accounts.belongs(record, workspace) if workspace else (not scope and (not owner_id or record.get("ownerId") == owner_id)))]
        return [{key: record[key] for key in fields if key in record} for record in records] if fields else records

    def get(self, entity_type, item_id):
        if self.container:
            try:
                return with_record_status(entity_type, self.container.read_item(item=item_id, partition_key=entity_type))
            except ResourceNotFoundError:
                return None
        return with_record_status(entity_type, self.memory[entity_type].get(item_id))

    def save(self, entity_type, record):
        record["entityType"] = entity_type
        record["partitionKey"] = entity_type
        if self.container:
            try:
                if record.get("_etag"):
                    saved = self.container.replace_item(item=record["id"], body=record, etag=record["_etag"], match_condition=MatchConditions.IfNotModified)
                else:
                    saved = self.container.create_item(record)
                record.update(saved)
                return record
            except HttpResponseError as error:
                if error.status_code == 412 and entity_type in {"plays", "scoutPlays"}:
                    raise accounts.AccountError("RECORD_CHANGED", "This record has been changed by another person or process. Your changes have not been saved. Reopen the record to load the latest version before trying again.", 412) from None
                if isinstance(error, ResourceExistsError) or error.status_code == 412:
                    raise accounts.AccountError("RECORD_CHANGED", "This record changed during the operation; reload and retry", 409) from None
                raise
        if entity_type in {"plays", "scoutPlays"}:
            previous = self.memory[entity_type].get(record["id"])
            if previous is not None and record.get("_etag") != previous.get("_etag"):
                raise accounts.AccountError("RECORD_CHANGED", "This record has been changed by another person or process. Your changes have not been saved. Reopen the record to load the latest version before trying again.", 412)
            record["_etag"] = '"' + str(uuid4()) + '"'
            self.memory[entity_type][record["id"]] = dict(record)
            return record
        self.memory[entity_type][record["id"]] = record
        return record

    def delete(self, entity_type, item_id):
        workspace = request_workspace.get()
        counted = workspace and entity_type in accounts.LIMITS and self.get(entity_type, item_id) is not None
        if counted:
            self.usage_counts(workspace)
        if self.container:
            self.container.delete_item(item=item_id, partition_key=entity_type)
        else:
            self.memory[entity_type].pop(item_id, None)
        if counted:
            self.adjust_usage(workspace, entity_type, -1)

    def usage_counts(self, workspace):
        workspace_id = workspace["id"]
        if self.container:
            try:
                return self.container.read_item(item="usage", partition_key=workspace_id)
            except ResourceNotFoundError:
                counts = {entity: len(self.list(entity, workspace_id=workspace_id)) for entity in accounts.LIMITS}
                return self.container.create_item({"id": "usage", "entityType": "workspaceUsage", "partitionKey": workspace_id, "counts": counts})
        if workspace_id not in self.usage:
            self.usage[workspace_id] = {"counts": {entity: len(self.list(entity, workspace_id=workspace_id)) for entity in accounts.LIMITS}}
        return self.usage[workspace_id]

    def adjust_usage(self, workspace, entity_type, delta):
        ledger = self.usage_counts(workspace)
        current = ledger["counts"].get(entity_type, 0)
        limit = accounts.limits_for_workspace(workspace)[entity_type]
        if delta > 0 and current >= limit:
            raise accounts.AccountError("CONTENT_LIMIT_REACHED", f"This workspace has reached its {limit} {entity_type} limit", 409)
        ledger["counts"][entity_type] = max(0, current + delta)
        if self.container:
            self.container.replace_item(item="usage", body=ledger, etag=ledger["_etag"], match_condition=MatchConditions.IfNotModified)

    def delete_tree(self, entity_type, item_id):
        child_type = {"playbooks": "plays", "plays": "slides", "gamePlans": "scoutPlays"}.get(entity_type)
        if child_type:
            for child in self.list(child_type, parent_id=item_id, workspace_id=request_workspace.get()["id"]):
                self.delete_tree(child_type, child["id"])
        self.delete(entity_type, item_id)

    def claim_legacy_records(self, owner_id):
        for entity_type in CONTENT_TYPES:
            if self.container:
                records = self.container.query_items(
                    "SELECT * FROM c WHERE c.entityType = @entityType AND NOT IS_DEFINED(c.ownerId)",
                    parameters=[{"name": "@entityType", "value": entity_type}],
                    enable_cross_partition_query=True,
                )
            else:
                records = self.memory[entity_type].values()
            for record in list(records):
                if not record.get("ownerId"):
                    record["ownerId"] = owner_id
                    self.save(entity_type, record)

    @contextmanager
    def guard(self, scope):
        with self.lock:
            if not self.container:
                yield
                return
            lock_id = "lock-" + hashlib.sha256(scope.encode()).hexdigest()
            try:
                lease = self.container.create_item({"id": lock_id, "partitionKey": scope, "entityType": "operations", "scope": scope, "createdAt": now()})
            except ResourceExistsError:
                raise accounts.AccountError("WORKSPACE_BUSY", "Another workspace operation is in progress; retry shortly", 409) from None
            try:
                yield
            finally:
                self.container.delete_item(lock_id, partition_key=scope, etag=lease["_etag"], match_condition=MatchConditions.IfNotModified)


storage = Storage()

if AUTH_MODE == "development":
    storage.claim_legacy_records(DEV_USER_ID)


def response(payload, status=200):
    return func.HttpResponse(
        json.dumps(payload),
        status_code=status,
        mimetype="application/json",
        headers={"Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff"},
    )


def cors_response(handler):
    @wraps(handler)
    def wrapped(req):
        try:
            result = handler(req)
        except Exception:
            diagnostic_id = uuid4().hex
            path = (req.route_params.get("path") or "").strip("/").split("/")
            logger.exception(
                "Unhandled API exception",
                extra={"custom_dimensions": {
                    "diagnosticId": diagnostic_id,
                    "httpMethod": req.method,
                    "operation": path[0] if path else "unknown",
                }},
            )
            result = response({"error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again.",
                "diagnosticId": diagnostic_id,
            }}, 500)
        origin = req.headers.get("Origin")
        allowed_origins = {
            value.strip().rstrip("/")
            for value in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
            if value.strip()
        }
        local_development = AUTH_MODE == "development" and not (
            os.getenv("WEBSITE_SITE_NAME") or os.getenv("WEBSITE_INSTANCE_ID")
        )
        headers = dict(result.headers)
        headers.pop("Access-Control-Allow-Origin", None)
        headers.pop("Vary", None)
        if origin and origin.rstrip("/") in allowed_origins:
            headers["Access-Control-Allow-Origin"] = origin
            headers["Vary"] = "Origin"
        elif origin and local_development and not allowed_origins:
            headers["Access-Control-Allow-Origin"] = "*"
        return func.HttpResponse(
            result.get_body(),
            status_code=result.status_code,
            mimetype=result.mimetype,
            headers=headers,
        )
    return wrapped


def affiliate_destination(partner_id):
    partner = next((item for item in AFFILIATE_PARTNERS if item["id"] == partner_id), None)
    if partner is None:
        return None
    destination = os.getenv(partner["setting"], "").strip()
    parsed = urlparse(destination)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return None
    return destination


def affiliate_redirect(partner_id):
    destination = affiliate_destination(partner_id)
    if destination is None:
        return response({"error": {"code": "AFFILIATE_LINK_UNAVAILABLE", "message": "This recommendation is unavailable"}}, 404)
    storage.save("affiliateClicks", {
        "id": str(uuid4()), "partnerId": partner_id, "clickedAt": now(),
    })
    return func.HttpResponse(status_code=302, headers={
        "Location": destination,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
    })


def affiliate_recommendations(workspace):
    if workspace["subscription"].get("kind") != "free":
        return None
    return [{"id": partner["id"], "name": partner["name"], "description": partner["description"],
             "href": f"/api/go/{partner['id']}"}
            for partner in AFFILIATE_PARTNERS if affiliate_destination(partner["id"]) is not None]


def check_search_rate(user_id):
    timestamp = time()
    window = int(timestamp // SEARCH_WINDOW_SECONDS)
    counter_id = hashlib.sha256(user_id.encode()).hexdigest()
    counter = storage.get("searchRateLimits", counter_id) or {"id": counter_id}
    count = counter.get("count", 0) if counter.get("window") == window else 0
    if count >= SEARCH_REQUEST_LIMIT:
        result = response({"error": {"code": "SEARCH_RATE_LIMITED", "message": "Too many searches. Please wait a minute and try again."}}, 429)
        result.headers["Retry-After"] = str(max(1, int((window + 1) * SEARCH_WINDOW_SECONDS - timestamp) + 1))
        result.headers["Cache-Control"] = "no-store"
        return result
    storage.save("searchRateLimits", {**counter, "window": window, "count": count + 1})
    return None


def body(req):
    try:
        payload = req.get_json()
    except ValueError:
        raise accounts.AccountError("VALIDATION_ERROR", "Request body must be a JSON object") from None
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise accounts.AccountError("VALIDATION_ERROR", "Request body must be a JSON object")
    return payload


def now():
    return datetime.now(timezone.utc).isoformat()


def not_found(kind, item_id):
    return response({"error": {"code": "NOT_FOUND", "message": f"{kind} {item_id} was not found"}}, 404)


def forbidden():
    return response({"error": {"code": "FORBIDDEN", "message": "You do not have access to this resource"}}, 403)


def authenticate_request(req):
    if AUTH_MODE == "entra":
        try:
            return authentication.authenticate_entra(req.headers), None
        except accounts.AccountError as error:
            return None, response({"error": {"code": error.code, "message": str(error)}}, error.status)
    if AUTH_MODE != "development":
        return None, response({"error": {
            "code": "AUTH_NOT_CONFIGURED",
            "message": "A supported authentication provider is not configured",
        }}, 503)

    supplied_secret = req.headers.get("X-Dev-Auth-Secret", "")
    supplied_user_id = req.headers.get("X-Dev-User", "").strip()
    if not DEV_AUTH_SECRET or not supplied_user_id or not secrets.compare_digest(supplied_secret, DEV_AUTH_SECRET):
        return None, response({"error": {"code": "UNAUTHORIZED", "message": "Authentication is required"}}, 401)

    return {
        "userId": supplied_user_id,
        "name": DEV_USER_NAME if supplied_user_id == DEV_USER_ID else supplied_user_id,
        "email": os.getenv("DEV_USER_EMAIL", "") if supplied_user_id == DEV_USER_ID else (supplied_user_id if "@" in supplied_user_id else ""),
        "emailVerified": True,
        "roles": [],
    }, None


def with_child_count(record, entity_type, owner_id):
    record = dict(record)
    record["playCount"] = len(storage.list(entity_type, record["id"], owner_id=owner_id))
    return record


def with_owner_name(record):
    profile = storage.get("profiles", record.get("ownerId")) or {}
    return {**record, "ownerName": profile.get("name") or record.get("ownerId", "")}


PAGED_TYPES = {"plays", "playGroupings", "scoutPlays"}


def paged_siblings(entity_type, parent_id):
    workspace_id = request_workspace.get()["id"]
    if entity_type in {"plays", "playGroupings"}:
        records = storage.list("plays", parent_id, workspace_id=workspace_id)
        records.extend(storage.list("playGroupings", parent_id, workspace_id=workspace_id))
    else:
        records = storage.list(entity_type, parent_id, workspace_id=workspace_id)
    records.sort(key=lambda record: (not isinstance(record.get("page"), int), record.get("page") or 0, record.get("createdAt") or ""))
    return records


def renumber_pages(entity_type, records):
    for index, record in enumerate(records, start=1):
        if record.get("page") != index:
            record["page"] = index
            storage.save(record.get("entityType", entity_type), record)
    return records


def list_paged(entity_type, parent_id, category, name_prefix):
    records = renumber_pages(entity_type, paged_siblings(entity_type, parent_id))
    return [with_owner_name(record) for record in records if record.get("entityType") == entity_type
            if (category is None or record.get("category") == category)
            and (not name_prefix or (record.get("name") or "").casefold().startswith(name_prefix.casefold()))]


def without_grid_only_fields(record, preserve_theme=False):
    omitted = {"createdAt"}
    if not preserve_theme:
        omitted.add("theme")
    return {key: value for key, value in record.items() if key not in omitted}


def list_playbook_rows(parent_id, name_prefix, summary=False):
    records = renumber_pages("plays", paged_siblings("plays", parent_id))
    rows = [with_owner_name({**record, **({"rowType": "grouping"} if record.get("entityType") == "playGroupings" else {})})
            for record in records
            if not name_prefix or (record.get("name") or "").casefold().startswith(name_prefix.casefold())]
    if not summary:
        return rows
    adjustments = {row["id"]: [] for row in rows if row.get("rowType") != "grouping"}
    if adjustments:
        slides = storage.list("slides", workspace_id=request_workspace.get()["id"],
                              fields=("id", "parentId", "title", "workspaceId", "ownerId"), parent_ids=adjustments)
        for slide in slides:
            adjustments[slide["parentId"]].append(slide.get("title") or "Adjustment")
    omitted = {"markers", "drawings", "textAnnotations", "zones", "createdAt", "theme", "_rid", "_self", "_ts", "_attachments"}
    return [{**{key: value for key, value in row.items() if key not in omitted},
             **({"adjustments": adjustments[row["id"]]} if row.get("rowType") != "grouping" else {})} for row in rows]


def reorder_pages(entity_type, parent_id, payload):
    ids = payload.get("ids")
    records = {record["id"]: record for record in paged_siblings(entity_type, parent_id)}
    if not isinstance(ids, list) or len(ids) != len(records) or set(ids) != set(records):
        return response({"error": {"code": "VALIDATION_ERROR", "message": "ids must list every item exactly once"}}, 400)
    renumber_pages(entity_type, [records[item_id] for item_id in ids])
    return response({"items": [{"id": item_id, "page": index} for index, item_id in enumerate(ids, start=1)]})


def create_record(entity_type, payload, owner_id, parent_id=None):
    validate_record_status(entity_type, payload)
    payload = {key: value for key, value in payload.items() if key not in {"_etag", "_rid", "_self", "_ts", "_attachments"}}
    if entity_type in STATUS_TYPES:
        payload.setdefault("recordStatus", "Active")
    if entity_type in PAGED_TYPES:
        siblings = renumber_pages(entity_type, paged_siblings(entity_type, parent_id))
        payload["page"] = len(siblings) + 1
    workspace = request_workspace.get()
    if workspace and entity_type in accounts.LIMITS:
        storage.adjust_usage(workspace, entity_type, 1)
    item_id = str(uuid4())
    record = {**payload, "id": item_id, "ownerId": owner_id, "createdAt": now(), "updatedAt": now()}
    if workspace:
        record["workspaceId"] = workspace["id"]
        record["createdBy"] = owner_id
    if parent_id:
        record["parentId"] = parent_id
    return response(storage.save(entity_type, record), 201)


def update_record(entity_type, item_id, payload):
    validate_record_status(entity_type, payload)
    record = storage.get(entity_type, item_id)
    if record is None:
        return None
    if entity_type in {"plays", "scoutPlays"}:
        expected_etag = payload.get("_etag")
        if not isinstance(expected_etag, str) or not expected_etag.strip() or expected_etag == "*":
            raise accounts.AccountError("ETAG_REQUIRED", "Reopen this record to load its version before saving. Your changes have not been saved.", 428)
        if expected_etag != record.get("_etag"):
            raise accounts.AccountError("RECORD_CHANGED", "This record has been changed by another person or process. Your changes have not been saved. Reopen the record to load the latest version before trying again.", 412)
        record["_etag"] = expected_etag
    immutable_fields = {"id", "ownerId", "workspaceId", "createdBy", "parentId", "entityType", "partitionKey", "createdAt", "page", "_etag", "_rid", "_self", "_ts", "_attachments"}
    record.update({key: value for key, value in payload.items() if key not in immutable_fields})
    record["updatedAt"] = now()
    return response(storage.save(entity_type, record))


def validate_schedule_event(payload, partial=False):
    allowed_types = {"Practice", "Film Review", "Team Meeting", "Other"}
    if not partial and not {"name", "eventType", "eventDate"}.issubset(payload):
        return "name, eventType, and eventDate are required"
    if "name" in payload and (not isinstance(payload["name"], str) or not payload["name"].strip()):
        return "name must be a non-empty string"
    if "eventType" in payload and payload["eventType"] not in allowed_types:
        return "eventType must be Practice, Film Review, Team Meeting, or Other"
    if "eventDate" in payload:
        try:
            parsed_date = datetime.strptime(payload["eventDate"], "%Y-%m-%d").date()
        except (TypeError, ValueError):
            return "eventDate must be a valid date in YYYY-MM-DD format"
        if parsed_date.isoformat() != payload["eventDate"]:
            return "eventDate must be a valid date in YYYY-MM-DD format"
    for key in ("startTime", "endTime", "location", "notes"):
        if key in payload and not isinstance(payload[key], str):
            return f"{key} must be a string"
    return None


@app.route(route="{*path}", methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])
@cors_response
def api(req: func.HttpRequest) -> func.HttpResponse:
    path = (req.route_params.get("path") or "").strip("/").split("/")
    if len(path) == 2 and path[0] == "go" and req.method == "GET":
        return affiliate_redirect(path[1])
    if req.method == "OPTIONS" or (path == ["health"] and req.method == "GET"):
        return dispatch(req, None, None, None)
    user, auth_error = authenticate_request(req)
    if auth_error:
        return auth_error
    search_term = req.params.get("q") if path == ["search"] else req.params.get("namePrefix") if path[0] in {"playbooks", "game-plans"} else None
    search_request = req.method == "GET" and (path == ["search"] or bool(search_term))
    if search_request and (not isinstance(search_term, (str, type(None))) or len(search_term or "") > SEARCH_MAX_LENGTH):
        return response({"error": {"code": "VALIDATION_ERROR", "message": f"Search text must be at most {SEARCH_MAX_LENGTH} characters"}}, 400)
    try:
        with storage.guard("user:" + user["userId"]):
            if search_request:
                limited = check_search_rate(user["userId"])
                if limited is not None:
                    return limited
            accounts.ensure_user(storage, user)
        accounts.bootstrap_configured_alpha_owner(storage, user)
        global_route = path[0] in {"me", "workspaces", "invitations"}
        if global_route:
            with storage.guard("user:" + user["userId"]):
                return dispatch(req, user, None, None)
        workspace, role = accounts.select_workspace(storage, user, req.headers.get("X-Workspace-Id"))
        token = request_workspace.set(workspace)
        try:
            with storage.guard(workspace["id"]):
                workspace, role = accounts.select_workspace(storage, user, req.headers.get("X-Workspace-Id"))
                request_workspace.set(workspace)
                if path[0] in {"playbooks", "game-plans", "schedule-events", "search", "exports", "workspace"}:
                    accounts.enter_workspace(storage, workspace)
                return dispatch(req, user, workspace, role)
        finally:
            request_workspace.reset(token)
    except accounts.AccountError as error:
        return response({"error": {"code": error.code, "message": str(error)}}, error.status)


def dispatch(req, user, workspace, role):
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Dev-Auth-Secret,X-Dev-User,X-Workspace-Id",
        })

    path = (req.route_params.get("path") or "").strip("/").split("/")
    method = req.method

    if path == ["health"] and method == "GET":
        return response({"status": "ok", "service": "blitzboard-studio-api"})

    if path == ["affiliate", "recommendations"] and method == "GET":
        items = affiliate_recommendations(workspace)
        if items is None:
            return forbidden()
        return response({"items": items})

    owner_id = user["userId"]

    account_result = accounts.account_route(storage, user, workspace, role, path, method, body(req) if method in {"POST", "PATCH"} else {})
    if account_result is not None:
        payload, status = account_result
        return response(payload, status) if status != 204 else func.HttpResponse(status_code=204)
    if workspace is None:
        return response({"error": {"code": "NOT_FOUND", "message": "Route not found"}}, 404)
    if not accounts.can_read(workspace):
        raise accounts.AccountError("CONTENT_RETENTION_ENDED", "This workspace's eighteen-month content retention period has ended", 410)
    if path[0] in accounts.CONTENT_ROUTE_PERMISSIONS:
        accounts.require_permission(workspace, role, accounts.content_permission(path, method))

    if path == ["search"] and method == "GET":
        play_read = accounts.has_permission(role, accounts.Permission.PLAY_READ)
        game_read = accounts.has_permission(role, accounts.Permission.GAMEPLAN_READ)
        if not (play_read or game_read):
            return forbidden()
        query = (req.params.get("q") or "").strip().casefold()
        fields = ("id", "name", "year", "entityType", "parentId", "gamePlanId", "gameCardId", "unit", "category", "recordStatus", "workspaceId", "ownerId")
        books = storage.list("playbooks", owner_id=owner_id, fields=fields) if play_read else []
        books_by_id = {book["id"]: book for book in books}
        results = []
        for entity_type, records in (
            ("playbooks", books),
            ("gamePlans", storage.list("gamePlans", owner_id=owner_id, fields=fields) if game_read else []),
            ("plays", storage.list("plays", owner_id=owner_id, fields=fields) if play_read else []),
            ("scoutPlays", storage.list("scoutPlays", owner_id=owner_id, fields=fields) if game_read else []),
        ):
            for record in records:
                if query and query not in (record.get("name") or "").casefold():
                    continue
                if entity_type == "playbooks":
                    card_id = record.get("gameCardId") or ""
                    label = "Install" if card_id.endswith("-installs") else "Practice Script" if card_id.endswith("-scout") else "Playbook"
                elif entity_type == "plays":
                    book = books_by_id.get(record.get("parentId"))
                    if book is None:
                        continue
                    label = "Scout Play" if (book.get("gameCardId") or "").endswith("-scout") else "Play"
                else:
                    label = "Game" if entity_type == "gamePlans" else "Scouting Report"
                results.append({**record, "entityType": entity_type, "type": label})
        results.sort(key=lambda item: ((item.get("name") or "").casefold(), item["type"], item["id"]))
        return response({"items": results[:SEARCH_RESULT_LIMIT], "query": query, "total": len(results), "limit": SEARCH_RESULT_LIMIT, "truncated": len(results) > SEARCH_RESULT_LIMIT})

    if path == ["schedule-events"]:
        if method == "GET":
            fields = ("id", "name", "eventType", "eventDate", "startTime", "workspaceId", "ownerId") if req.params.get("scheduleSummary") == "true" else None
            records = storage.list("scheduleEvents", owner_id=owner_id, fields=fields, **schedule_range(req))
            return response({"items": records})
        if method == "POST":
            payload = body(req)
            error = validate_schedule_event(payload)
            if error:
                return response({"error": {"code": "VALIDATION_ERROR", "message": error}}, 400)
            return create_record("scheduleEvents", payload, owner_id)

    if len(path) == 2 and path[0] == "schedule-events":
        event_id = path[1]
        event = storage.get("scheduleEvents", event_id)
        if event is None:
            return not_found("Schedule event", event_id)
        if not accounts.belongs(event, workspace):
            return forbidden()
        if method == "GET":
            return response(event)
        if method == "PATCH":
            payload = body(req)
            error = validate_schedule_event(payload, partial=True)
            if error:
                return response({"error": {"code": "VALIDATION_ERROR", "message": error}}, 400)
            return update_record("scheduleEvents", event_id, payload)
        if method == "DELETE":
            storage.delete("scheduleEvents", event_id)
            return func.HttpResponse(status_code=204)

    if path == ["playbooks"]:
        if method == "GET":
            records = storage.list("playbooks", category=req.params.get("category"), name_prefix=req.params.get("namePrefix"), owner_id=owner_id)
            items = [with_owner_name(with_child_count(record, "plays", owner_id)) for record in records]
            if req.params.get("summary") == "true":
                items = [without_grid_only_fields(record) for record in items]
            return response({"items": items})
        if method == "POST":
            payload = body(req)
            if not payload.get("name"):
                return response({"error": {"code": "VALIDATION_ERROR", "message": "name is required"}}, 400)
            return create_record("playbooks", payload, owner_id)

    if path == ["game-plans"]:
        if method == "GET":
            bounds = schedule_range(req)
            if req.params.get("scheduleSummary") == "true":
                fields = ("id", "name", "opponent", "gameDate", "startTime", "gameSite", "recordStatus", "workspaceId", "ownerId")
                return response({"items": storage.list("gamePlans", category=req.params.get("category"), name_prefix=req.params.get("namePrefix"), owner_id=owner_id, fields=fields, **bounds)})
            records = storage.list("gamePlans", category=req.params.get("category"), name_prefix=req.params.get("namePrefix"), owner_id=owner_id, **bounds)
            items = [with_owner_name(with_child_count(record, "scoutPlays", owner_id)) for record in records]
            if req.params.get("summary") == "true":
                items = [without_grid_only_fields(record) for record in items]
            return response({"items": items})
        if method == "POST":
            payload = body(req)
            if not payload.get("name"):
                return response({"error": {"code": "VALIDATION_ERROR", "message": "name is required"}}, 400)
            return create_record("gamePlans", payload, owner_id)

    if len(path) >= 2 and path[0] == "game-plans":
        game_plan_id = path[1]
        game_plan = storage.get("gamePlans", game_plan_id)
        if game_plan is None:
            return not_found("Game plan", game_plan_id)
        if not accounts.belongs(game_plan, workspace):
            return forbidden()
        if len(path) == 2:
            if method == "GET":
                return response(with_child_count(game_plan, "scoutPlays", owner_id))
            if method == "PATCH":
                return update_record("gamePlans", game_plan_id, body(req))
            if method == "DELETE":
                storage.delete_tree("gamePlans", game_plan_id)
                return func.HttpResponse(status_code=204)

        if len(path) >= 3 and path[2] == "scout-plays":
            entity_type = "scoutPlays"
            if len(path) == 3:
                if method == "GET":
                    items = list_paged(entity_type, game_plan_id, req.params.get("category"), req.params.get("namePrefix"))
                    if req.params.get("summary") == "true":
                        items = [without_grid_only_fields(record, preserve_theme=True) for record in items]
                    return response({"items": items})
                if method == "POST":
                    return create_record(entity_type, body(req), owner_id, game_plan_id)
            if len(path) == 4 and path[3] == "reorder" and method == "POST":
                return reorder_pages(entity_type, game_plan_id, body(req))
            if len(path) == 4:
                item_id = path[3]
                record = storage.get(entity_type, item_id)
                if record is None or record.get("parentId") != game_plan_id or not accounts.belongs(record, workspace):
                    return not_found("Scout play", item_id)
                if method == "GET":
                    return response(record)
                if method == "PATCH":
                    return update_record(entity_type, item_id, body(req))
                if method == "DELETE":
                    storage.delete(entity_type, item_id)
                    renumber_pages(entity_type, paged_siblings(entity_type, game_plan_id))
                    return func.HttpResponse(status_code=204)

    if len(path) >= 2 and path[0] == "playbooks":
        playbook_id = path[1]
        playbook = storage.get("playbooks", playbook_id)
        if playbook is None:
            return not_found("Playbook", playbook_id)
        if not accounts.belongs(playbook, workspace):
            return forbidden()
        if len(path) == 2:
            if method == "GET":
                return response(with_child_count(playbook, "plays", owner_id))
            if method == "PATCH":
                return update_record("playbooks", playbook_id, body(req))
            if method == "DELETE":
                storage.delete_tree("playbooks", playbook_id)
                return func.HttpResponse(status_code=204)

        if len(path) == 3 and path[2] == "rows" and method == "GET":
            return response({"items": list_playbook_rows(playbook_id, req.params.get("namePrefix"), req.params.get("summary") == "true")})

        if len(path) == 3 and path[2] == "groupings" and method == "POST":
            payload = body(req)
            name = payload.get("name")
            description = payload.get("description", "")
            if not isinstance(name, str) or not name.strip():
                return response({"error": {"code": "VALIDATION_ERROR", "message": "name is required"}}, 400)
            if not isinstance(description, str):
                return response({"error": {"code": "VALIDATION_ERROR", "message": "description must be a string"}}, 400)
            return create_record("playGroupings", {"name": name.strip(), "description": description.strip()}, owner_id, playbook_id)

        if len(path) == 4 and path[2] == "groupings":
            grouping_id = path[3]
            grouping = storage.get("playGroupings", grouping_id)
            if grouping is None or grouping.get("parentId") != playbook_id or not accounts.belongs(grouping, workspace):
                return not_found("Grouping", grouping_id)
            if method == "PATCH":
                payload = body(req)
                name = payload.get("name")
                description = payload.get("description", grouping.get("description", ""))
                if not isinstance(name, str) or not name.strip():
                    return response({"error": {"code": "VALIDATION_ERROR", "message": "name is required"}}, 400)
                if not isinstance(description, str):
                    return response({"error": {"code": "VALIDATION_ERROR", "message": "description must be a string"}}, 400)
                return update_record("playGroupings", grouping_id, {"name": name.strip(), "description": description.strip()})
            if method == "DELETE":
                storage.delete("playGroupings", grouping_id)
                renumber_pages("plays", paged_siblings("plays", playbook_id))
                return func.HttpResponse(status_code=204)

        if len(path) >= 3 and path[2] == "plays":
            if len(path) == 3:
                if method == "GET":
                    items = list_paged("plays", playbook_id, req.params.get("category"), req.params.get("namePrefix"))
                    if req.params.get("summary") == "true":
                        preserve_theme = req.params.get("preserveTheme") == "true"
                        items = [without_grid_only_fields(record, preserve_theme=preserve_theme) for record in items]
                    return response({"items": items})
                if method == "POST":
                    return create_record("plays", body(req), owner_id, playbook_id)

            if len(path) == 4 and path[3] == "reorder" and method == "POST":
                return reorder_pages("plays", playbook_id, body(req))

            if len(path) >= 4:
                play_id = path[3]
                play = storage.get("plays", play_id)
                if play is None or play.get("parentId") != playbook_id or not accounts.belongs(play, workspace):
                    return not_found("Play", play_id)
                if len(path) == 4:
                    if method == "GET":
                        return response(play)
                    if method == "PATCH":
                        return update_record("plays", play_id, body(req))
                    if method == "DELETE":
                        storage.delete_tree("plays", play_id)
                        renumber_pages("plays", paged_siblings("plays", playbook_id))
                        return func.HttpResponse(status_code=204)

                if len(path) >= 5 and path[4] == "slides":
                    if len(path) == 5:
                        summary = method == "GET" and req.params.get("summary") == "true"
                        records = storage.list("slides", play_id, owner_id=owner_id,
                                               fields=("id", "parentId", "title", "workspaceId", "ownerId") if summary else None)
                        if method == "GET":
                            return response({"items": [{"id": slide["id"], "title": slide.get("title") or "Adjustment"} for slide in records] if summary else records})
                        if method == "POST":
                            if len(records) >= 3:
                                return response({
                                    "error": {
                                        "code": "SLIDE_LIMIT_REACHED",
                                        "message": "A play can have at most 3 adjustment slides",
                                    }
                                }, 409)
                            return create_record("slides", body(req), owner_id, play_id)
                    if len(path) == 6:
                        slide_id = path[5]
                        slide = storage.get("slides", slide_id)
                        if slide is None or slide.get("parentId") != play_id or not accounts.belongs(slide, workspace):
                            return not_found("Slide", slide_id)
                        if method == "GET":
                            return response(slide)
                        if method == "PATCH":
                            return update_record("slides", slide_id, body(req))
                        if method == "DELETE":
                            storage.delete("slides", slide_id)
                            return func.HttpResponse(status_code=204)

    if path == ["exports"] and method == "POST":
        payload = body(req)
        for key, entity in {"playbookId": "playbooks", "gamePlanId": "gamePlans", "playId": "plays", "scoutPlayId": "scoutPlays"}.items():
            if payload.get(key):
                accounts.require_permission(workspace, role, accounts.Permission.GAMEPLAN_READ if entity in {"gamePlans", "scoutPlays"} else accounts.Permission.PLAY_READ)
                referenced = storage.get(entity, payload[key])
                if not referenced or not accounts.belongs(referenced, workspace):
                    return forbidden()
        record = {**payload, "id": str(uuid4()), "ownerId": owner_id, "workspaceId": workspace["id"], "status": "queued", "createdAt": now()}
        return response(storage.save("exports", record), 202)

    if len(path) == 2 and path[0] == "exports" and method == "GET":
        record = storage.get("exports", path[1])
        if not record:
            return not_found("Export", path[1])
        if record.get("gamePlanId") or record.get("scoutPlayId"):
            accounts.require_permission(workspace, role, accounts.Permission.GAMEPLAN_READ)
        return response(record) if accounts.belongs(record, workspace) else forbidden()

    return response({"error": {"code": "NOT_FOUND", "message": "Route not found"}}, 404)
