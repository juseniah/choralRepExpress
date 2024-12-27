import { JSDOM } from 'jsdom'
import { ProductDetails } from '../interfaces/ProductDetails'

/**
 * Extract product details from the provided HTML.
 * Identifies the second product ID and extracts associated details.
 * @param html - The HTML content of the product page as a string.
 * @returns The extracted product details conforming to the ProductDetails interface.
 */
export function getProductDetailsFromHtml(html: string): ProductDetails {
  const sanitizedHtml = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<link[\s\S]*?>/gi, '')

  const dom = new JSDOM(sanitizedHtml, {
    resources: 'usable', // Prevent jsdom from attempting to load resources
    runScripts: 'outside-only', // Prevent external scripts from running
  })

  const doc = dom.window.document

  const productDivs = doc.querySelectorAll('.prodNum')
  if (productDivs.length < 2) {
    throw new Error('Could not find the second product ID in the provided HTML.')
  }
  const secondProductDiv = productDivs[1]
  const productId =
    secondProductDiv.querySelector('input[name^="product-id-"]')?.getAttribute('value') ||
    secondProductDiv.textContent?.trim()

  if (!productId) {
    throw new Error('Failed to extract the second product ID.')
  }

  const titleElement = doc.querySelector('.titlelink') || doc.querySelector(`a[href*="${productId}"]`)
  const title = titleElement?.textContent?.trim() || 'Unknown Title'

  const composerElement = doc.querySelector('span.composer-name')
  const composer = composerElement?.textContent?.trim() || 'Unknown Composer'

  const voicingElement = doc.querySelector('div.singleProdDesc.activeRow span.descr-span b')
  const voicing = voicingElement?.textContent?.trim() || 'Unknown Voicing'

  const publisherElement = doc.querySelector('.publisher-name a')
  const publisher = publisherElement?.textContent?.trim() || 'Unknown Publisher'

  const priceElement = doc.querySelector('.top-price')
  const unitPrice = priceElement?.textContent?.trim() || ''
  const priceMatch = unitPrice.match(/[\d.]+/)
  const unitPriceUSD = priceMatch ? parseFloat(priceMatch[0]) : 0

  return {
    title,
    composer,
    id: productId,
    voicing,
    publisher,
    unitPriceUSD,
  }
}
