import { Request, Response } from "express";
import ejs from "ejs";
import * as path from "path";
import {
  writeDataToCSV,
  writeDataToXLSX,
  appendDataToGoogleSheet,
} from "../services/dataExportService";
import { ProductDetails } from "../interfaces/ProductDetails";
import { getProductDetails } from "../services/productService";

// Function to handle GET request for the index page
function handleGetIndexPage(req: Request, res: Response): void {
  const indexPath = path.join(__dirname, "../../index.html");
  res.sendFile(indexPath);
}

// Function to handle POST request for the index page
async function handlePostIndexPage(req: Request, res: Response): Promise<void> {
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
      await appendDataToGoogleSheet(
          "1txP1NqXgapXFrg3IDTNiMVMxLyIHKIsxyUOs0L_2ceo",
          productData
      );
      action.push("Exported to Google Sheets");
    }

    if (exportOption === "csv" || exportOption === "all") {
      console.log("Exporting data as CSV");
      await writeDataToCSV(productData);
      action.push("Exported as CSV");
    }

    if (exportOption === "xlsx" || exportOption === "all") {
      console.log("Exporting data as XLSX");
      await writeDataToXLSX(productData);
      action.push("Exported as XLSX");
    }

    console.log("Rendering template");
    const templateData = {
      productData: JSON.stringify(productData),
      action: action.join(", "), // Join the actions into a single string
    };
    const resultEjsFilePath = path.join(__dirname, "../../dist/result.ejs");
    const renderedHtml = await ejs.renderFile(
        resultEjsFilePath,
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
}

export { handleGetIndexPage, handlePostIndexPage };
