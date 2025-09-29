#!/bin/sh
# Minimal Husky bootstrap stub; keeps generated Git hooks functional even without node_modules.
if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1
  export husky_skip_init
fi
