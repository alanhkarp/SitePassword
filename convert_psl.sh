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
# Initialize variables
line=""
line_length=0
max_length=100

# Open the file and process it line by line
while read -r suffix; do
    # Skip comments and empty lines
    if [[ "$suffix" =~ ^// ]] || [[ -z "$suffix" ]]; then
        continue
    fi

    # Prepare the suffix entry
    entry="\"$suffix\", "
    entry_length=${#entry}

    # Check if adding the entry would exceed the max length
    if (( line_length + entry_length > max_length )); then
        # Write the current line to the output file
        echo "    ${line%, }," >> $OUTPUT_FILE
        # Reset the line and line length
        line="$entry"
        line_length=$entry_length
    else
        # Append the entry to the current line
        line+="$entry"
        line_length=$((line_length + entry_length))
    fi
done < public_suffix_list.dat

# Write any remaining entries to the output file
if [ -n "$line" ]; then
    echo "    ${line%, }" >> $OUTPUT_FILE
fi
echo "]);" >> $OUTPUT_FILE

# Clean up
rm public_suffix_list.dat

echo "Public suffix list has been converted to $OUTPUT_FILE"
