let dropzone;
let fileInput;
let previewList;
let themeToggle;
let filesData = [];
let draggedIndex = null;

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
  }

  if (fileInput) fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
});

function toggleTheme() {
  document.body.classList.toggle("dark");
  updateThemeButton();

}

function updateThemeButton() {
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "☀️ Mode clair" : "🌙 Mode sombre";
}


function handleFiles(fileList) {
  console.log('handleFiles called with', fileList.length, 'files');
  for (const file of fileList) filesData.push({ file, rotation: 0, displayName: file.name });
  renderList();
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
      generatePDF(true);
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
      generatePDF(true);
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
  } catch (err) {
    console.error('generatePDF error', err);
    alert('Erreur lors de la génération du PDF: ' + (err && err.message ? err.message : err));
  }
}

window.toggleTheme = toggleTheme;
window.clearAll = clearAll;
window.generatePDF = generatePDF;

