#!/bin/sh
# Gera tailwind.css (minificado). Precisa de: npm install  (tailwindcss em devDependencies)
npx tailwindcss -c tailwind.config.cjs -i tailwind.input.css -o tailwind.css --minify
