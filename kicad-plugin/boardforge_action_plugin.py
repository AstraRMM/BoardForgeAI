try:
    import pcbnew
except ImportError:
    pcbnew = None

import os


PROTECTED_MARKERS = (
    "FN-ESC1",
    "FN-ESC",
    "FN-FC",
    "ESC",
    "FC",
    "flight",
    "flight-controller",
    "flight_controller",
)


def is_protected_path(path):
    text = str(path).lower()
    return any(marker.lower() in text for marker in PROTECTED_MARKERS)


def build_boardforge_command(board_path):
    return build_boardforge_commands(board_path)["validate"]


def build_boardforge_commands(board_path):
    board_path = str(board_path)
    project_dir = os.path.dirname(board_path)
    manifest = manifest_path_for(board_path)
    sandbox_dir = sandbox_path_for(project_dir)
    return {
        "import_sandbox": ["npm", "run", "boardforge:import-sandbox", "--", "--source", project_dir, "--output", sandbox_dir],
        "license": ["npm", "run", "boardforge:license", "--", "--action", "repair_drc"],
        "validate": ["npm", "run", "boardforge:validate", "--", "--project", board_path],
        "route": ["npm", "run", "boardforge:route", "--", "--project", board_path],
        "repair": ["npm", "run", "boardforge:cleanup", "--", "--project", board_path],
        "cleanup": ["npm", "run", "boardforge:cleanup", "--", "--project", board_path],
        "export": ["npm", "run", "boardforge:export", "--", "--project", board_path],
        "report": ["npm", "run", "boardforge:report", "--", "--manifest", manifest],
        "replay": ["npm", "run", "boardforge:replay", "--", "--manifest", manifest],
        "approvals": ["npm", "run", "boardforge:approvals", "--", "--project", project_dir, "--manifest", manifest],
        "intake": ["npm", "run", "boardforge:intake", "--", "--prompt", "Make a compact robotics controller with CAN and USB-C.", "--output", project_dir],
        "answer": ["npm", "run", "boardforge:answer", "--", "--session", os.path.join(project_dir, "BoardForge_Intake_Session.json")],
        "brief": ["npm", "run", "boardforge:brief", "--", "--prompt", "Make a compact robotics controller with CAN and USB-C.", "--output", project_dir],
        "approve_brief": ["npm", "run", "boardforge:approve-brief", "--", "--project", project_dir, "--manifest", manifest],
        "reject_brief": ["npm", "run", "boardforge:reject-brief", "--", "--project", project_dir, "--manifest", manifest],
        "request_revision": ["npm", "run", "boardforge:request-revision", "--", "--project", project_dir, "--manifest", manifest],
        "publish": ["npm", "run", "boardforge:publish", "--", "--project", project_dir, "--manifest", manifest, "--confirm"],
        "keep_local": ["npm", "run", "boardforge:keep-local", "--", "--project", project_dir, "--manifest", manifest],
        "archive": ["npm", "run", "boardforge:archive", "--", "--project", project_dir, "--manifest", manifest],
        "sync": ["npm", "run", "boardforge:sync", "--", "--project", project_dir, "--manifest", manifest],
        "odd_shape_web_proof": ["npm", "run", "boardforge:odd-shape-web-proof", "--", "--project", project_dir],
    }


def manifest_path_for(board_path):
    return os.path.join(os.path.dirname(str(board_path)), "BoardForge_Project_Manifest.json")


def sandbox_path_for(project_dir):
    name = os.path.basename(os.path.abspath(str(project_dir)))
    return os.path.join("C:\\Users\\luifi\\Desktop\\BoardForge_Sandboxes", name + "_import_sandbox")


def latest_report_path_for(board_path):
    return os.path.join(os.path.dirname(str(board_path)), "BoardForge_User_Facing_Report.md")


def manufacturing_folder_for(board_path):
    return os.path.join(os.path.dirname(str(board_path)), "manufacturing")


def is_boardforge_sandbox(path):
    text = str(path).lower().replace("/", "\\")
    return "\\boardforge_sandboxes\\" in text or "\\boardforge_new_board_fixtures\\" in text


def format_command(command):
    return " ".join(command)


def legacy_route_finish_command(board_path):
    return [
        "npm",
        "run",
        "boardforge:route-finish",
        "--",
        "--board",
        str(board_path),
    ]


if pcbnew:
    class BoardForgeActionPlugin(pcbnew.ActionPlugin):
        def defaults(self):
            self.name = "BoardForge Route/Validate"
            self.category = "BoardForge"
            self.description = "Run guarded BoardForge routing, validation, and manufacturing readiness checks."

        def Run(self):
            board = pcbnew.GetBoard()
            board_path = board.GetFileName()
            if is_protected_path(board_path):
                pcbnew.wxLogMessage("BoardForge refused protected project path. Use an approved synthetic or copied workspace.")
                return
            commands = build_boardforge_commands(board_path)
            project_dir = os.path.dirname(board_path)
            manifest = manifest_path_for(board_path)
            report_path = latest_report_path_for(board_path)
            manufacturing_path = manufacturing_folder_for(board_path)
            sandbox = is_boardforge_sandbox(board_path)
            pcbnew.wxLogMessage("BoardForge local control panel")
            pcbnew.wxLogMessage("Sandbox status: " + ("active sandbox/fixture" if sandbox else "not sandboxed; mutation actions disabled"))
            pcbnew.wxLogMessage("License status: " + format_command(commands["license"]))
            pcbnew.wxLogMessage("Manifest: " + manifest)
            pcbnew.wxLogMessage("Latest report: " + report_path)
            pcbnew.wxLogMessage("Manufacturing folder: " + manufacturing_path)
            pcbnew.wxLogMessage("Import sandbox: " + format_command(commands["import_sandbox"]))
            pcbnew.wxLogMessage("Validate: " + format_command(commands["validate"]))
            if sandbox:
                pcbnew.wxLogMessage("Route sandbox: " + format_command(commands["route"]))
                pcbnew.wxLogMessage("Repair sandbox: " + format_command(commands["repair"]))
                pcbnew.wxLogMessage("Cleanup sandbox: " + format_command(commands["cleanup"]))
                pcbnew.wxLogMessage("Export sandbox: " + format_command(commands["export"]))
            else:
                pcbnew.wxLogMessage("Route/Repair/Cleanup/Export disabled on active project. Import into BoardForge sandbox first.")
            pcbnew.wxLogMessage("Approval report: " + format_command(commands["approvals"]))
            pcbnew.wxLogMessage("Prompt intake session: " + format_command(commands["intake"]))
            pcbnew.wxLogMessage("Answer intake session: " + format_command(commands["answer"]))
            pcbnew.wxLogMessage("Board brief: " + format_command(commands["brief"]))
            pcbnew.wxLogMessage("Approve brief: " + format_command(commands["approve_brief"]))
            pcbnew.wxLogMessage("Reject brief: " + format_command(commands["reject_brief"]))
            pcbnew.wxLogMessage("Request revision: " + format_command(commands["request_revision"]))
            pcbnew.wxLogMessage("Open brief report: " + os.path.join(project_dir, "BoardForge_Board_Brief.md"))
            pcbnew.wxLogMessage("Build gate: blocked until board brief approval unless explicit dev/test bypass is used.")
            pcbnew.wxLogMessage("Publish gate: local candidate stays dashboard hidden until publish approval and confirmation.")
            pcbnew.wxLogMessage("Publish approved project: " + format_command(commands["publish"]))
            pcbnew.wxLogMessage("Keep local only: " + format_command(commands["keep_local"]))
            pcbnew.wxLogMessage("Archive draft: " + format_command(commands["archive"]))
            pcbnew.wxLogMessage("Sync status: local artifact sync only; publish requires explicit CLI/plugin confirmation.")
            pcbnew.wxLogMessage("Dashboard/project page: local web dashboard reads BoardForge manifest and preview artifacts.")
            pcbnew.wxLogMessage("Generated odd-shape project status: " + format_command(commands["odd_shape_web_proof"]))
            pcbnew.wxLogMessage("Report: " + format_command(commands["report"]))
            pcbnew.wxLogMessage("Replay: " + format_command(commands["replay"]))
            if os.path.exists(manifest):
                pcbnew.wxLogMessage("BoardForge manifest found. Status, DRC/ERC, unconnected, and manufacturing readiness are read from local artifacts.")
            else:
                pcbnew.wxLogMessage("No BoardForge manifest found beside this board yet.")


    BoardForgeActionPlugin().register()
