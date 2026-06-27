import { BusinessCard } from "./types";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/jpeg;base64, prefix
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function generateCSV(cards: BusinessCard[]): string {
  const headers = [
    "Name",
    "Job Title",
    "Company",
    "Email",
    "Phone",
    "Website",
    "Address",
    "Date Added",
  ];
  
  const escapeCsv = (str: string | undefined) => {
    if (!str) return "";
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = cards.map((card) => [
    escapeCsv(card.name),
    escapeCsv(card.jobTitle),
    escapeCsv(card.company),
    escapeCsv(card.email),
    escapeCsv(card.phone),
    escapeCsv(card.website),
    escapeCsv(card.address),
    escapeCsv(new Date(card.createdAt).toLocaleDateString()),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
