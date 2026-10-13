import { NativeModules } from 'react-native';
export async function saveKhasraCsv(
  name: string,
  csv: string,
): Promise<string> {
  if (!NativeModules.WorkFiles?.saveKhasraCsv)
    throw Error('Install the latest Android build to export Khasra reports.');
  return NativeModules.WorkFiles.saveKhasraCsv(name, csv);
}
export async function saveOfficialPdf(
  name: string,
  base64: string,
): Promise<string> {
  if (!NativeModules.WorkFiles?.savePdf)
    throw Error('Install the latest Android build to save ERO PDFs.');
  return NativeModules.WorkFiles.savePdf(name, base64);
}
export async function exportOfficialPdf(path: string): Promise<string> {
  if (!NativeModules.WorkFiles?.exportPdf)
    throw Error('Install the latest Android build to export PDFs.');
  return NativeModules.WorkFiles.exportPdf(path);
}
export async function saveMapFile(
  name: string,
  kml: string,
  pngBase64?: string,
): Promise<string> {
  if (!NativeModules.WorkFiles)
    throw Error('Install the latest Android build to export maps.');
  return NativeModules.WorkFiles.saveMap(name, kml, pngBase64 || null);
}
export async function printOfficialPdf(
  path: string,
  title: string,
): Promise<void> {
  if (!NativeModules.WorkFiles)
    throw Error('Install the latest Android build to print official PDFs.');
  return NativeModules.WorkFiles.printPdf(path, title);
}

export async function validateDocumentPdf(path: string): Promise<string> {
  if (!NativeModules.WorkFiles?.validateDocumentPdf)
    throw Error('Install the latest Android build to prepare documents.');
  return NativeModules.WorkFiles.validateDocumentPdf(path);
}
export async function exportDocumentPdf(path: string): Promise<string> {
  if (!NativeModules.WorkFiles?.exportDocumentPdf)
    throw Error('Install the latest Android build to export documents.');
  return NativeModules.WorkFiles.exportDocumentPdf(path);
}

export async function generateDocumentPdf(
  name: string,
  html: string,
): Promise<string> {
  if (!NativeModules.WorkFiles?.generateDocumentPdf)
    throw Error('Install the latest Android build to generate documents.');
  return NativeModules.WorkFiles.generateDocumentPdf(name, html);
}

export async function printDocumentPdf(
  path: string,
  title: string,
): Promise<void> {
  if (!NativeModules.WorkFiles?.printDocumentPdf)
    throw Error('Install the latest Android build to print documents.');
  return NativeModules.WorkFiles.printDocumentPdf(path, title);
}
