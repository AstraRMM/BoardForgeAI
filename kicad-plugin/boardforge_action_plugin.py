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
        "validate": ["npm", "run", "boardforge:validate", "--", "--project", board_path],
        "route": ["npm", "run", "boardforge:route", "--", "--project", board_path],
        "cleanup": ["npm", "run", "boardforge:cleanup", "--", "--project", board_path],
        "export": ["npm", "run", "boardforge:export", "--", "--project", board_path],
        "report": ["npm", "run", "boardforge:report", "--", "--manifest", manifest],
        "replay": ["npm", "run", "boardforge:replay", "--", "--manifest", manifest],
    }


def manifest_path_for(board_path):
    return os.path.join(os.path.dirname(str(board_path)), "BoardForge_Project_Manifest.json")


def sandbox_path_for(project_dir):
    name = os.path.basename(os.path.abspath(str(project_dir)))
    return os.path.join("C:\\Users\\luifi\\Desktop\\BoardForge_Sandboxes", name + "_import_sandbox")


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
            manifest = manifest_path_for(board_path)
            pcbnew.wxLogMessage("BoardForge local control panel")
            pcbnew.wxLogMessage("Manifest: " + manifest)
            pcbnew.wxLogMessage("Import sandbox: " + format_command(commands["import_sandbox"]))
            pcbnew.wxLogMessage("Validate: " + format_command(commands["validate"]))
            if is_boardforge_sandbox(board_path):
                pcbnew.wxLogMessage("Route sandbox: " + format_command(commands["route"]))
                pcbnew.wxLogMessage("Cleanup sandbox: " + format_command(commands["cleanup"]))
            else:
                pcbnew.wxLogMessage("Route/Cleanup disabled on active project. Import into BoardForge sandbox first.")
            pcbnew.wxLogMessage("Export: " + format_command(commands["export"]))
            pcbnew.wxLogMessage("Report: " + format_command(commands["report"]))
            pcbnew.wxLogMessage("Replay: " + format_command(commands["replay"]))
            if os.path.exists(manifest):
                pcbnew.wxLogMessage("BoardForge manifest found. Open reports/downloads from the manifest paths.")
            else:
                pcbnew.wxLogMessage("No BoardForge manifest found beside this board yet.")


    BoardForgeActionPlugin().register()
