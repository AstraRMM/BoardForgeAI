import json
import os


def read_boardforge_status(project_dir):
    run_log = _read_json(os.path.join(project_dir, "BoardForge_Engine_Run_Log.json"))
    manifest = _read_json(os.path.join(project_dir, "BoardForge_Project_Manifest.json"))
    return {
        "schema": "boardforge.kicad-status-bridge.v1",
        "source": "local_artifact_polling",
        "projectDir": project_dir,
        "projectId": (manifest or {}).get("projectId") or (manifest or {}).get("id") or (run_log or {}).get("projectId"),
        "status": (run_log or {}).get("status") or (manifest or {}).get("status"),
        "board": (run_log or {}).get("boardPath") or (manifest or {}).get("boardPath"),
        "drc": ((run_log or {}).get("validation") or {}).get("drcViolations") or ((manifest or {}).get("validation") or {}).get("drcViolations"),
        "erc": ((run_log or {}).get("validation") or {}).get("ercViolations") or ((manifest or {}).get("validation") or {}).get("ercErrors"),
        "unconnected": ((run_log or {}).get("validation") or {}).get("unconnected") or ((manifest or {}).get("validation") or {}).get("unconnected"),
        "manufacturingReady": bool(((run_log or {}).get("manufacturing") or {}).get("ready") or ((manifest or {}).get("manufacturing") or {}).get("ready")),
        "manufacturingZip": ((run_log or {}).get("manufacturing") or {}).get("zip") or ((manifest or {}).get("manufacturing") or {}).get("zip"),
    }


def _read_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)
