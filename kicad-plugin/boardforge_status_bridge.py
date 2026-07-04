import json
import os


def read_boardforge_status(project_dir):
    kind = project_kind(project_dir)
    run_log = _read_json(os.path.join(project_dir, "BoardForge_Engine_Run_Log.json"))
    manifest = _read_json(os.path.join(project_dir, "BoardForge_Project_Manifest.json"))
    intake = _read_json(os.path.join(project_dir, "BoardForge_Intake_Session.json"))
    publish = ((manifest or {}).get("publish") or {})
    license_status = _license_status()
    return {
        "schema": "boardforge.kicad-status-bridge.v1",
        "source": "localhost_service_or_local_artifact_polling",
        "localServiceUrl": "http://127.0.0.1:38991",
        "localServiceHealth": "GET /health",
        "localServiceStartCommand": "npm run boardforge:local-server",
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
        "previewSvg": os.path.join(project_dir, "BoardForge_Board_Preview.svg"),
        "dashboardProjectPage": "local web dashboard project page reads BoardForge_Web_Project_Card.json",
        "licenseStatus": license_status,
        "projectState": publish.get("projectState") or (manifest or {}).get("projectState") or "local_draft",
        "publishApproved": bool(publish.get("publishApproved") or (manifest or {}).get("publishApproved")),
        "dashboardVisible": bool(publish.get("dashboardVisible") or (manifest or {}).get("dashboardVisible")),
        "syncStatus": publish.get("syncStatus") or (manifest or {}).get("syncStatus") or "not_synced",
        "approvalReport": os.path.join(project_dir, "BoardForge_Project_Approval_Report.md"),
        "briefReport": os.path.join(project_dir, "BoardForge_Board_Brief.md"),
        "intakeSession": os.path.join(project_dir, "BoardForge_Intake_Session.json"),
        "intakeStatus": (intake or {}).get("status") or "not_started",
        "inferredBoardType": (intake or {}).get("boardType") or ((manifest or {}).get("questionPlan") or {}).get("boardType"),
        "questionsToAsk": (intake or {}).get("questionsToAsk") or ((manifest or {}).get("questionPlan") or {}).get("questionsToAsk") or [],
        "revisionStatus": ((manifest or {}).get("revision") or {}).get("status") or "none",
        "buildAllowed": bool((manifest or {}).get("briefApproved")),
        "publishAllowed": bool(publish.get("publishApproved") or (manifest or {}).get("publishApproved")),
        "briefApprovalRequired": not bool((manifest or {}).get("boardBrief", {}).get("approved")),
        "boardReviewReport": os.path.join(project_dir, "BoardForge_Board_Review_Report.md"),
        "projectHealthScore": os.path.join(project_dir, "BoardForge_Project_Health_Score.json"),
        "manufacturingRiskReport": os.path.join(project_dir, "BoardForge_Manufacturing_Risk_Report.md"),
        "routeabilityExplanation": os.path.join(project_dir, "BoardForge_Routeability_Explanation.md"),
        "projectDiffReport": os.path.join(project_dir, "BoardForge_Project_Diff_Report.md"),
        "appliedLessonsReport": os.path.join(project_dir, "BoardForge_Applied_Lessons_Report.md"),
        "blockerReport": os.path.join(project_dir, "BoardForge_Blocker_Report.md"),
        "sourcingStatus": "GET /sourcing/status",
        "digikeyStatus": "GET /integrations/digikey/status",
        "bomSourcingReport": os.path.join(project_dir, "BoardForge_BOM_Sourcing_Report.md"),
        "quoteReadinessReport": os.path.join(project_dir, "BoardForge_Quote_Readiness_Report.md"),
        "makeSourcableReport": os.path.join(project_dir, "BoardForge_Make_Sourcable_Report.md"),
        "alternativePartsReport": os.path.join(project_dir, "BoardForge_Alternative_Parts_Report.md"),
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
