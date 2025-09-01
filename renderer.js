let dropzone;
let fileInput;
let previewList;
let themeToggle;
let filesData = [];
let draggedIndex = null;
let previewTimeout = null;
const DEBOUNCE_MS = 300;

document.addEventListener("DOMContentLoaded", () => {
  // cache DOM elements after load
  dropzone = document.getElementById("dropzone");
  fileInput = document.getElementById("upload");
  previewList = document.getElementById("previewList");
  themeToggle = document.getElementById("themeToggle");

  updateThemeButton();

  // attach listeners
  if (dropzone) {
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
    // click on dropzone should forward to hidden input
    dropzone.addEventListener("click", () => fileInput && fileInput.click());
    // keyboard support: Enter or Space opens the file picker
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        fileInput && fileInput.click();
      }
    });
  }

  if (fileInput) fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
});

// --- i18n support ---
const translations = {
  fr: {
    fitA4: 'A4 auto',
    modeToggle: '🌙 Mode sombre',
    dropzoneText: 'Glisser-déposer ou cliquer pour sélectionner vos fichiers',
    previewBtn: '🔎 Visualiser',
  generateBtn: '📄 Générer le PDF',
  filenamePlaceholder: 'Nom du fichier (ex: fusion.pdf)',
  clearAllBtn: '🗑️ Tout effacer',
  spinnerText: 'Génération en cours…'
  },
  en: {
    fitA4: 'Auto A4',
    modeToggle: '🌙 Dark mode',
    dropzoneText: 'Drag & drop or click to select files',
    previewBtn: '🔎 Preview',
  generateBtn: '📄 Generate PDF',
  filenamePlaceholder: 'File name (e.g. merged.pdf)',
  clearAllBtn: '🗑️ Clear all',
  spinnerText: 'Generating...'
  }
};

function setLanguage(lang) {
  const active = translations[lang] ? lang : 'fr';
  localStorage.setItem('fx_lang', active);
  // translate elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[active][key]) el.textContent = translations[active][key];
  });
  // placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[active][key]) el.placeholder = translations[active][key];
  });
  // update language selector value if present
  const sel = document.getElementById('languageSelect');
  if (sel) sel.value = active;
}

// initialize language from preference or default to fr
document.addEventListener('DOMContentLoaded', () => {
  const pref = localStorage.getItem('fx_lang') || 'fr';
  setLanguage(pref);
  const btnFr = document.getElementById('langFr');
  const btnEn = document.getElementById('langEn');
  function updateLangButtons(active) {
    if (btnFr) btnFr.classList.toggle('active', active === 'fr');
    if (btnEn) btnEn.classList.toggle('active', active === 'en');
  }
  updateLangButtons(pref);
  if (btnFr) btnFr.addEventListener('click', () => { setLanguage('fr'); updateLangButtons('fr'); });
  if (btnEn) btnEn.addEventListener('click', () => { setLanguage('en'); updateLangButtons('en'); });
});

function setSpinner(visible) {
  const spinner = document.getElementById('spinner');
  const btns = document.querySelectorAll('.btn');
  if (spinner) spinner.style.display = visible ? 'block' : 'none';
  btns.forEach(b => b.disabled = visible);
  const status = document.getElementById('statusArea');
  // localized spinner text
  const lang = localStorage.getItem('fx_lang') || 'fr';
  const text = visible ? (translations[lang] && translations[lang].spinnerText ? translations[lang].spinnerText : 'Generating...') : '';
  if (status) status.textContent = text;
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  updateThemeButton();

}

function updateThemeButton() {
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "☀️ Mode clair" : "🌙 Mode sombre";
}


function handleFiles(fileList) {
  // normalize possible DataTransfer or FileList
  const list = fileList && fileList.files ? fileList.files : fileList;
  if (!list || list.length === 0) {
    console.log('handleFiles: no files to handle');
    return;
  }
  console.log('handleFiles called with', list.length, 'files');
  for (const file of list) filesData.push({ file, rotation: 0, displayName: file.name });
  renderList();
  // reset hidden input so selecting the same file again triggers change
  if (fileInput) try { fileInput.value = ''; } catch (e) { /* ignore */ }
}

function renderList() {
  console.log('renderList called, filesData length:', filesData.length);
  previewList.innerHTML = "";
  filesData.forEach((entry, index) => {
    const div = document.createElement("div");
    div.className = "item";
    div.setAttribute("draggable", true);
    div.dataset.index = index;
    div.addEventListener("dragstart", () => draggedIndex = index);
    div.addEventListener("dragover", e => e.preventDefault());
    div.addEventListener("drop", () => {
      const item = filesData.splice(draggedIndex, 1)[0];
      filesData.splice(index, 0, item);
      renderList();
      // debounce preview generation
      clearTimeout(previewTimeout);
      previewTimeout = setTimeout(() => generatePDF(true), DEBOUNCE_MS);
    });

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if (entry.file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(entry.file);
      img.onload = () => URL.revokeObjectURL(img.src);
      thumb.appendChild(img);
    } else thumb.textContent = "📄";

  const name = document.createElement("input");
  name.className = "filename";
  name.value = entry.displayName || entry.file.name;
  name.addEventListener("change", () => entry.displayName = name.value);

    const rotateBtn = document.createElement("button");
    rotateBtn.className = "rotate-btn";
    rotateBtn.innerHTML = `🔄 <span class="angle">${entry.rotation}°</span>`;
    rotateBtn.onclick = () => {
      entry.rotation = (entry.rotation + 90) % 360;
      renderList();
      clearTimeout(previewTimeout);
      previewTimeout = setTimeout(() => generatePDF(true), DEBOUNCE_MS);
    };

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "❌";
    delBtn.onclick = () => {
      filesData.splice(index, 1);
      renderList();
      document.getElementById("previewFrame").style.display = "none";
    };

    div.append(thumb, name, rotateBtn, delBtn);
    previewList.appendChild(div);
  });
}

function clearAll() {
  filesData = [];
  renderList();
  document.getElementById("previewFrame").style.display = "none";

}

async function generatePDF(isPreview) {
  console.log('generatePDF called, isPreview=', isPreview);
  try {
    if (filesData.length === 0) return alert("Ajoutez des fichiers");
    if (typeof PDFLib === 'undefined') throw new Error('PDFLib is not loaded');
  setSpinner(true);
    const { PDFDocument, degrees } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const fitToA4 = document.getElementById("fitA4").checked;

  for (const entry of filesData) {
    const file = entry.file;
    const buffer = await file.arrayBuffer();
    if (file.type === "application/pdf") {
      const pdf = await PDFDocument.load(buffer);
      // compute indices safely for different pdf-lib versions
      let indices;
      if (typeof pdf.getPageIndices === 'function') indices = pdf.getPageIndices();
      else if (typeof pdf.getPageCount === 'function') indices = Array.from({ length: pdf.getPageCount() }, (_, i) => i);
      else indices = [];
      const pages = await pdfDoc.copyPages(pdf, indices);
      pages.forEach(p => {
        if (entry.rotation % 360 !== 0) p.setRotation(degrees(entry.rotation));
        pdfDoc.addPage(p);
      });
    } else if (file.type && file.type.startsWith("image/")) {
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

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  if (isPreview) {
    const url = URL.createObjectURL(blob);
    const frame = document.getElementById("previewFrame");
    frame.style.display = "block";
    frame.src = url;
    frame.onload = () => URL.revokeObjectURL(url);
  } else {
    const name = document.getElementById("filename").value.trim() || "FusionX.pdf";
    const a = document.createElement("a");
    const downloadUrl = URL.createObjectURL(blob);
    a.href = downloadUrl;
    a.download = name.endsWith(".pdf") ? name : name + ".pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
  }
    setSpinner(false);
  } catch (err) {
    console.error('generatePDF error', err);
    alert('Erreur lors de la génération du PDF: ' + (err && err.message ? err.message : err));
    setSpinner(false);
  }
}

window.toggleTheme = toggleTheme;
window.clearAll = clearAll;
window.generatePDF = generatePDF;

