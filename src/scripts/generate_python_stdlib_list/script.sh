#!/bin/bash
# script.sh
# This script dynamically retrieves the list of major Python versions from Docker Hub,
# handling pagination, and uses a single Docker container (python:latest) to generate the
# standard library module lists for each version using the stdlib-list package.
# The output is written to a single JSON file where each key is a Python version.

# Ensure required tools are available
command -v curl >/dev/null 2>&1 || { echo >&2 "curl is required but it's not installed. Aborting."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo >&2 "jq is required but it's not installed. Aborting."; exit 1; }

# Initial API URL with max page_size
API_URL="https://registry.hub.docker.com/v2/repositories/library/python/tags/?page_size=100"
echo "Querying Docker Hub for Python image tags..."

all_tags=""
# Loop over pages until there is no next URL.
while [ -n "$API_URL" ]; do
    echo "Fetching tags from: $API_URL"
    response=$(curl -s "$API_URL")
    # Append tags from this page.
    page_tags=$(echo "$response" | jq -r '.results[].name')
    all_tags+="$page_tags"$'\n'
    # Get next URL.
    API_URL=$(echo "$response" | jq -r '.next')
    if [ "$API_URL" == "null" ]; then
        API_URL=""
    fi
done

# Filter out tags that match the major version pattern (e.g., 3.8, 3.9)
versions=$(echo "$all_tags" | grep -E '^[0-9]+\.[0-9]+$' | sort -V | uniq)

if [ -z "$versions" ]; then
    echo "No major Python versions found. Exiting."
    exit 1
fi

echo "Found Python versions:"
echo "$versions"

# Convert the list to a space-separated string for environment passing.
versions_list=$(echo "$versions" | tr '\n' ' ')
echo "Using versions: $versions_list"

# Use a single Docker container (python:latest) to generate the stdlib lists.
# Pass the versions list to the container via the PYTHON_VERSIONS environment variable.
docker run --rm -e PYTHON_VERSIONS="$versions_list" -v "$(dirname "$0")/output.json":/output.json python:latest bash -c '
pip install stdlib-list > /dev/null 2>&1 && python - << "EOF"
import json
import os
from stdlib_list import stdlib_list

# Retrieve the space-separated versions from the environment variable.
versions = os.environ.get("PYTHON_VERSIONS", "").split()
if not versions:
    print("No Python versions provided.")
    exit(1)

result = {}
for v in versions:
    try:
        modules = stdlib_list(v)
    except Exception as e:
        modules = {"error": str(e)}
    result[v] = modules

# Write the result to a JSON file.
with open("output.json", "w") as f:
    json.dump(result, f, indent=2)
EOF
'

echo "Standard library list generated in the 'output.json' file."
