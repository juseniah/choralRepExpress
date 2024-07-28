import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import {ProductDetails} from '../interfaces/ProductDetails';

async function getProductDetails(id: string): Promise<ProductDetails> {
  let productDetails: ProductDetails;
  const html = await getHtmlFromPepper(id);
  if (!html) {
    productDetails = {
      id: '',
      title: '',
      composer: '',
      voicing: '',
      publisher: '',
      unitPriceUSD: 0,
    };
  } else {
    productDetails = scrapeSongDataFromHtml(id, html);
  }

  // Log the extracted product details
  console.log({ productDetails });
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
  return {
    id,
    title,
    composer,
    voicing,
    publisher,
    unitPriceUSD: unitPriceUSD,
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getHtmlFromPepper(id: string): Promise<string> {
  const sheetMusicUrl = `https://www.jwpepper.com/sheet-music/${id}.item`;
  console.log(`Getting HTML from ${sheetMusicUrl}`);

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set User-Agent and Viewport to mimic a real user
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(sheetMusicUrl, { waitUntil: 'networkidle2' });

    // Wait for Cloudflare challenge to be solved
    await delay(500); // Adjust timeout as needed

    // Optionally, wait for a specific element to ensure page is fully loaded
    await page.waitForSelector('body', { timeout: 500 });

    const html = await page.content();
    await browser.close();

    return html;
  } catch (error) {
    console.error(`Error getting HTML from ${sheetMusicUrl}: `, error);
    throw error;
  }
}

export { getProductDetails };
