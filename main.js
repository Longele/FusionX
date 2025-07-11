const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("upload");
const previewList = document.getElementById("previewList");
const themeToggle = document.getElementById("themeToggle");
const languageSelect = document.getElementById("languageSelect");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
let filesData = [];
let draggedIndex = null;
let currentLanguage = 'fr';

// Language handling
function detectLanguage() {
  const browserLang = navigator.language.split('-')[0];
  return translations.hasOwnProperty(browserLang) ? browserLang : 'en';
}

function updateLanguage(lang) {
  currentLanguage = lang;
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    if (element.tagName === 'INPUT' && element.type === 'text') {
      element.placeholder = translations[lang][key];
    } else {
      element.textContent = translations[lang][key];
    }
  });
  updateThemeButton();
}

languageSelect.value = detectLanguage();
updateLanguage(languageSelect.value);

languageSelect.addEventListener('change', (e) => {
  updateLanguage(e.target.value);
});

// Progress bar handling
function showProgress() {
  progressContainer.style.display = 'flex';
  progressBar.style.width = '0%';
}

function updateProgress(percent) {
  progressBar.style.width = `${percent}%`;
}

function hideProgress() {
  progressContainer.style.display = 'none';
}

// Theme handling
document.addEventListener("DOMContentLoaded", () => updateThemeButton());

function toggleTheme() {
  document.body.classList.toggle("dark");
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.body.classList.contains("dark");
  const key = isDark ? "lightMode" : "darkMode";
  themeToggle.textContent = translations[currentLanguage][key];
}

// File handling
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

function handleFiles(fileList) {
  for (const file of fileList) filesData.push({ file, rotation: 0 });
  renderList();
}

// Rest of your existing functions...
// ...existing code for renderList()...

async function generatePDF(isPreview) {
  if (filesData.length === 0) return alert(translations[currentLanguage].addFiles);
  
  showProgress();
  const { PDFDocument, degrees } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const fitToA4 = document.getElementById("fitA4").checked;

  for (let i = 0; i < filesData.length; i++) {
    const entry = filesData[i];
    const progress = (i / filesData.length) * 100;
    updateProgress(progress);

    const file = entry.file;
    const buffer = await file.arrayBuffer();
    if (file.type === "application/pdf") {
      const pdf = await PDFDocument.load(buffer);
      const pages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => {
        if (entry.rotation % 360 !== 0) p.setRotation(degrees(entry.rotation));
        pdfDoc.addPage(p);
      });
    } else if (file.type.startsWith("image/")) {
      const embed = file.type.includes("png") ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer);
      const dims = fitToA4 ? [595.28, 841.89] : [embed.width, embed.height];
      const page = pdfDoc.addPage(dims);
      const scale = fitToA4 ? Math.min(dims[0] / embed.width, dims[1] / embed.height) : 1;
      const x = (dims[0] - embed.width * scale) / 2;
      const y = (dims[1] - embed.height * scale) / 2;
      page.drawImage(embed, {
        x,
        y,
        width: embed.width * scale,
        height: embed.height * scale,
        rotate: degrees(entry.rotation)
      });
    }
  }

  updateProgress(100);
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  
  if (isPreview) {
    const url = URL.createObjectURL(blob);
    const frame = document.getElementById("previewFrame");
    frame.style.display = "block";
    frame.src = url;
    // Clean up the URL object after the iframe loads
    frame.onload = () => URL.revokeObjectURL(url);
  } else {
    const name = document.getElementById("filename").value.trim() || "FusionX.pdf";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name.endsWith(".pdf") ? name : name + ".pdf";
    a.click();
    // Clean up the URL object after a short delay
    setTimeout(() => URL.revokeObjectURL(a.href), 100);
  }
  
  hideProgress();
}
