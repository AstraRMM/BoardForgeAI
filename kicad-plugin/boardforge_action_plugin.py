try:
    import pcbnew
except ImportError:
    pcbnew = None


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
            pcbnew.wxLogMessage("BoardForge command: " + " ".join(build_boardforge_command(board_path)))


    BoardForgeActionPlugin().register()
