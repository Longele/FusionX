#!/bin/bash

mkdir -p dist && zip -r dist/FusionX.zip electron.js index.html style.css renderer.js fonts README.md
