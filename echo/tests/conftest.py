# Makes `import quantum.<module>` resolve the way Qollab's dotted imports do: `echo/` is the project root.
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
