#!/bin/bash
# Convert the public suffix list to a JavaScript Set

# Created by Copilot

# URL of the public suffix list
PSL_URL="https://publicsuffix.org/list/public_suffix_list.dat"

# Output JavaScript file
OUTPUT_FILE="public_suffix_list.js"

# Download the public suffix list
curl -o public_suffix_list.dat $PSL_URL

# Process the list and convert it to a JavaScript Set
echo "const publicSuffixSet = new Set([" > $OUTPUT_FILE
grep -v '^//' public_suffix_list.dat | grep -v '^$' | awk '{print "\""$0"\","}' >> $OUTPUT_FILE
echo "]);" >> $OUTPUT_FILE

# Clean up
rm public_suffix_list.dat

echo "Public suffix list has been converted to $OUTPUT_FILE"
