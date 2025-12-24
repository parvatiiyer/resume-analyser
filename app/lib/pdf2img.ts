let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("pdf.js must run in the browser");
  }

  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min?url"),
  ]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    pdfjsLib = lib;
    return lib;
  });

  return loadPromise;
}

export async function convertPdfToImage(file: File) {
  const lib = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 4 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject("Failed to create blob");
      resolve(new File([blob], "resume.png", { type: "image/png" }));
    });
  });
}
