import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, FileUp, Loader, Upload } from "lucide-react";
import { getContract, issueCertificatesBatch } from "../../utils/contract";
import { generateFileHash, uploadToIPFS } from "../../utils/ipfs";
import { getInstituteStudents } from "../../utils/studentRegistryApi";

const DEPARTMENT_OPTIONS = ["CSE", "AIML", "ECE", "EEE", "MECH", "CIVIL", "ISE", "OTHER"];
const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F", "NA"];
const SEMESTER_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "NA"];

const OCR_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/jpg"];

const OFFICE_EXTENSIONS = {
  docx: [".docx"],
  pptx: [".pptx"],
  xlsx: [".xlsx"],
  text: [".txt", ".csv"]
};

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"];

const fileExt = (file) => {
  const name = String(file?.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
};

const isImageFile = (file) =>
  OCR_IMAGE_TYPES.includes(file?.type) ||
  IMAGE_EXTENSIONS.includes(fileExt(file));

const isPdfFile = (file) =>
  file?.type === "application/pdf" || fileExt(file) === ".pdf";

const isDocxFile = (file) =>
  fileExt(file) === ".docx" ||
  file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const isPptxFile = (file) =>
  fileExt(file) === ".pptx" ||
  file?.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const isXlsxFile = (file) =>
  fileExt(file) === ".xlsx" ||
  file?.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const isTextFile = (file) =>
  fileExt(file) === ".txt" || fileExt(file) === ".csv" || file?.type?.startsWith("text/");

const decodeXmlText = (xml) =>
  String(xml || "")
    .replace(/<w:tab\/?>/gi, " ")
    .replace(/<a:br\/?>/gi, "\n")
    .replace(/<br\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const blobFromZipEntry = async (entry) => {
  const bytes = await entry.async("uint8array");
  const ext = String(entry.name || "").split(".").pop().toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    ext === "bmp" ? "image/bmp" :
    "application/octet-stream";
  return new Blob([bytes], { type: mime });
};

const uniqueTextParts = (parts) =>
  [...new Set(
    parts
      .map((x) => String(x || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
  )].join("\n");


const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactName = (value) => normalizeName(value).replace(/\s/g, "");

const namesExactlyMatch = (a, b) => {
  const left = normalizeName(a);
  const right = normalizeName(b);
  return Boolean(left && right && left === right);
};

const looksLikeName = (value) => {
  const v = normalizeName(value);
  if (!v || v.length < 4 || v.length > 90) return false;
  const parts = v.split(" ");
  if (parts.length < 2 || parts.length > 8) return false;
  const blocked = new Set([
    "certificate", "completion", "course", "student", "name", "university",
    "college", "institute", "department", "technology", "engineering",
    "internship", "training", "participation", "achievement", "issued",
    "date", "duration", "grade", "marks", "skills", "this", "has", "been",
    "awarded", "successfully", "for", "the", "from", "to"
  ]);
  return parts.every((p) => /^[a-z]+$/.test(p) && !blocked.has(p));
};

const extractNameCandidates = (rawText) => {
  const text = String(rawText || "").replace(/\r/g, "\n");
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const candidates = [];
  const nameLabel =
    /(?:student\s*name|candidate\s*name|recipient(?:'s)?\s*name|participant\s*name|learner\s*name|name)\s*[:\-]\s*(.+)$/i;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const label = line.match(nameLabel);
    if (label && looksLikeName(label[1])) candidates.push(label[1]);

    if (
      /^(?:student\s*name|candidate\s*name|recipient(?:'s)?\s*name|participant\s*name|learner\s*name|name)\s*:?\s*$/i.test(line) &&
      lines[i + 1] &&
      looksLikeName(lines[i + 1])
    ) {
      candidates.push(lines[i + 1]);
    }

    // OCR often joins the label and value without punctuation.
    const joined = line.match(
      /^(?:student\s*name|candidate\s*name|recipient(?:'s)?\s*name|participant\s*name|learner\s*name)\s+(.+)$/i
    );
    if (joined && looksLikeName(joined[1])) candidates.push(joined[1]);
  }

  // A line-by-line exact comparison is safe: a registry name is accepted
  // only if OCR/text produced that same complete name candidate.
  for (const line of lines) {
    if (looksLikeName(line)) candidates.push(line);
  }

  return [...new Set(candidates.map(normalizeName).filter(Boolean))];
};


const getReadableFileType = (file) => {
  if (!file) return "unknown";
  if (isPdfFile(file)) return "PDF";
  if (isImageFile(file)) return "image";
  if (isDocxFile(file)) return "DOCX";
  if (isPptxFile(file)) return "PPTX";
  if (isXlsxFile(file)) return "XLSX";
  if (isTextFile(file)) return "text";
  return file.type || "file";
};


const BatchIssuePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [establishedYear, setEstablishedYear] = useState(null);
  const [department, setDepartment] = useState("ALL");
  const [section, setSection] = useState("ALL");
  const [semester, setSemester] = useState("ALL");
  const [batchYear, setBatchYear] = useState("ALL");
  const [files, setFiles] = useState([]);
  const [prepared, setPrepared] = useState([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    course: "",
    grade: "",
    credits: "",
    duration: "",
    skills: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        const contract = await getContract();
        const signer = await contract.signer.getAddress();
        const list = await getInstituteStudents(signer);
        setStudents(list);
        try {
          const details = await contract.getInstituteDetails(signer);
          const year = Number(details?.[0]?.toString?.() || 0);
          if (year >= 1900) setEstablishedYear(year);
        } catch {
          setEstablishedYear(null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const departments = useMemo(() => {
    const fromData = [...new Set(students.map((s) => s.department || "Unassigned"))];
    return ["ALL", ...new Set([...DEPARTMENT_OPTIONS, ...fromData])];
  }, [students]);
  const sections = useMemo(() => {
    const source = students.filter((s) => department === "ALL" || (s.department || "Unassigned") === department);
    const fromData = [...new Set(source.map((s) => s.section || "NA"))];
    return ["ALL", ...new Set([...SECTION_OPTIONS, ...fromData])];
  }, [students, department]);
  const semesters = useMemo(() => {
    const source = students.filter((s) => {
      const d = s.department || "Unassigned";
      const sec = s.section || "NA";
      return (department === "ALL" || d === department) && (section === "ALL" || sec === section);
    });
    const fromData = [...new Set(source.map((s) => s.semester || "NA"))];
    return ["ALL", ...new Set([...SEMESTER_OPTIONS, ...fromData])];
  }, [students, department, section]);
  const batchYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = establishedYear && establishedYear <= currentYear ? establishedYear : currentYear - 8;
    const rangeYears = [];
    for (let y = currentYear; y >= startYear; y -= 1) {
      rangeYears.push(String(y));
    }

    const source = students.filter((s) => {
      const d = s.department || "Unassigned";
      const sec = s.section || "NA";
      const sem = s.semester || "NA";
      return (
        (department === "ALL" || d === department) &&
        (section === "ALL" || sec === section) &&
        (semester === "ALL" || sem === semester)
      );
    });
    const fromData = source.map((s) => s.batchYear || "NA");
    return ["ALL", ...new Set([...rangeYears, ...fromData])];
  }, [students, department, section, semester, establishedYear]);

  const targetStudents = useMemo(
    () =>
      students.filter((s) => {
        const d = s.department || "Unassigned";
        const sec = s.section || "NA";
        const sem = s.semester || "NA";
        const batch = s.batchYear || "NA";
        return (
          (department === "ALL" || d === department) &&
          (section === "ALL" || sec === section) &&
          (semester === "ALL" || sem === semester) &&
          (batchYear === "ALL" || batch === batchYear)
        );
      }),
    [students, department, section, semester, batchYear]
  );

  const studentsWithoutBatchConstraint = useMemo(
    () =>
      students.filter((s) => {
        const d = s.department || "Unassigned";
        const sec = s.section || "NA";
        const sem = s.semester || "NA";
        return (
          (department === "ALL" || d === department) &&
          (section === "ALL" || sec === section) &&
          (semester === "ALL" || sem === semester)
        );
      }),
    [students, department, section, semester]
  );

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const normalizeCompact = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const hasWord = (text, token) => new RegExp(`\\b${escapeRegex(token)}\\b`, "i").test(text);

  const detectPdfHints = (normalizedText) => {
    const deptList = DEPARTMENT_OPTIONS.filter((d) => d !== "OTHER");
    const sectionList = SECTION_OPTIONS.filter((s) => s !== "NA");
    const semesterList = SEMESTER_OPTIONS.filter((s) => s !== "NA");
    const hints = {
      departments: deptList.filter((d) => hasWord(normalizedText, d.toLowerCase())),
      sections: sectionList.filter((s) => hasWord(normalizedText, s.toLowerCase())),
      semesters: semesterList.filter((s) => hasWord(normalizedText, s.toLowerCase())),
      hasBatchWord: hasWord(normalizedText, "batch"),
      hasUsnLabel: hasWord(normalizedText, "usn"),
      hasNameLabel: hasWord(normalizedText, "name")
    };
    return hints;
  };

  const getMatchScore = (parsedFile, student, isNameUnique) => {
    const idNorm = normalizeText(student.studentId);
    const idCompact = normalizeCompact(student.studentId);
    const nameNorm = normalizeName(student.name);

    const idRegex = idNorm
      ? new RegExp(`(?:^|\\s)${escapeRegex(idNorm)}(?:\\s|$)`, "i")
      : null;

    const hasExactIdToken =
      Boolean(idNorm && idRegex?.test(parsedFile.normalizedText)) ||
      Boolean(
        idCompact &&
        new RegExp(`(?:^|[^a-z0-9])${escapeRegex(idCompact)}(?:[^a-z0-9]|$)`, "i")
          .test(parsedFile.compactText)
      );

    // A labeled USN/ID is stronger than an incidental occurrence.
    const hasLabeledId =
      Boolean(
        idNorm &&
        new RegExp(
          `(?:usn|student\\s*id|studentid|registration\\s*(?:no|number)|enrollment\\s*(?:no|number)|id)\\s*[:#\\-]?\\s*${escapeRegex(idNorm)}(?:\\s|$)`,
          "i"
        ).test(parsedFile.normalizedText)
      );

    // Name matching is exact and token-boundary based. This accepts
    // "Bharat Bahadur Kadayat" when the registry has that exact name,
    // but it will NOT accept "Bharat Kadayat" as a substring of it.
    const exactNameRegex = nameNorm
      ? new RegExp(`(?:^|\\s)${escapeRegex(nameNorm)}(?:$|\\s)`, "i")
      : null;
    const exactNameMatch =
      Boolean(isNameUnique && nameNorm && exactNameRegex) &&
      exactNameRegex.test(parsedFile.normalizedText);

    if (hasLabeledId) return { score: 120, matchedBy: "usn-labeled" };
    if (hasExactIdToken) return { score: 100, matchedBy: "usn" };
    if (exactNameMatch) return { score: 80, matchedBy: "exact-name" };

    return { score: 0, matchedBy: "none" };
  };

  // Tesseract.js needs its worker/core/traineddata assets at runtime in a browser.
  // Give it explicit CDN paths so CRA/Webpack does not try to resolve those files
  // from the React bundle itself.
  const getTesseractWorker = async () => {
    const { createWorker } = await import("tesseract.js");
    return createWorker("eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      logger: (m) => {
        if (m?.status) console.debug(`[OCR] ${m.status}`, m.progress);
      },
      errorHandler: (err) => console.error("[OCR worker]", err)
    });
  };

  // Upscale/greyscale the image before OCR. This helps certificates that are
  // screenshots, scans, phone photos, or low-resolution images.
  const prepareImageForOcr = async (input) => {
    const blob = input instanceof Blob ? input : new Blob([input]);
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

      const maxWidth = 2600;
      const scale = Math.min(2.5, Math.max(1.5, maxWidth / Math.max(image.naturalWidth || image.width, 1)));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
      canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Mild grayscale/contrast enhancement. Do not hard-binarize because
      // coloured certificate text can otherwise disappear.
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i];
        const g = pixels.data[i + 1];
        const b = pixels.data[i + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const contrast = Math.max(0, Math.min(255, Math.round((gray - 128) * 1.15 + 128)));
        pixels.data[i] = contrast;
        pixels.data[i + 1] = contrast;
        pixels.data[i + 2] = contrast;
      }
      ctx.putImageData(pixels, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const ocrBlob = async (input, worker) => {
    // PDF.js gives us an HTMLCanvasElement. Never wrap a canvas in
    // new Blob([canvas]) — that produces a text blob, not an image.
    let source = input;
    if (typeof HTMLCanvasElement !== "undefined" && input instanceof HTMLCanvasElement) {
      source = await new Promise((resolve, reject) => {
        input.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not convert PDF page canvas to image"));
        }, "image/png", 1);
      });
    }

    const canvas = await prepareImageForOcr(source);
    const result = await worker.recognize(canvas, {
      rotateAuto: true
    });
    return result?.data?.text || "";
  };

  const loadPdfJs = async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
    if (pdfjs?.GlobalWorkerOptions) {
      // Use the matching PDF.js 3.11 worker. This avoids CRA's fake-worker
      // problem while keeping PDF parsing off the React bundle.
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    return pdfjs;
  };

  const extractPdfText = async (file) => {
    const pdfjs = await loadPdfJs();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages = [];

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str || "").join(" "));
    }

    return pages.join("\n");
  };

  const ocrPdf = async (file, worker) => {
    const pdfjs = await loadPdfJs();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages = [];

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.max(1.8, Math.min(3, 2400 / Math.max(baseViewport.width, 1)));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });

      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(await ocrBlob(canvas, worker));
      canvas.width = 1;
      canvas.height = 1;
    }

    return pages.join("\n");
  };

  const extractDocx = async (file, worker) => {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xmlEntries = [];
    const mediaEntries = [];

    Object.values(zip.files).forEach((entry) => {
      const name = entry.name.toLowerCase();
      if (
        !entry.dir &&
        /^word\/(document|header|footer|footnotes|endnotes).*\.xml$/i.test(name)
      ) {
        xmlEntries.push(entry);
      }
      if (!entry.dir && /^word\/media\//i.test(name)) mediaEntries.push(entry);
    });

    const xmlTexts = [];
    for (const entry of xmlEntries) {
      xmlTexts.push(decodeXmlText(await entry.async("text")));
    }

    const imageTexts = [];
    for (const entry of mediaEntries) {
      try {
        imageTexts.push(await ocrBlob(await blobFromZipEntry(entry), worker));
      } catch (e) {
        console.warn("[BATCH] DOCX image OCR failed:", entry.name, e);
      }
    }

    return {
      rawText: uniqueTextParts([...xmlTexts, ...imageTexts]),
      method: imageTexts.length
        ? "DOCX text + embedded-image OCR"
        : "DOCX text extraction"
    };
  };

  const extractPptx = async (file, worker) => {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xmlEntries = [];
    const mediaEntries = [];

    Object.values(zip.files).forEach((entry) => {
      const name = entry.name.toLowerCase();
      if (!entry.dir && /^ppt\/slides\/slide\d+\.xml$/i.test(name)) {
        xmlEntries.push(entry);
      }
      if (!entry.dir && /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(name)) {
        xmlEntries.push(entry);
      }
      if (!entry.dir && /^ppt\/media\//i.test(name)) mediaEntries.push(entry);
    });

    const xmlTexts = [];
    for (const entry of xmlEntries) {
      xmlTexts.push(decodeXmlText(await entry.async("text")));
    }

    const imageTexts = [];
    for (const entry of mediaEntries) {
      try {
        imageTexts.push(await ocrBlob(await blobFromZipEntry(entry), worker));
      } catch (e) {
        console.warn("[BATCH] PPTX image OCR failed:", entry.name, e);
      }
    }

    return {
      rawText: uniqueTextParts([...xmlTexts, ...imageTexts]),
      method: imageTexts.length
        ? "PPTX text + embedded-image OCR"
        : "PPTX text extraction"
    };
  };

  const extractXlsx = async (file, worker) => {
    const XLSX = await import("xlsx");
    const JSZip = (await import("jszip")).default;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: "array" });

    const sheetTexts = workbook.SheetNames.map((sheetName) =>
      XLSX.utils.sheet_to_txt(workbook.Sheets[sheetName])
    );

    const zip = await JSZip.loadAsync(bytes);
    const mediaEntries = Object.values(zip.files).filter(
      (entry) => !entry.dir && /^xl\/media\//i.test(entry.name)
    );

    const imageTexts = [];
    for (const entry of mediaEntries) {
      try {
        imageTexts.push(await ocrBlob(await blobFromZipEntry(entry), worker));
      } catch (e) {
        console.warn("[BATCH] XLSX image OCR failed:", entry.name, e);
      }
    }

    return {
      rawText: uniqueTextParts([...sheetTexts, ...imageTexts]),
      method: imageTexts.length
        ? "XLSX cell text + embedded-image OCR"
        : "XLSX cell text extraction"
    };
  };

  const extractCertificateText = async (file, options = {}) => {
    const { forceOcr = false, sharedWorker = null } = options;

    if (
      !isPdfFile(file) &&
      !isImageFile(file) &&
      !isDocxFile(file) &&
      !isPptxFile(file) &&
      !isXlsxFile(file) &&
      !isTextFile(file)
    ) {
      throw new Error(
        `Unsupported file type: ${file.name}. Use PDF, image, DOCX, PPTX, XLSX, TXT or CSV.`
      );
    }

    if (isTextFile(file)) {
      return { rawText: await file.text(), method: "text extraction" };
    }

    // Fast path: normal PDFs are parsed as text first. OCR is only used when
    // explicitly requested after the text path cannot safely match a student.
    if (isPdfFile(file) && !forceOcr) {
      const embeddedText = await extractPdfText(file);
      return {
        rawText: embeddedText,
        method: "PDF text extraction",
        textOnly: true
      };
    }

    const worker = sharedWorker || await getTesseractWorker();
    const ownWorker = !sharedWorker;

    try {
      if (isPdfFile(file)) {
        return {
          rawText: await ocrPdf(file, worker),
          method: "OCR scanned PDF",
          ocr: true
        };
      }

      if (isImageFile(file)) {
        return {
          rawText: await ocrBlob(file, worker),
          method: "OCR image",
          ocr: true
        };
      }

      if (isDocxFile(file)) return await extractDocx(file, worker);
      if (isPptxFile(file)) return await extractPptx(file, worker);
      if (isXlsxFile(file)) return await extractXlsx(file, worker);

      throw new Error(`Unsupported file type: ${file.name}`);
    } finally {
      if (ownWorker) await worker.terminate();
    }
  };

  const prepare = async () => {
    let sharedOcrWorker = null;
    try {
      setError("");
      setResult(null);
      setPrepared([]);
      if (!form.course) throw new Error("Course is required");
      if (!files.length) throw new Error("Upload certificate files first");
      if (!targetStudents.length) throw new Error("No students found for selected department/section");
      const idSet = new Set();
      const nameCount = {};
      for (const s of targetStudents) {
        const id = normalizeCompact(s.studentId);
        const nm = normalizeCompact(s.name);
        if (!id) throw new Error(`Missing studentId for ${s.name || s.walletAddress}`);
        if (idSet.has(id)) throw new Error(`Duplicate studentId in registry filter: ${s.studentId}`);
        idSet.add(id);
        if (nm) nameCount[nm] = (nameCount[nm] || 0) + 1;
      }

      const parsedFiles = [];
      for (const file of files) {
        let rawText = "";
        let method = "none";

        let extracted = null;
        try {
          extracted = await extractCertificateText(file);
          rawText = extracted.rawText || "";
          method = extracted.method;
        } catch (extractError) {
          console.warn("[BATCH] Fast extraction failed", file.name, extractError);
          rawText = "";
          method = `Extraction failed (${getReadableFileType(file)})`;
        }

        let normalized = normalizeText(rawText);
        let parsed = {
          file,
          rawText,
          normalizedText: normalized,
          compactText: normalizeCompact(rawText),
          nameCandidates: extractNameCandidates(rawText),
          hints: detectPdfHints(normalized),
          method,
          used: false
        };

        // Fast PDF path: only OCR when the embedded text cannot match any
        // currently selected student. This avoids expensive OCR for ordinary PDFs.
        if (isPdfFile(file)) {
          const canMatchFromText = targetStudents.some((student) => {
            const unique =
              targetStudents.filter(
                (x) => normalizeCompact(x.name) === normalizeCompact(student.name)
              ).length === 1;
            return getMatchScore(parsed, student, unique).score > 0;
          });

          if (!canMatchFromText) {
            try {
              if (!sharedOcrWorker) sharedOcrWorker = await getTesseractWorker();
              const ocr = await extractCertificateText(file, {
                forceOcr: true,
                sharedWorker: sharedOcrWorker
              });
              const ocrText = ocr.rawText || "";
              rawText = uniqueTextParts([rawText, ocrText]);
              method = rawText === ocrText ? ocr.method : "PDF text extraction + OCR fallback";
              normalized = normalizeText(rawText);
              parsed = {
                file,
                rawText,
                normalizedText: normalized,
                compactText: normalizeCompact(rawText),
                nameCandidates: extractNameCandidates(rawText),
                hints: detectPdfHints(normalized),
                method,
                used: false
              };
            } catch (ocrError) {
              console.error("[BATCH] Certificate OCR failed", file.name, ocrError);
              method = `OCR failed (${getReadableFileType(file)}): ${ocrError?.message || "unknown OCR error"}`;
              parsed.method = method;
            }
          }
        }

        parsedFiles.push(parsed);
      }

      const candidates = [];
      targetStudents.forEach((student, studentIndex) => {
        const isNameUnique = (nameCount[normalizeCompact(student.name)] || 0) === 1;
        parsedFiles.forEach((pf, fileIndex) => {
          const match = getMatchScore(pf, student, isNameUnique);
          if (match.score > 0) {
            candidates.push({
              studentIndex,
              fileIndex,
              score: match.score,
              matchedBy: match.matchedBy
            });
          }
        });
      });

      candidates.sort((a, b) => b.score - a.score);

      // IMPORTANT: assignment is FILE -> STUDENT, not STUDENT -> FILE.
      // Therefore one selected student may receive multiple certificates.
      const assignments = new Map();
      const matchedFileIndexes = new Set();

      for (let fileIndex = 0; fileIndex < parsedFiles.length; fileIndex += 1) {
        const fileCandidates = candidates.filter((c) => c.fileIndex === fileIndex);

        if (!fileCandidates.length) continue;

        // Prefer the strongest match. If two selected students have the same
        // score for a certificate, do not guess; report it as ambiguous.
        const topScore = fileCandidates[0].score;
        const top = fileCandidates.filter((c) => c.score === topScore);

        if (top.length !== 1) continue;

        const chosen = top[0];
        assignments.set(fileIndex, chosen);
        matchedFileIndexes.add(fileIndex);
      }

      const items = [];

      // Process every matched file independently. There is intentionally no
      // "used student" set: multiple files may belong to the same student.
      for (const [fileIndex, assigned] of assignments.entries()) {
        const s = targetStudents[assigned.studentIndex];
        const file = parsedFiles[fileIndex]?.file;
        if (!file || !s) continue;

        const fileHash = await generateFileHash(file);
        const ipfs = await uploadToIPFS(file, {
          studentName: s.name,
          course: form.course,
          studentWallet: s.walletAddress
        });

        items.push({
          studentId: s.studentId,
          name: s.name,
          studentWallet: s.walletAddress,
          department: s.department,
          section: s.section,
          semester: s.semester,
          batchYear: s.batchYear,
          course: form.course,
          grade: form.grade || "",
          credits: Number(form.credits || 0),
          duration: form.duration || "",
          skills: form.skills
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          fileHash,
          ipfsHash: ipfs.IpfsHash,
          fileName: file.name,
          matchedBy: assigned.matchedBy,
          matchScore: assigned.score,
          detectedHints: parsedFiles[fileIndex]?.hints || null,
          extractionMethod: parsedFiles[fileIndex]?.method || "unknown",
          status: "ready"
        });
      }

      // Keep every uploaded certificate visible. Any PDF that could not be
      // safely assigned to a selected student is reported as unmatched and
      // is never uploaded to IPFS or included in the blockchain batch.
      parsedFiles.forEach((pf, fileIndex) => {
        if (matchedFileIndexes.has(fileIndex)) return;

        const normalized = pf.normalizedText;
        const selectedIdMatches = targetStudents.filter((s) => {
          const id = normalizeCompact(s.studentId);
          return id && pf.compactText.includes(id);
        });

        const selectedNameMatches = targetStudents.filter((s) => {
          const unique =
            targetStudents.filter(
              (x) => normalizeCompact(x.name) === normalizeCompact(s.name)
            ).length === 1;
          return (
            unique &&
            (pf.nameCandidates || []).some((candidate) =>
              namesExactlyMatch(candidate, s.name)
            )
          );
        });

        let reason = "No matching USN/Student ID or exact student name";
        if (selectedIdMatches.length > 1) {
          reason = "Certificate contains multiple selected student USNs/IDs; not safe to guess";
        } else if (selectedIdMatches.length === 1 && selectedNameMatches.length === 1) {
          const idStudent = selectedIdMatches[0];
          const nameStudent = selectedNameMatches[0];
          if (
            normalizeCompact(idStudent.studentId) !==
            normalizeCompact(nameStudent.studentId)
          ) {
            reason = "USN/Student ID and student name point to different selected students";
          } else {
            reason = "USN/name match was ambiguous and was not assigned";
          }
        } else if (selectedNameMatches.length > 1) {
          reason = "Exact student name matches multiple selected students";
        } else if (selectedIdMatches.length === 1) {
          reason = "USN/Student ID was detected but the certificate could not be safely assigned";
        } else if (!normalized) {
          reason = `No readable text after ${pf.method || "PDF/image"} processing; USN/Student ID and exact name could not be detected`;
        }

        items.push({
          status: "unmatched-file",
          fileName: pf.file.name,
          reason,
          matchedBy: "none",
          matchScore: 0,
          detectedHints: pf.hints || null,
          extractionMethod: pf.method || "Unknown"
        });
      });

      setPrepared(items);
      const readyCount = items.filter((x) => x.status === "ready").length;
      if (readyCount === 0) {
        setError("No ready records to submit");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      if (sharedOcrWorker) {
        try {
          await sharedOcrWorker.terminate();
        } catch {
          // Ignore OCR worker cleanup errors.
        }
      }
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      setError("");
      setResult(null);

      const ready = prepared.filter((p) => p.status === "ready");
      if (!ready.length) throw new Error("No ready records to submit");

      // Fast path: try the existing batch transaction first. One transaction
      // is much faster for a clean batch with no duplicates.
      try {
        const tx = await issueCertificatesBatch(ready);
        const submitted = prepared.map((p) =>
          p.status === "ready" ? { ...p, status: "submitted" } : p
        );
        setPrepared(submitted);
        setResult({ ...tx, submittedCount: ready.length, existingCount: 0, failedCount: 0 });
        navigate("/institute/success", {
          state: {
            mode: "batch",
            transactionHash: tx.hash,
            certificateIds: tx.certificateIds || [],
            readyCount: ready.length,
            submittedCount: ready.length,
            existingCount: 0,
            failedCount: 0,
            totalPrepared: prepared.length,
            prepared: submitted
          }
        });
        return;
      } catch (batchError) {
        // A single duplicate can revert the whole batch. Fall back to
        // per-certificate submission so new certificates still succeed.
        console.warn("[BATCH] Batch transaction reverted; processing individually", batchError);
      }

      const updated = [...prepared];
      const submittedIds = [];
      const txHashes = [];
      let submittedCount = 0;
      let existingCount = 0;
      let failedCount = 0;

      for (let i = 0; i < updated.length; i += 1) {
        if (updated[i].status !== "ready") continue;

        try {
          const tx = await issueCertificatesBatch([updated[i]]);
          submittedCount += 1;
          txHashes.push(tx.hash);
          if (Array.isArray(tx.certificateIds)) submittedIds.push(...tx.certificateIds);
          updated[i] = { ...updated[i], status: "submitted", submitTx: tx.hash };
          setPrepared([...updated]);
        } catch (singleError) {
          const message = String(singleError?.reason || singleError?.message || singleError || "");
          const duplicate = /certificate\s+exists|already\s+exists|duplicate/i.test(message);

          if (duplicate) {
            existingCount += 1;
            updated[i] = {
              ...updated[i],
              status: "already-exists",
              reason: "Certificate already exists on the blockchain; skipped without affecting other certificates."
            };
          } else {
            failedCount += 1;
            updated[i] = {
              ...updated[i],
              status: "submit-failed",
              reason: message || "Certificate submission failed"
            };
          }
          setPrepared([...updated]);
        }
      }

      const summary = {
        hash: txHashes[0] || "",
        certificateIds: submittedIds,
        submittedCount,
        existingCount,
        failedCount
      };

      setResult(summary);

      navigate("/institute/success", {
        state: {
          mode: "batch",
          transactionHash: txHashes[0] || "",
          transactionHashes: txHashes,
          certificateIds: submittedIds,
          readyCount: ready.length,
          submittedCount,
          existingCount,
          failedCount,
          totalPrepared: prepared.length,
          prepared: updated
        }
      });
    } catch (e) {
      setError(e.message || "Batch submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="panel-card p-4">
        <h1 className="page-title hero-title-animated text-2xl md:text-3xl">Smart Batch Issue</h1>
        <p className="page-subtitle mt-1">
          Department/section/semester/batch-wise issuance with auto file hash + auto IPFS upload.
        </p>
      </div>

      <div className="panel-card p-4 flex flex-wrap gap-2">
        <button className="soft-button-muted" onClick={() => navigate("/institute/upload")}>Single Issue Mode</button>
        <button className="soft-button-muted" onClick={() => navigate("/institute/students")}>Manage Student Registry</button>
      </div>

      <div className="panel-card p-4 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm">
          <p className="font-semibold text-slate-800">Required:</p>
          <p className="text-slate-600">Course, student registry (name + studentId + walletAddress), and certificate files.</p>
          <p className="font-semibold text-slate-800 mt-2">Optional:</p>
          <p className="text-slate-600">Department, section, semester, batch year filters, grade, credits, duration, skills.</p>
          <p className="text-slate-600 mt-2">Match mode: USN/StudentID preferred; if unavailable, exact extracted student name is used only when unique.</p>
          <p className="text-slate-600">PDFs are text-extracted AND OCR-scanned page-by-page; images, DOCX, PPTX and XLSX are also scanned/extracted before matching.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="soft-input mt-1">
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Batch Year</label>
            <select value={batchYear} onChange={(e) => setBatchYear(e.target.value)} className="soft-input mt-1">
              {batchYears.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)} className="soft-input mt-1">
              {semesters.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Section</label>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="soft-input mt-1">
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input className="soft-input" placeholder="Course (required)" value={form.course} onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))} />
          <input className="soft-input" placeholder="Grade (optional)" value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} />
          <input className="soft-input" placeholder="Credits (optional)" value={form.credits} onChange={(e) => setForm((p) => ({ ...p, credits: e.target.value }))} />
          <input className="soft-input" placeholder="Duration (optional)" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} />
        </div>
        <input
          className="soft-input"
          placeholder="Skills comma separated: AI,ML,Python"
          value={form.skills}
          onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="soft-button-muted cursor-pointer inline-flex">
            <FileUp className="w-4 h-4" />
            Upload Certificate Files
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.docx,.pptx,.xlsx,.txt,.csv,application/pdf,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </label>
          <p className="text-xs text-slate-500">
            Selected students: {targetStudents.length} | Files uploaded: {files.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <p className="text-xs font-semibold text-slate-700 mb-1">Students In Current Selection</p>
          {targetStudents.length > 0 ? (
            <div className="max-h-40 overflow-auto space-y-1">
              {targetStudents.slice(0, 30).map((s) => (
                <div key={`${s.studentId}-${s.walletAddress}`} className="text-xs text-slate-600 flex flex-wrap gap-2">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span>({s.studentId})</span>
                  <span className="font-mono">{s.walletAddress}</span>
                </div>
              ))}
              {targetStudents.length > 30 ? (
                <p className="text-xs text-slate-500">+{targetStudents.length - 30} more students</p>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              <p>No students found for selected filters.</p>
              {batchYear !== "ALL" && studentsWithoutBatchConstraint.length > 0 ? (
                <p className="mt-1">
                  Found {studentsWithoutBatchConstraint.length} student(s) for department/section/semester, but not for batch year `{batchYear}`.
                  <button
                    type="button"
                    className="ml-2 underline text-blue-600"
                    onClick={() => setBatchYear("ALL")}
                  >
                    Set Batch Year = ALL
                  </button>
                </p>
              ) : null}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Matching priority: USN/Student ID first, then unique student name. Unmatched certificates are shown with a reason and are not submitted.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={prepare} className="soft-button-primary">Prepare Batch</button>
          <button
            onClick={submit}
            disabled={submitting || prepared.filter((p) => p.status === "ready").length === 0}
            className="soft-button-primary"
          >
            {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {submitting ? "Submitting..." : "Submit Batch"}
          </button>
        </div>
      </div>

      {error ? <div className="panel-card p-3 text-rose-700">{error}</div> : null}

      {prepared.length > 0 ? (
        <div className="panel-card p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Prepared Records</h2>
          <p className="text-xs text-slate-600 mb-2">
            Ready: {prepared.filter((p) => p.status === "ready" || p.status === "submitted").length} |
            Already existed: {prepared.filter((p) => p.status === "already-exists").length} |
            Failed: {prepared.filter((p) => p.status === "submit-failed").length} |
            Unmatched certificates: {prepared.filter((p) => p.status === "unmatched-file").length} |
            Students without matched file: {prepared.filter((p) => p.status === "missing-file").length}
          </p>
          <div className="space-y-2">
            {prepared.map((p, idx) => (
              <div key={`${p.studentId}-${idx}`} className="border border-slate-200 rounded-xl p-2.5">
                <p className="font-semibold text-sm">{p.name} ({p.studentId})</p>
                <p className="text-xs text-slate-600">Wallet: {p.studentWallet || "N/A"}</p>
                <p className="text-xs text-slate-600">
                  Dept/Section/Sem/Batch: {p.department || "NA"} / {p.section || "NA"} / {p.semester || "NA"} / {p.batchYear || "NA"}
                </p>
                <p className="text-xs text-slate-600">Status: {p.status}</p>
                {p.status === "ready" || p.status === "submitted" ? (
                  <>
                    <p className="text-xs text-slate-600">Matched File: {p.fileName}</p>
                    <p className="text-xs text-slate-600">Matched By: {p.matchedBy}</p>
                    <p className="text-xs text-slate-600">Match Score: {p.matchScore}</p>
                    {p.detectedHints ? (
                      <p className="text-xs text-slate-600">
                        Document hints:
                        {" "}
                        Dept[{(p.detectedHints.departments || []).join(", ") || "NA"}],
                        {" "}
                        Sem[{(p.detectedHints.semesters || []).join(", ") || "NA"}],
                        {" "}
                        Sec[{(p.detectedHints.sections || []).join(", ") || "NA"}]
                      </p>
                    ) : null}
                    <p className="mono-wrap">fileHash: {p.fileHash}</p>
                    <p className="mono-wrap">ipfsHash: {p.ipfsHash}</p>
                  </>
                ) : p.status === "already-exists" ? (
                  <>
                    <p className="text-xs text-amber-700 font-semibold">Already exists — skipped</p>
                    <p className="text-xs text-amber-700">{p.reason}</p>
                  </>
                ) : p.status === "submit-failed" ? (
                  <>
                    <p className="text-xs text-rose-700 font-semibold">Submission failed</p>
                    <p className="text-xs text-rose-700">Reason: {p.reason}</p>
                  </>
                ) : p.status === "unmatched-file" ? (
                  <>
                    <p className="text-xs text-rose-700 font-semibold">Certificate not matched</p>
                    <p className="text-xs text-rose-700">Reason: {p.reason}</p>
                  </>
                ) : (
                  <p className="text-xs text-amber-700">No certificate matched to this student by USN/Student ID or unique name</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="panel-card p-3">
          <p className="font-semibold text-emerald-700 inline-flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Batch issued successfully
          </p>
          <p className="mono-wrap mt-1">TX: {result.hash}</p>
          <p className="text-xs text-slate-600 mt-1">Certificates: {result.certificateIds?.length || 0}</p>
        </div>
      ) : null}
    </div>
  );
};

export default BatchIssuePage;
