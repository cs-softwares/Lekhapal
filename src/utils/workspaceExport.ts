import { editReport, ReportDetails } from '../services/reportEditor';
import { buildReportHtml } from './reportHtml';
import { requestPremiumAccess } from '../services/premiumAccess';
import Share from 'react-native-share';
import {
  CaptureOptions,
  captureRef,
  releaseCapture,
} from 'react-native-view-shot';
import { generatePDF } from 'react-native-html-to-pdf';

const ensureFileUri = (value: string) =>
  value.startsWith('file://') ? value : `file://${value}`;

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
  details,
  points,
}: {
  title: string;
  fileName: string;
  summaryLines: string[];
  details?: Partial<ReportDetails>;
  points?: { lat: number; lng: number }[];
}) => {
  if (!requestPremiumAccess('pdf_reports')) return;
  const report = await editReport({ title, summaryLines, details, points });
  if (!report || !requestPremiumAccess('pdf_reports')) return;
  const html = buildReportHtml({ ...report, summaryLines, points });

  const result = await generatePDF({
    directory: 'Documents',
    fileName,
    html,
  });

  if (!result.filePath) {
    throw new Error('The PDF could not be generated. Please retry.');
  }

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
