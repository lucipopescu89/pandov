"""Write public/pandov-grain.js: the template with the traced lines in it.

usage: python3 scripts/grain-lines/assemble.py <lines.json> public/pandov-grain.js
"""
import sys, os
here = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(here, "pandov-grain.template.js")).read()
open(sys.argv[2], "w").write(t.replace("__PATHS__", open(sys.argv[1]).read()))
