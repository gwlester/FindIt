import generateQr from 'qrcode-generator';

/** The QR code for `text` as rows of modules (true = dark). */
export function qrModules(text: string): boolean[][] {
  const qr = generateQr(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => qr.isDark(r, c)));
}
