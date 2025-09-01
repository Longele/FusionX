#!/bin/bash

mkdir -p dist && zip -r dist/FusionX.zip index.html style.css renderer.js fonts README.md node_modules/pdf-lib/dist/pdf-lib.min.js
