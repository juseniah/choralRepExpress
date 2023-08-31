# ChoralRepExpress

ChoralRepExpress is a Node.js application that fetches and exports product data from JW Pepper's website. It is intended to be used by musicians who need to retrieve data for sheet music products via the website in a useful format.

## Features

- Fetch sheet music details based on product IDs.
- Export fetched data to Google Sheets, CSV, and XLSX formats.

## Installation

1. Clone this repository to your local machine:

    ```bash
    git clone https://github.com/juseniah/choralRepExpress.git
    ```

2. Install the required dependencies:

    ```bash
    npm install
    ```

3. Rename the `keys.sample.json` file to `keys.json` and fill in your Google Sheets API credentials.

## Usage

1. Start the server:

    ```npm start```

2. Go to [http://localhost:3000](http://localhost:3000) in your web browser

3. Enter JW Pepper product IDs separated by commas and choose the export format.

4. Click the "Submit" button to fetch data and export it based on your chosen format.

## Dependencies

- Express.js
- Axios
- Cheerio
- EJS
- Google Sheets API (Authentication)
- fast-csv
- ExcelJS
- body-parser

## License

This project is licensed under the MIT License.

## Note

This repository is intended for showcasing my work and projects. Contributions, including pull requests and issues, are not accepted. If you have any questions or would like to discuss something related to this repository, please feel free to contact me directly.
