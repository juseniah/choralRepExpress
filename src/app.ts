import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import ejs from "ejs";
import { google } from "googleapis";
import { stringify } from "csv/sync";
import * as fs from "fs";
import prompts from "prompts";
import * as ExcelJS from "exceljs";
import * as bodyParser from "body-parser";

const app = express();
const port = 3000; // Choose the desired port number

const keys = JSON.parse(fs.readFileSync("keys.json", "utf-8"));

const auth = new google.auth.JWT(
  keys.client_email,
  undefined,
  keys.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"],
  undefined
);

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve HTML file for the web interface
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/", async (req, res) => {
  try {
    console.log("Received POST request to /");
    const ids = req.body.ids.split(",").map((id: string) => id.trim());
    console.log("IDs:", ids);

    const productData: ProductDetails[] = [];

    for (const id of ids) {
      console.log("Processing ID:", id);
      const productDetails = await getProductDetails(id);
      if (productDetails.id) productData.push(productDetails);
    }

    const exportOption = req.body.exportOption as string;

    let action: string[] = []; // Array to store the actions taken

    if (exportOption === "googleSheet" || exportOption === "all") {
      console.log("Exporting data to Jussi's Google Sheet");
      console.log(
        "https://docs.google.com/spreadsheets/d/1txP1NqXgapXFrg3IDTNiMVMxLyIHKIsxyUOs0L_2ceo/edit?usp=sharing"
      );
      appendDataToGoogleSheet(
        "1txP1NqXgapXFrg3IDTNiMVMxLyIHKIsxyUOs0L_2ceo",
        productData
      );
      action.push("Exported to Google Sheets");
    }

    if (exportOption === "csv" || exportOption === "all") {
      console.log("Exporting data as CSV");
      writeDataToCSV(productData);
      action.push("Exported as CSV");
    }

    if (exportOption === "xlsx" || exportOption === "all") {
      console.log("Exporting data as XLSX");
      writeDataToXLSX(productData);
      action.push("Exported as XLSX");
    }

    console.log("Rendering template");
    const templateData = {
      productData: JSON.stringify(productData),
      action: action.join(", "), // Join the actions into a single string
    };
    const renderedHtml = await ejs.renderFile(
      __dirname + "/result.ejs",
      templateData
    );

    console.log("Sending response");
    res.send(renderedHtml);
  } catch (error) {
    console.error("Error processing request:", error);
    res
      .status(500)
      .send({ error: "An error occurred while processing the request" });
  }
});

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser`);
});

function writeDataToCSV(productData: ProductDetails[]): void {
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

function writeDataToXLSX(productData: ProductDetails[]): void {
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

async function appendDataToGoogleSheet(
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

async function getProductDetails(id: string): Promise<ProductDetails> {
  let productDetails: ProductDetails;
  const html = await getHtmlFromPepper(id);
  if (!html) {
    productDetails = {
      id: "",
      title: "",
      composer: "",
      voicing: "",
      publisher: "",
      unitPriceUSD: 0,
    };
  } else {
    productDetails = scrapeSongDataFromHtml(id, html);
  }
  console.log({productDetails})
  return productDetails;
}

function scrapeSongDataFromHtml(id: string, html: string): ProductDetails {
  const $ = cheerio.load(html);
  const title = $(".titlelink").first().text().trim();
  const composer = $("span.composer-name").first().text().trim();
  const voicing = $("div.singleProdDesc.activeRow span.descr-span b")
    .first()
    .text()
    .trim();
  const publisher = $(".publisher-name a").first().text().trim();
  const unitPrice = $(".top-price").first().text().trim();
  const matchResult = unitPrice.match(/[\d.]+/);
  const unitPriceUSD = matchResult ? +matchResult[0] : 0;
  const productDetails: ProductDetails = {
    id,
    title,
    composer,
    voicing,
    publisher,
    unitPriceUSD: unitPriceUSD,
  };
  return productDetails;
}

async function getHtmlFromPepper(id: string): Promise<string> {
  const sheetMusicUrl = `https://www.jwpepper.com/sheet-music/${id}.item`;
  console.log(`Getting HTML from ${sheetMusicUrl}`);

  try {
    const response = await axios.get(sheetMusicUrl);
    const html = response.data;
    return html;
  } catch (error) {
    console.error(`Error getting HTML from ${sheetMusicUrl}: `, error);
    throw error;
  }
}

interface ProductDetails {
  id: string;
  title: string;
  composer: string;
  voicing: string;
  publisher: string;
  unitPriceUSD: number;
}

module.exports = app;

// 3296179
// 10278879
