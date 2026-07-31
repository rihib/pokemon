#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "${script_dir}/patch-battle-pokemon-search.mjs"
node "${script_dir}/patch-battle-scoring-speed.mjs"
node "${script_dir}/patch-matchup-navigator.mjs"
node "${script_dir}/patch-move-damage-advisor.mjs"
node "${script_dir}/patch-smogon-damage-calc.mjs"
node "${script_dir}/patch-google-auth-links.mjs"
