import { holdingsImportTemplate } from "@/lib/import-csv";

export async function GET() {
  return new Response(holdingsImportTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="holdings-import-template.csv"',
    },
  });
}
