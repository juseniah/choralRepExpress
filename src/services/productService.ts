import axios from "axios";
import * as cheerio from "cheerio";
import { ProductDetails } from "../interfaces/ProductDetails";

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

export { getProductDetails };
