#!/bin/sh
# Gera tailwind.css (minificado). Precisa de: npm install  (tailwindcss em devDependencies)
npx tailwindcss -c tailwind.config.js -i tailwind.input.css -o tailwind.css --minify
