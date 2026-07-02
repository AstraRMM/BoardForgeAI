import json
import os


def read_boardforge_status(project_dir):
    kind = project_kind(project_dir)
    run_log = _read_json(os.path.join(project_dir, "BoardForge_Engine_Run_Log.json"))
    manifest = _read_json(os.path.join(project_dir, "BoardForge_Project_Manifest.json"))
    publish = ((manifest or {}).get("publish") or {})
    license_status = _license_status()
    return {
        "schema": "boardforge.kicad-status-bridge.v1",
        "source": "local_artifact_polling",
        "projectKind": kind,
        "repairEnabled": kind == "sandbox",
        "projectDir": project_dir,
        "projectId": (manifest or {}).get("projectId") or (manifest or {}).get("id") or (run_log or {}).get("projectId"),
        "status": (run_log or {}).get("status") or (manifest or {}).get("status"),
        "board": (run_log or {}).get("boardPath") or (manifest or {}).get("boardPath"),
        "drc": ((run_log or {}).get("validation") or {}).get("drcViolations") or ((manifest or {}).get("validation") or {}).get("drcViolations"),
        "erc": ((run_log or {}).get("validation") or {}).get("ercViolations") or ((manifest or {}).get("validation") or {}).get("ercErrors"),
        "unconnected": ((run_log or {}).get("validation") or {}).get("unconnected") or ((manifest or {}).get("validation") or {}).get("unconnected"),
        "manufacturingReady": bool(((run_log or {}).get("manufacturing") or {}).get("ready") or ((manifest or {}).get("manufacturing") or {}).get("ready")),
        "manufacturingZip": ((run_log or {}).get("manufacturing") or {}).get("zip") or ((manifest or {}).get("manufacturing") or {}).get("zip"),
        "licenseStatus": license_status,
        "projectState": publish.get("projectState") or (manifest or {}).get("projectState") or "local_draft",
        "publishApproved": bool(publish.get("publishApproved") or (manifest or {}).get("publishApproved")),
        "dashboardVisible": bool(publish.get("dashboardVisible") or (manifest or {}).get("dashboardVisible")),
        "syncStatus": publish.get("syncStatus") or (manifest or {}).get("syncStatus") or "not_synced",
        "approvalReport": os.path.join(project_dir, "BoardForge_Project_Approval_Report.md"),
        "briefReport": os.path.join(project_dir, "BoardForge_Board_Brief.md"),
        "briefApprovalRequired": not bool((manifest or {}).get("boardBrief", {}).get("approved")),
    }


def project_kind(project_dir):
    text = str(project_dir).lower().replace("/", "\\")
    if "\\boardforge_sandboxes\\" in text or "\\boardforge_new_board_fixtures\\" in text or text.endswith("_sandbox"):
        return "sandbox"
    return "source"


def _read_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _license_status():
    if str(os.environ.get("BOARDFORGE_DEV_LICENSE", "")).lower() == "true":
        return {"licensed": True, "source": "BOARDFORGE_DEV_LICENSE", "devMode": True}
    if os.environ.get("BOARDFORGE_LICENSE_KEY"):
        return {"licensed": True, "source": "BOARDFORGE_LICENSE_KEY", "devMode": False}
    return {"licensed": False, "source": "none", "devMode": False}
