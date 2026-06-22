export const LOGIN_URL = "https://scanguard-lake.vercel.app/login";

export function buildLoginMessage({
  username,
  password,
}: {
  username: string;
  password: string;
}): string {
  return [
    "Welcome to ScanGuard.",
    "",
    `Link: ${LOGIN_URL}`,
    `Username: ${username}`,
    `Password: ${password}`,
    "",
    "Please keep these details private and do not share them with anyone else.",
    "",
    "Scanning note:",
    "Scan carefully with a clear, steady, well-lit barcode. Shadows, blur, angled scans, or damaged barcodes can lead to incorrect IDs or duplicate records.",
  ].join("\n");
}
