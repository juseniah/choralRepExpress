import * as fs from 'fs'
import * as ExcelJS from 'exceljs'
import { google } from 'googleapis'
import { stringify } from 'csv/sync'
import { ProductDetails } from '../interfaces/ProductDetails'

const keys = JSON.parse(fs.readFileSync('keys.json', 'utf-8'))

const auth = new google.auth.JWT(
  keys.client_email,
  undefined,
  keys.private_key,
  ['https://www.googleapis.com/auth/spreadsheets'],
  undefined
)

export function writeDataToCSV(productData: ProductDetails[]): void {
  if (productData.length === 0) {
    console.log('No data available to export as CSV')
    return
  }

  try {
    const csvData = stringify(
      productData.map((item) => ({
        Title: item.title,
        Composer: item.composer,
        ProductID: item.id,
        Voicing: item.voicing,
        Publisher: item.publisher,
        Price: `$${item.unitPriceUSD.toFixed(2)}`,
      })),
      { header: true }
    )

    fs.writeFileSync('productData.csv', csvData)
    console.log('Data exported as CSV: productData.csv')
  } catch (error) {
    console.error('Error exporting data as CSV:', error)
  }
}

export function writeDataToXLSX(productData: ProductDetails[]): void {
  if (productData.length === 0) {
    console.log('No data available to export as XLSX')
    return
  }

  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Product Data')

    worksheet.addRow(['Title', 'Composer', 'ProductID', 'Voicing', 'Publisher', 'Price'])

    productData.forEach((item) => {
      worksheet.addRow([
        item.title,
        item.composer,
        item.id,
        item.voicing,
        item.publisher,
        `$${item.unitPriceUSD.toFixed(2)}`,
      ])
    })

    const productIdCol = worksheet.getColumn(3)
    productIdCol.eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        const id = cell.value
        if (id) {
          cell.value = { text: id as string, hyperlink: `https://www.jwpepper.com/sheet-music/${id}.item` }
        }
      }
    })

    workbook.xlsx.writeFile('productData.xlsx').then(() => {
      console.log('Data exported as XLSX: productData.xlsx')
    })
  } catch (error) {
    console.error('Error exporting data as XLSX:', error)
  }
}

export async function appendDataToGoogleSheet(sheetId: string, productData: ProductDetails[]): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })

  const rows = productData.map((item) => [
    item.title,
    item.composer,
    `=HYPERLINK("https://www.jwpepper.com/sheet-music/${item.id}.item", "${item.id}")`,
    item.voicing,
    item.publisher,
    `$${item.unitPriceUSD.toFixed(2)}`,
  ])

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'IncomingPepperData!A:A',
  })

  const existingValues = response.data.values
  const nextRowIndex = existingValues ? existingValues.length + 1 : 1
  const range = `IncomingPepperData!A${nextRowIndex}`

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  })

  console.log('Data appended to Google Sheet')
}
