#!/bin/bash

echo "Packaging Bookmarks Validator for Chrome Web Store..."

# Remove old zip if it exists
rm -f bookmark-validator.zip

# Create a new zip file excluding unnecessary files
zip -r bookmark-validator.zip . \
    -x "*.git*" \
    -x "*screenshots*" \
    -x "README.md" \
    -x "package.sh"

echo "Done! The extension has been packaged into 'bookmark-validator.zip'."
echo "You can upload this file to the Chrome Developer Dashboard."
