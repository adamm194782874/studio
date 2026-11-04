#!/bin/sh
# Start Homebase on a Mac (or Linux). The first run takes a few minutes to set up.
cd "$(dirname "$0")"
if [ ! -f settings.env ]; then
  echo "settings.env is missing. Copy example.env to settings.env and fill it in first."
  exit 1
fi
if [ ! -x .venv/bin/python ]; then
  echo "Setting up Homebase for the first time..."
  python3 -m venv .venv || { echo "Install Python 3.12 from python.org first."; exit 1; }
fi
.venv/bin/python -m pip install -q --disable-pip-version-check -r requirements.txt
exec .venv/bin/python run.py
