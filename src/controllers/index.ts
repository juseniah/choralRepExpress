import { Request, Response } from 'express'
import ejs from 'ejs'
import * as path from 'path'
import { writeDataToCSV, writeDataToXLSX, appendDataToGoogleSheet } from '../services/dataExportService'
import { ProductDetails } from '../interfaces/ProductDetails'
import { getProductDetailsFromHtml } from '../services/productService'

export function handleGetIndexPage(req: Request, res: Response): void {
  const indexPath = path.join(__dirname, '../../index.html')
  res.sendFile(indexPath)
}

export async function handlePostIndexPage(req: Request, res: Response): Promise<void> {
  try {
    console.log('Received POST request to /')

    const html = req.body.html // Pasted HTML content
    if (!html) {
      res.status(400).send({ error: 'HTML is required.' })
      return
    }

    const productDetails: ProductDetails = getProductDetailsFromHtml(html)

    if (!productDetails.id) {
      res.status(400).send({
        error: 'Could not extract product details. Ensure the HTML contains a valid product ID.',
      })
      return
    }

    const exportOption = req.body.exportOption as string
    const productData: ProductDetails[] = [productDetails] // Wrap single product in an array
    let action: string[] = [] // Array to store the actions taken

    if (exportOption === 'googleSheet' || exportOption === 'all') {
      console.log('Exporting data to Google Sheet')
      await appendDataToGoogleSheet('1txP1NqXgapXFrg3IDTNiMVMxLyIHKIsxyUOs0L_2ceo', productData)
      action.push('Exported to Google Sheets')
    }

    if (exportOption === 'csv' || exportOption === 'all') {
      console.log('Exporting data as CSV')
      await writeDataToCSV(productData)
      action.push('Exported as CSV')
    }

    if (exportOption === 'xlsx' || exportOption === 'all') {
      console.log('Exporting data as XLSX')
      await writeDataToXLSX(productData)
      action.push('Exported as XLSX')
    }

    console.log('Rendering template')
    const templateData = {
      productData: JSON.stringify(productData),
      action: action.join(', '),
    }
    const resultEjsFilePath = path.join(__dirname, '../../src/views/result.ejs')
    const renderedHtml = await ejs.renderFile(resultEjsFilePath, templateData)

    console.log('Sending response')
    res.send(renderedHtml)
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).send({ error: 'An error occurred while processing the request' })
  }
}
