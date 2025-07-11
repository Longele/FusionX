const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("upload");
const previewList = document.getElementById("previewList");
const themeToggle = document.getElementById("themeToggle");
let filesData = [];
let draggedIndex = null;

document.addEventListener("DOMContentLoaded", () => updateThemeButton());

function toggleTheme() {
  document.body.classList.toggle("dark");
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "☀️ Mode clair" : "🌙 Mode sombre";
}

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

function renderList() {
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
    name.value = entry.file.name;
    name.addEventListener("change", () => entry.file.name = name.value);

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
  if (filesData.length === 0) return alert("Ajoutez des fichiers");
  const { PDFDocument, degrees } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const fitToA4 = document.getElementById("fitA4").checked;

  for (const entry of filesData) {
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
    URL.revokeObjectURL(downloadUrl);
  }
}
