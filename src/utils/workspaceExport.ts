import Share from 'react-native-share';
import {
  CaptureOptions,
  captureRef,
  releaseCapture,
} from 'react-native-view-shot';
import {generatePDF} from 'react-native-html-to-pdf';

const ensureFileUri = (value: string) =>
  value.startsWith('file://') ? value : `file://${value}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const shareTextSummary = async ({
  summaryLines,
  title,
}: {
  title: string;
  summaryLines: string[];
}) => {
  await Share.open({
    failOnCancel: false,
    message: [title, ...summaryLines].join('\n'),
    title,
  });
};

export const exportSummaryAsPdf = async ({
  fileName,
  summaryLines,
  title,
}: {
  title: string;
  fileName: string;
  summaryLines: string[];
}) => {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            padding: 24px;
          }
          .card {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #dbeafe;
            padding: 24px;
          }
          h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            color: #1e40af;
          }
          p {
            margin: 0 0 10px 0;
            line-height: 1.5;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${escapeHtml(title)}</h1>
          ${summaryLines
            .map(
              line =>
                `<p>${escapeHtml(line)}</p>`,
            )
            .join('')}
        </div>
      </body>
    </html>
  `;

  const result = await generatePDF({
    directory: 'Documents',
    fileName,
    html,
  });

  await Share.open({
    failOnCancel: false,
    filename: fileName,
    saveToFiles: true,
    title,
    type: 'application/pdf',
    url: ensureFileUri(result.filePath),
  });
};

export const exportRefAsImage = async ({
  fileName,
  ref,
  title,
}: {
  ref: unknown;
  title: string;
  fileName: string;
}) => {
  const options: CaptureOptions = {
    fileName,
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  };

  const uri = await captureRef(
    ref as Parameters<typeof captureRef>[0],
    options,
  );

  try {
    await Share.open({
      failOnCancel: false,
      filename: fileName,
      saveToFiles: true,
      title,
      type: 'image/png',
      url: ensureFileUri(uri),
    });
  } finally {
    releaseCapture(uri);
  }
};
