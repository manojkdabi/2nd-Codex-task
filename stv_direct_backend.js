/**
 * STV Direct PDF Exporter
 *
 * This module contains helper functions for exporting STV Direct
 * reports to PDF.  It is designed to be added to your Apps
 * Script backend (for example, in v22_Backend_24012026.txt).  The
 * export functions assemble an HTML report using the
 * StvDirectExport.html template (see that file in this repo) and
 * convert it to a PDF via Apps Script's Blob and getAs APIs.
 *
 * To use these functions, ensure the StvDirectExport.html file is
 * included in your Apps Script project.  You can then call
 * `generateStvDirectPdf(testId)` or `generateStvDirectBulkPdf(testIds)`
 * from your front‑end using google.script.run().  Edits you make to
 * the HTML template will automatically reflect in the exported
 * reports.
 */

/**
 * Compute helper values (ratings, marker positions, etc.) for STV
 * Direct parameters.  This function takes the raw test data as
 * returned by getSTVDirectData() and returns an object whose
 * properties can be consumed by the StvDirectExport.html template.
 *
 * For brevity, this helper only processes pH, but you can extend
 * it to compute other parameters such as EC, OC, Avail_N, etc.
 *
 * @param {Object} testRecord The raw STV Direct record (row) with
 *   numeric values for each parameter.
 * @returns {Object} Data object for template rendering.
 */
function buildStvDirectTemplateData_(testRecord) {
  const data = {};
  // Example for pH.  Replace or extend these fields for other parameters.
  const pHMin = 3;
  const pHMax = 11;
  const cut1 = 6.5;
  const cut2 = 7.5;
  const value = testRecord.pH;
  const markerPercent = ((value - pHMin) / (pHMax - pHMin)) * 100;
  const cut1Percent = ((cut1 - pHMin) / (pHMax - pHMin)) * 100;
  const cut2Percent = ((cut2 - pHMin) / (pHMax - pHMin)) * 100;
  let rating;
  if (value < cut1) {
    rating = 'Low';
  } else if (value > cut2) {
    rating = 'High';
  } else {
    rating = 'Optimum';
  }
  data.pH = {
    value: value,
    rating: rating,
    cut1Percent: cut1Percent,
    cut2Percent: cut2Percent,
    markerPercent: markerPercent
  };
  // Add additional parameters here as needed
  return data;
}

/**
 * Generate a PDF for a single STV Direct test.  This function
 * fetches the STV Direct data, computes template variables, and
 * renders the StvDirectExport.html template into a PDF.  The
 * returned object contains a base64‑encoded PDF and a suggested
 * filename.  Edits to the StvDirectExport.html file will be
 * reflected in the PDF output.
 *
 * @param {string} testId The Test_ID of the STV Direct record to export.
 * @return {Object} An object with two properties: `pdf` (base64
 *   encoded string) and `fileName` (string).
 */
function generateStvDirectPdf(testId) {
  const records = getSTVDirectData();
  const record = records.find(row => String(row.Test_ID) === String(testId));
  if (!record) {
    throw new Error('STV Direct record not found for Test_ID ' + testId);
  }
  const templateData = buildStvDirectTemplateData_(record);
  const template = HtmlService.createTemplateFromFile('StvDirectExport');
  template.data = templateData;
  const htmlOutput = template.evaluate().getContent();
  const blob = Utilities.newBlob(htmlOutput, MimeType.HTML).getAs(MimeType.PDF);
  return {
    pdf: Utilities.base64Encode(blob.getBytes()),
    fileName: 'stv_direct_report_' + testId + '.pdf'
  };
}

/**
 * Generate a multi‑page PDF for multiple STV Direct tests.  Each
 * selected test is rendered as a separate page using the
 * StvDirectExport.html template.  The resulting PDF can be
 * downloaded as a single file or further processed as needed.
 *
 * @param {string[]} testIds Array of Test_ID values to export.
 * @return {Object} An object with `pdf` (base64 string) and
 *   `fileName` (string).
 */
function generateStvDirectBulkPdf(testIds) {
  if (!Array.isArray(testIds) || testIds.length === 0) {
    throw new Error('testIds must be a non‑empty array');
  }
  const records = getSTVDirectData();
  let combinedHtml = '';
  testIds.forEach((id, index) => {
    const record = records.find(row => String(row.Test_ID) === String(id));
    if (!record) {
      return;
    }
    const templateData = buildStvDirectTemplateData_(record);
    const template = HtmlService.createTemplateFromFile('StvDirectExport');
    template.data = templateData;
    combinedHtml += template.evaluate().getContent();
    // Add page break except after the last page
    if (index < testIds.length - 1) {
      combinedHtml += '<div style="page-break-after:always;"></div>';
    }
  });
  const bulkBlob = Utilities.newBlob(combinedHtml, MimeType.HTML).getAs(MimeType.PDF);
  return {
    pdf: Utilities.base64Encode(bulkBlob.getBytes()),
    fileName: 'stv_direct_reports_' + new Date().getTime() + '.pdf'
  };
}
