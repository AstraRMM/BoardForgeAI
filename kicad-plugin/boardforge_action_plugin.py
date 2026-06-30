try:
    import pcbnew
except ImportError:
    pcbnew = None

import os


PROTECTED_MARKERS = (
    "FN-ESC1",
    "FN-ESC",
    "FN-FC",
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
    manifest = manifest_path_for(board_path)
    return {
        "validate": ["npm", "run", "boardforge:validate", "--", "--project", board_path],
        "route": ["npm", "run", "boardforge:route", "--", "--project", board_path],
        "cleanup": ["npm", "run", "boardforge:cleanup", "--", "--project", board_path],
        "export": ["npm", "run", "boardforge:export", "--", "--project", board_path],
        "report": ["npm", "run", "boardforge:report", "--", "--manifest", manifest],
        "replay": ["npm", "run", "boardforge:replay", "--", "--manifest", manifest],
    }


def manifest_path_for(board_path):
    return os.path.join(os.path.dirname(str(board_path)), "BoardForge_Project_Manifest.json")


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
            pcbnew.wxLogMessage("Validate: " + format_command(commands["validate"]))
            pcbnew.wxLogMessage("Route: " + format_command(commands["route"]))
            pcbnew.wxLogMessage("Cleanup: " + format_command(commands["cleanup"]))
            pcbnew.wxLogMessage("Export: " + format_command(commands["export"]))
            pcbnew.wxLogMessage("Report: " + format_command(commands["report"]))
            pcbnew.wxLogMessage("Replay: " + format_command(commands["replay"]))
            if os.path.exists(manifest):
                pcbnew.wxLogMessage("BoardForge manifest found. Open reports/downloads from the manifest paths.")
            else:
                pcbnew.wxLogMessage("No BoardForge manifest found beside this board yet.")


    BoardForgeActionPlugin().register()
