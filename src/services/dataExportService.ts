import * as fs from "fs";
import * as ExcelJS from "exceljs";
import { google } from "googleapis";
import { stringify } from "csv/sync";
import { ProductDetails } from "../interfaces/ProductDetails";

const keys = JSON.parse(fs.readFileSync("keys.json", "utf-8"));

const auth = new google.auth.JWT(
  keys.client_email,
  undefined,
  keys.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"],
  undefined
);

export function writeDataToCSV(productData: ProductDetails[]): void {
  if (productData.length === 0) {
    console.log("No data available to export as CSV");
    return;
  }

  try {
    const csvData = stringify(productData, { header: true });
    fs.writeFileSync("productData.csv", csvData);
    console.log("Data exported as CSV: productData.csv");
  } catch (error) {
    console.error("Error exporting data as CSV:", error);
  }
}

export function writeDataToXLSX(productData: ProductDetails[]): void {
  console.log("Entering writeDataToXLSX()");
  if (productData.length === 0) {
    console.log("No data available to export as XLSX");
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Product Data");

    // Add headers
    const headers = Object.keys(productData[0]);
    worksheet.addRow(headers);

    // Add data rows
    for (const data of productData) {
      const row = Object.values(data);
      worksheet.addRow(row);
    }

    // Apply currency formatting to the "unitPriceUSD" column
    const priceColumnIndex = headers.indexOf("unitPriceUSD") + 1;
    const priceColumn = worksheet.getColumn(priceColumnIndex);
    priceColumn.numFmt = '"$"#,##0.00';

    // Add hyperlinks to the "id" column
    const idColumnIndex = headers.indexOf("id") + 1;
    const idColumn = worksheet.getColumn(idColumnIndex);
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const cell = worksheet.getCell(i, idColumnIndex);
      const idValue = cell.value;
      if (idValue) {
        const hyperlink = `https://www.jwpepper.com/sheet-music/${idValue}.item`;
        cell.value = { text: idValue as string, hyperlink };
        cell.style = { font: { underline: true, color: { argb: "FF0000FF" } } };
      }
    }

    console.log("Writing productData.xlsx...");
    workbook.xlsx
      .writeFile("productData.xlsx")
      .then(() => {
        console.log("Data exported as XLSX: productData.xlsx");
      })
      .catch((error) => {
        console.error("Error writing productData.xlsx:", error);
      })
      .finally(() => {
        console.log("File write operation completed.");
      });
  } catch (e) {
    console.error({ e });
  }
}

export async function appendDataToGoogleSheet(
  sheetId: string,
  data: ProductDetails[]
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth });

  // Convert the data to an array of arrays
  const rows = data.map((item) => [
    `=HYPERLINK("https://www.jwpepper.com/sheet-music/${item.id}.item", "${item.id}")`,
    item.title,
    item.composer,
    item.voicing,
    item.publisher,
    item.unitPriceUSD,
  ]);

  // Modify the rows array to flatten the objects within each cell
  const flattenedRows = rows.map((row) =>
    row.map((cell) => {
      if (typeof cell === "object" && cell !== null) {
        return (cell as ExcelJS.Cell).text;
      }
      return cell;
    })
  );

  // Determine the next empty row
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "IncomingPepperData!A:A", // Replace with the desired sheet and column range
  });

  const existingValues = response.data.values;
  const nextRowIndex = existingValues ? existingValues.length + 1 : 1;

  // Update the range to target the next empty row
  const nextRowRange = `IncomingPepperData!A${nextRowIndex}:F${nextRowIndex}`; // Replace with the desired sheet and column range

  // Append the data to the Google Sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: nextRowRange,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: flattenedRows,
    },
  });

  console.log("Data appended to Google Sheet");
}

