# FusionX

FusionX is a lightweight web application for merging PDFs and images directly in your browser. Simply drag and drop your files, reorder or rotate them, and generate a single PDF in seconds.

## Features

- Combine PDF files and images
- Reorder pages via drag and drop
- Rotate pages in 90° increments
- Rename files before merging
- Optional A4 auto‑fit for images
- Dark/Light theme toggle
- Works completely offline (no server involved)

## Getting Started

1. Clone or download this repository.
2. Open `index.html` in any modern browser.
3. Drag your files into the drop area, arrange them, then preview or download the final PDF.

All processing happens locally in your browser using [pdf-lib](https://pdf-lib.js.org/), so your files never leave your machine.

## Packaging

Run the provided script to create a distributable zip archive:

```bash
./package.sh
```

## License

This project is released under the [ISC License](LICENSE).

