import express from 'express';
import ExcelJS from 'exceljs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import archiver from 'archiver';
import Project from '../models/Project.js';

// --- Router Initialization ---
const router = express.Router();

/**
 * Converts a standard HEX color code into an ARGB hexadecimal string.
 * Handles validation and normalizes 3-digit HEX codes to 6-digit format.
 *
 * @param {string} hex - The HEX color string (e.g., "#FFF" or "#FFFFFF").
 * @param {number} [alpha=1.0] - The opacity value, ranging from 0.0 to 1.0.
 * @returns {string} The resulting ARGB string (Alpha prepended to RGB).
 */
const hexToArgb = (hex, alpha = 1.0) => {
  // --- Validation and Fallback ---
  if (!hex || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
    hex = '#CCCCCC';
  }

  // --- Normalization ---
  let cleanHex = hex.substring(1);
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }

  // --- Alpha Conversion ---
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();

  return `${alphaHex}${cleanHex}`;
};

/**
 * Generates a subtle color scheme configuration based on a provided base hexadecimal color.
 * Designed for applying consistent styling to cells, including background fills and borders.
 *
 * @param {string} baseHex - The primary hexadecimal color string used to derive the scheme.
 * @returns {Object} An object containing style definitions for cell backgrounds and borders.
 */
const createSubtleColorScheme = (baseHex) => {
  return {
    // --- Background Styles ---
    nameCell: { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(baseHex, 0.15) } },
    contentRows: { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(baseHex, 0.05) } },

    // --- Border Styles ---
    leftBorder: {
      left: { style: 'thick', color: { argb: hexToArgb(baseHex, 0.8) } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    },
    standardBorder: {
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    }
  };
};

/**
 * Applies a subtle color scheme and formatting to a specific region of a worksheet.
 * This includes setting background colors, borders, font styles, and alignment
 * for name columns, content columns, and other associated columns.
 *
 * @param {Object} worksheet - The worksheet object to modify (e.g., ExcelJS Worksheet).
 * @param {number} codeStartRow - The row number where the formatting begins.
 * @param {number} codeEndRow - The row number where the formatting ends.
 * @param {string} baseHexColor - The base hexadecimal color code used to generate the color scheme.
 * @param {Object} columns - Configuration object defining column mappings.
 * @param {string} columns.nameColumn - The column letter for the name/primary cell.
 * @param {string[]} columns.otherColumns - Array of column letters for secondary columns.
 * @param {string[]} columns.contentColumns - Array of column letters for the content body.
 */
const applySubtleColoring = (worksheet, codeStartRow, codeEndRow, baseHexColor, columns) => {
  // --- Initialization & Color Generation ---
  const colors = createSubtleColorScheme(baseHexColor);
  const nameColumn = columns.nameColumn;

  // --- Primary Cell Formatting ---
  worksheet.getCell(`${nameColumn}${codeStartRow}`).fill = colors.nameCell;
  worksheet.getCell(`${nameColumn}${codeStartRow}`).font = { bold: true };
  worksheet.getCell(`${nameColumn}${codeStartRow}`).border = colors.leftBorder;

  // --- Secondary Columns Formatting ---
  columns.otherColumns.forEach(col => {
    worksheet.getCell(`${col}${codeStartRow}`).fill = colors.contentRows;
    worksheet.getCell(`${col}${codeStartRow}`).border = colors.standardBorder;
  });

  // --- Content Range Formatting ---
  for (let i = codeStartRow; i <= codeEndRow; i++) {
    columns.contentColumns.forEach(col => {
      worksheet.getCell(`${col}${i}`).fill = colors.contentRows;
      worksheet.getCell(`${col}${i}`).border = colors.standardBorder;
      worksheet.getCell(`${col}${i}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    });
  }

  // --- Alignment Finalization ---
  worksheet.getCell(`${nameColumn}${codeStartRow}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  columns.otherColumns.forEach(col => {
    worksheet.getCell(`${col}${codeStartRow}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
};

/**
* Handles the export of coded segments for a specific project into an Excel file.
* Supports 'matrix', 'overall', and 'byDocument' formats.
* @param {Object} req - The Express request object.
* @param {Object} req.params - The request parameters containing projectId.
* @param {string} req.userId - The ID of the authenticated user (injected by middleware).
* @param {Object} req.query - The query parameters (e.g., format).
* @param {Object} res - The Express response object.
* @returns {Promise<void>} Sends a downloadable Excel file stream to the client. 
*/
router.get('/:projectId/export-coded-segments', async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;
  const { format = 'byDocument' } = req.query;

  try {
    // --- Data Retrieval & Validation ---
    const project = await Project.findOne({ _id: projectId, owner: userId }).lean();
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }
    const workbook = new ExcelJS.Workbook();

    // --- Matrix Report Generation ---
    if (format === 'matrix') {
        const worksheet = workbook.addWorksheet('Code Matrix Report');
  
        // 1. Header Configuration
        const sortedCodeDefs = [...project.codeDefinitions].sort((a, b) => a.name.localeCompare(b.name));
        const allCodeNames = sortedCodeDefs.map(cd => cd.name);
        const codeNameToColorMap = new Map(sortedCodeDefs.map(cd => [cd.name, cd.color || '#CCCCCC']));
        const codeKeys = allCodeNames.map(name => name.replace(/[^a-zA-Z0-9]/g, ''));
  
        const headers = ['Document', 'Timestamp', 'Speaker', 'Segment Text', ...allCodeNames, 'Total'];
        worksheet.columns = headers.map((h, i) => ({
          header: h,
          key: i < 4 ? h.toLowerCase().replace(/\s+/g, '') : (i < headers.length - 1 ? codeKeys[i - 4] : 'total'),
        }));
  
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  
        allCodeNames.forEach((name, index) => {
          const cell = headerRow.getCell(5 + index);
          const color = codeNameToColorMap.get(name);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: hexToArgb(color, 0.25) }
          };
        });
        
        // 2. Data Processing & Row Generation
        const allFiles = project.importedFiles;
        let currentRowIndex = 2;
  
        for (const file of allFiles) {
          const fileStartRow = currentRowIndex;
          const fileContent = file.content || '';
          const segmentsForThisFile = project.codedSegments.filter(cs => cs.fileId.toString() === file._id.toString());
          const lines = fileContent.split('\n');
          let currentPosition = 0;
  
          for (const lineText of lines) {
            const lineLength = lineText.length;
            const lineStart = currentPosition;
            const lineEnd = currentPosition + lineLength;
            currentPosition += lineLength + 1;
  
            if (lineText.trim() === '') continue;
  
            let rowData = {};
            let rowTotal = 0;

            // Line Parsing
            const transcriptLineRegex = /^(?:(\[.*?\]|\(.*?\)|{.*?}|\b\d{1,2}:\d{2}:\d{2}(?:\.\d{3})?\b)\s*)?(?:([^:]+?):\s*)?(.*)/;
            const match = lineText.match(transcriptLineRegex);

            const rawTimestamp = match[1] || '';
            const rawSpeaker = match[2] || '';
            const rawText = match[3] || '';

            const timestampValue = rawTimestamp.replace(/[\[\](){}]/g, '').trim();
            rowData.timestamp = timestampValue || '-';
            rowData.speaker = rawSpeaker.trim();
            rowData.segmenttext = rawText.trim();
            
            if (!rowData.speaker && !rowData.timestamp) {
              rowData.segmenttext = lineText.trim();
            }

            codeKeys.forEach(key => rowData[key] = '');
  
            // Code Intersection Check
            segmentsForThisFile.forEach(segment => {
              if (Math.max(lineStart, segment.startIndex) < Math.min(lineEnd, segment.endIndex)) {
                const codeName = segment.codeDefinition.name;
                const codeIndex = allCodeNames.indexOf(codeName);
                if (codeIndex > -1) {
                  const key = codeKeys[codeIndex];
                  if (rowData[key] !== 1) {
                    rowData[key] = 1;
                    rowTotal++;
                  }
                }
              }
            });
  
            rowData.total = rowTotal > 0 ? rowTotal : '';
            rowData.document = file.name;
  
            worksheet.addRow(rowData);
            currentRowIndex++;
          }
  
          const fileEndRow = currentRowIndex - 1;
          if (fileEndRow >= fileStartRow) {
            worksheet.mergeCells(`A${fileStartRow}:A${fileEndRow}`);
          }
        }
        
        // 3. Summary & Styling
        const summaryRowIndex = currentRowIndex;
        const summaryRow = worksheet.addRow({});
        summaryRow.getCell('segmenttext').value = 'Total';
        summaryRow.font = { bold: true };
  
        for (let i = 0; i < allCodeNames.length; i++) {
          const colLetter = String.fromCharCode('E'.charCodeAt(0) + i);
          summaryRow.getCell(5 + i).value = { formula: `SUM(${colLetter}2:${colLetter}${summaryRowIndex - 1})` };
        }
        const totalColLetter = String.fromCharCode('E'.charCodeAt(0) + allCodeNames.length);
        summaryRow.getCell(headers.length).value = { formula: `SUM(${totalColLetter}2:${totalColLetter}${summaryRowIndex - 1})` };
  
        worksheet.columns.forEach((column, index) => {
          if (index === 0) column.width = 30;
          else if (index === 1) column.width = 12;
          else if (index === 2) column.width = 20;
          else if (index === 3) column.width = 60;
          else if (index < headers.length - 1) column.width = column.header.length > 15 ? 20 : 15;
          else column.width = 10;
        });
  
        for (let i = 2; i <= summaryRowIndex; i++) {
          const row = worksheet.getRow(i);
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.alignment = { wrapText: true };
            if (colNumber === 4) {
              cell.alignment.vertical = 'top';
              cell.alignment.horizontal = 'left';
            } else {
              cell.alignment.vertical = 'middle';
              cell.alignment.horizontal = 'center';
            }
  
            if (colNumber >= 5 && colNumber < headers.length) {
              const headerName = headers[colNumber - 1];
              const color = codeNameToColorMap.get(headerName);
              if (color) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: hexToArgb(color, 0.08) }
                };
              }
            }
          });
        }
  
        for (let i = 1; i <= summaryRowIndex; i++) {
          const row = worksheet.getRow(i);
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber > headers.length) return;
  
            const isExcludedSummaryCell = (i === summaryRowIndex && colNumber < 4);
  
            if (!isExcludedSummaryCell) {
              cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
              };
            }
          });
        }
  
        const date = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${project.name}_Code_Matrix_${date}.xlsx"`);
        await workbook.xlsx.write(res);
        return res.end();
      }

    // --- Standard Report Generation (Overall / By Document) ---
    const worksheet = workbook.addWorksheet('Coded Segments');
    let totalFrequency = 0;
    
    const styleHeader = (ws) => {
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF444444' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF6A6A6A' } },
          left: { style: 'thin', color: { argb: 'FF6A6A6A' } },
          bottom: { style: 'thin', color: { argb: 'FF6A6A6A' } },
          right: { style: 'thin', color: { argb: 'FF6A6A6A' } }
        };
      });
    };

    if (format === 'overall') {
      // Overall Format Grouping
      worksheet.columns = [
        { header: 'Code Definition', key: 'codeName', width: 30 },
        { header: 'Code Description', key: 'codeDescription', width: 40 },
        { header: 'File Name', key: 'fileName', width: 30 },
        { header: 'Coded Segment Text', key: 'text', width: 60 },
        { header: 'Frequency', key: 'frequency', width: 15 },
      ];
      styleHeader(worksheet);

      const groupedByCode = {};
      project.codedSegments.forEach(segment => {
        const defId = segment.codeDefinition?._id?.toString() || 'undefined';
        if (!groupedByCode[defId]) {
          groupedByCode[defId] = { definition: segment.codeDefinition, segments: [] };
        }
        groupedByCode[defId].segments.push(segment);
      });

      let currentRow = 2;
      for (const { definition, segments } of Object.values(groupedByCode)) {
        const codeStartRow = currentRow;
        const baseHexColor = definition?.color || '#CCCCCC';

        const segmentsByFile = segments.reduce((acc, segment) => {
            const fileName = segment.fileName || 'Unknown File';
            if (!acc[fileName]) acc[fileName] = [];
            acc[fileName].push(segment);
            return acc;
        }, {});

        for (const [fileName, fileSegments] of Object.entries(segmentsByFile)) {
            for (const segment of fileSegments) {
                worksheet.addRow({ text: `"${segment.text || ''}"` });
                currentRow++;
            }
        }

        const codeEndRow = currentRow - 1;
        worksheet.mergeCells(`A${codeStartRow}:A${codeEndRow}`);
        worksheet.mergeCells(`B${codeStartRow}:B${codeEndRow}`);
        worksheet.mergeCells(`E${codeStartRow}:E${codeEndRow}`);
        worksheet.getCell(`A${codeStartRow}`).value = definition?.name || 'Unknown Code';
        worksheet.getCell(`B${codeStartRow}`).value = definition?.description || 'No description';
        worksheet.getCell(`E${codeStartRow}`).value = segments.length;

        applySubtleColoring(worksheet, codeStartRow, codeEndRow, baseHexColor, {
          nameColumn: 'A',
          otherColumns: ['B', 'E'],
          contentColumns: ['C', 'D']
        });

        let fileRowTracker = codeStartRow;
        for (const [fileName, fileSegments] of Object.entries(segmentsByFile)) {
            const fileStartRow = fileRowTracker;
            const fileEndRow = fileRowTracker + fileSegments.length - 1;
            if (fileEndRow >= fileStartRow) {
                worksheet.mergeCells(`C${fileStartRow}:C${fileEndRow}`);
                const fileCell = worksheet.getCell(`C${fileStartRow}`);
                fileCell.value = fileName;
                fileCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            }
            fileRowTracker = fileEndRow + 1;
        }
      }
      totalFrequency = project.codedSegments.length;
    } else {
      // By Document Format Grouping
      worksheet.columns = [
        { header: 'File Name', key: 'fileName', width: 30 },
        { header: 'Code Definition', key: 'codeName', width: 25 },
        { header: 'Code Description', key: 'codeDescription', width: 40 },
        { header: 'Coded Segment Text', key: 'text', width: 60 },
        { header: 'Frequency', key: 'frequency', width: 15 },
      ];
      styleHeader(worksheet);
      
      const groupedByFile = {};
      project.codedSegments.forEach(segment => {
        const fileName = segment.fileName || 'Unknown File';
        if (!groupedByFile[fileName]) groupedByFile[fileName] = [];
        groupedByFile[fileName].push(segment);
      });
      let currentRow = 2;
      
      for (const [fileName, segmentsInFile] of Object.entries(groupedByFile)) {
        const fileStartRow = currentRow;
        const groupedByCode = {};
        segmentsInFile.forEach(segment => {
          const defId = segment.codeDefinition?._id?.toString() || 'undefined';
          if (!groupedByCode[defId]) {
            groupedByCode[defId] = { definition: segment.codeDefinition, segments: [] };
          }
          groupedByCode[defId].segments.push(segment);
        });
        
        for (const { definition, segments } of Object.values(groupedByCode)) {
          const codeStartRow = currentRow;
          const baseHexColor = definition?.color || '#CCCCCC';
          
          for (const segment of segments) {
            worksheet.addRow({ text: `"${segment.text || ''}"` });
            currentRow++;
          }
          
          const codeEndRow = currentRow - 1;
          worksheet.mergeCells(`B${codeStartRow}:B${codeEndRow}`);
          worksheet.mergeCells(`C${codeStartRow}:C${codeEndRow}`);
          worksheet.mergeCells(`E${codeStartRow}:E${codeEndRow}`);
          worksheet.getCell(`B${codeStartRow}`).value = definition?.name || 'Unknown Code';
          worksheet.getCell(`C${codeStartRow}`).value = definition?.description || 'No description';
          worksheet.getCell(`E${codeStartRow}`).value = segments.length;
          
          applySubtleColoring(worksheet, codeStartRow, codeEndRow, baseHexColor, {
            nameColumn: 'B',
            otherColumns: ['C', 'E'],
            contentColumns: ['D']
          });
        }
        
        const fileEndRow = currentRow - 1;
        if (fileEndRow >= fileStartRow) {
          worksheet.mergeCells(`A${fileStartRow}:A${fileEndRow}`);
          const firstCell = worksheet.getCell(`A${fileStartRow}`);
          firstCell.value = fileName;
          firstCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          firstCell.font = { bold: true };

          for (let i = fileStartRow; i <= fileEndRow; i++) {
            const cell = worksheet.getCell(`A${i}`);
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' }
            };
            cell.border = {
              left: { style: 'thick', color: { argb: 'FF666666' } },
              right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };
          }
        }
      }
      totalFrequency = project.codedSegments.length;
    }
    // --- Totals & Final Response ---
    const totalRow = worksheet.addRow({});
    const totalLabelCell = worksheet.getCell(totalRow.number, worksheet.columns.length - 1);
    const totalValueCell = worksheet.getCell(totalRow.number, worksheet.columns.length);
    totalLabelCell.value = 'Total Frequency';
    totalValueCell.value = totalFrequency;
    totalLabelCell.font = { bold: true };
    totalValueCell.font = { bold: true };
    totalLabelCell.alignment = { horizontal: 'right' };
    totalValueCell.alignment = { horizontal: 'center' };
    totalLabelCell.border = {
      top: { style: 'thick', color: { argb: 'FF666666' } }
    };
    totalValueCell.border = {
      top: { style: 'thick', color: { argb: 'FF666666' } }
    };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}_coded_segments_${format}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[EXPORT ERROR]', err);
    res.status(500).json({ error: 'Failed to export coded segments', details: err.message });
  }
});

/**
 * Exports all coded segments associated with a specific file within a project to an Excel spreadsheet.
 * Performs authorization checks, retrieves project data, organizes segments by code definition,
 * applies formatting to the worksheet, and streams the result as a downloadable .xlsx file.
 *
 * @param {Object} req - The Express request object, expecting `projectId` and `fileId` in `req.params`, and `userId` in `req.userId`.
 * @param {Object} res - The Express response object used to send the file or error status.
 * @returns {Promise<void>} Resolves when the response is sent.
 */
router.get('/:projectId/export-coded-segments-file/:fileId', async (req, res) => {
  // --- Request Parsing & Context ---
  const { projectId, fileId } = req.params;
  const userId = req.userId;

  try {
    // --- Database Verification & Authorization ---
    const project = await Project.findOne({ _id: projectId, owner: userId }).lean();
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // --- File & Segment Validation ---
    const file = project.importedFiles.find(f => f._id.toString() === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const fileSegments = project.codedSegments.filter(s => s.fileId && s.fileId.toString() === fileId);

    if (fileSegments.length === 0) {
      return res.status(404).json({ error: 'No coded segments found for this file.' });
    }

    // --- Workbook Initialization & Styling ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Coded Segments');
    let totalFrequency = 0;

    const styleHeader = (ws) => {
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF444444' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF6A6A6A' } },
          left: { style: 'thin', color: { argb: 'FF6A6A6A' } },
          bottom: { style: 'thin', color: { argb: 'FF6A6A6A' } },
          right: { style: 'thin', color: { argb: 'FF6A6A6A' } }
        };
      });
    };

    worksheet.columns = [
      { header: 'Code Definition', key: 'codeName', width: 30 },
      { header: 'Code Description', key: 'codeDescription', width: 40 },
      { header: 'File Name', key: 'fileName', width: 30 },
      { header: 'Coded Segment Text', key: 'text', width: 60 },
      { header: 'Frequency', key: 'frequency', width: 15 },
    ];
    styleHeader(worksheet);

    // --- Data Grouping ---
    const groupedByCode = {};
    fileSegments.forEach(segment => {
      const defId = segment.codeDefinition?._id?.toString() || 'undefined';
      if (!groupedByCode[defId]) {
        groupedByCode[defId] = { definition: segment.codeDefinition, segments: [] };
      }
      groupedByCode[defId].segments.push(segment);
    });

    // --- Row Generation & Formatting ---
    let currentRow = 2;
    for (const { definition, segments } of Object.values(groupedByCode)) {
      const codeStartRow = currentRow;
      const baseHexColor = definition?.color || '#CCCCCC';

      const segmentsByFile = segments.reduce((acc, segment) => {
          const fileName = segment.fileName || 'Unknown File';
          if (!acc[fileName]) acc[fileName] = [];
          acc[fileName].push(segment);
          return acc;
      }, {});

      for (const [fileName, fileSegments] of Object.entries(segmentsByFile)) {
          for (const segment of fileSegments) {
              worksheet.addRow({ text: `"${segment.text || ''}"` });
              currentRow++;
          }
      }

      const codeEndRow = currentRow - 1;
      worksheet.mergeCells(`A${codeStartRow}:A${codeEndRow}`);
      worksheet.mergeCells(`B${codeStartRow}:B${codeEndRow}`);
      worksheet.mergeCells(`E${codeStartRow}:E${codeEndRow}`);
      worksheet.getCell(`A${codeStartRow}`).value = definition?.name || 'Unknown Code';
      worksheet.getCell(`B${codeStartRow}`).value = definition?.description || 'No description';
      worksheet.getCell(`E${codeStartRow}`).value = segments.length;

      applySubtleColoring(worksheet, codeStartRow, codeEndRow, baseHexColor, {
        nameColumn: 'A',
        otherColumns: ['B', 'E'],
        contentColumns: ['C', 'D']
      });

      let fileRowTracker = codeStartRow;
      for (const [fileName, fileSegments] of Object.entries(segmentsByFile)) {
          const fileStartRow = fileRowTracker;
          const fileEndRow = fileRowTracker + fileSegments.length - 1;
          if (fileEndRow >= fileStartRow) {
              worksheet.mergeCells(`C${fileStartRow}:C${fileEndRow}`);
              const fileCell = worksheet.getCell(`C${fileStartRow}`);
              fileCell.value = fileName;
              fileCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          }
          fileRowTracker = fileEndRow + 1;
      }
    }
    totalFrequency = fileSegments.length;

    // --- Total Frequency Calculation ---
    const totalRow = worksheet.addRow({});
    const totalLabelCell = worksheet.getCell(totalRow.number, worksheet.columns.length - 1);
    const totalValueCell = worksheet.getCell(totalRow.number, worksheet.columns.length);
    totalLabelCell.value = 'Total Frequency';
    totalValueCell.value = totalFrequency;
    totalLabelCell.font = { bold: true };
    totalValueCell.font = { bold: true };
    totalLabelCell.alignment = { horizontal: 'right' };
    totalValueCell.alignment = { horizontal: 'center' };
    totalLabelCell.border = {
      top: { style: 'thick', color: { argb: 'FF666666' } }
    };
    totalValueCell.border = {
      top: { style: 'thick', color: { argb: 'FF666666' } }
    };

    // --- Response & File Download ---
    const sanitizedFileName = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}_coded_segments_overall.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    // --- Error Handling ---
    console.error('[SINGLE FILE EXPORT ERROR]', err);
    res.status(500).json({ error: 'Failed to export coded segments', details: err.message });
  }
});

/**
 * Handles the export of overlapping coded segments within a project to an Excel file.
 * Calculates overlaps based on segment intervals, computes statistics, and formats an Excel report.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.projectId - The unique identifier of the project.
 * @param {string} req.userId - The ID of the authenticated user requesting the export.
 * @param {Object} res - The Express response object used to send the Excel file.
 * @returns {Promise<void>} Sends a generated .xlsx file stream or a JSON error response.
 */
router.get('/:projectId/export-overlaps', async (req, res) => {
    const { projectId } = req.params;
    const userId = req.userId;
  
    try {
      // --- Project Retrieval and Validation ---
      const project = await Project.findOne({ _id: projectId, owner: userId }).lean();
      if (!project) {
        return res.status(404).json({ error: 'Project not found or unauthorized' });
      }
  
      // --- Data Preparation: Group Segments by File ---
      const overlapsByFile = {};
      const segmentsByFile = project.codedSegments.reduce((acc, segment) => {
        const fileId = segment.fileId.toString();
        if (!acc[fileId]) acc[fileId] = [];
        acc[fileId].push(segment);
        return acc;
      }, {});
  
      // --- Overlap Detection Logic ---
      for (const fileId in segmentsByFile) {
          const segments = segmentsByFile[fileId];
          if (segments.length < 2) continue;
          const file = project.importedFiles.find(f => f._id.toString() === fileId);
          if (!file?.content) continue;
  
          // Identify all start and end points to define atomic intervals
          const boundaryPoints = new Set();
          segments.forEach(s => {
              boundaryPoints.add(s.startIndex);
              boundaryPoints.add(s.endIndex);
          });
          const sortedPoints = Array.from(boundaryPoints).sort((a, b) => a - b);
  
          // Analyze each interval for overlapping segments
          const fileOverlaps = [];
          for (let i = 0; i < sortedPoints.length - 1; i++) {
              const intervalStart = sortedPoints[i];
              const intervalEnd = sortedPoints[i + 1];
              if (intervalStart === intervalEnd) continue;
  
              const coveringSegments = segments.filter(s => s.startIndex <= intervalStart && s.endIndex >= intervalEnd);
              if (coveringSegments.length > 1) {
                  const allCodes = coveringSegments.map(s => s.codeDefinition).filter(Boolean);
                  const uniqueCodes = Array.from(new Map(allCodes.map(code => [code._id.toString(), code])).values());
                  fileOverlaps.push({
                      start: intervalStart,
                      end: intervalEnd,
                      text: file.content.substring(intervalStart, intervalEnd),
                      codes: uniqueCodes,
                  });
              }
          }
  
          // Merge adjacent intervals if they share the exact same set of codes
          if (fileOverlaps.length > 0) {
              const mergedOverlaps = [];
              let currentOverlap = { ...fileOverlaps[0] };
              for (let i = 1; i < fileOverlaps.length; i++) {
                  const nextOverlap = fileOverlaps[i];
                  const currentCodeIds = currentOverlap.codes.map(c => c._id.toString()).sort();
                  const nextCodeIds = nextOverlap.codes.map(c => c._id.toString()).sort();
                  if (nextOverlap.start === currentOverlap.end && JSON.stringify(currentCodeIds) === JSON.stringify(nextCodeIds)) {
                      currentOverlap.end = nextOverlap.end;
                      currentOverlap.text += nextOverlap.text;
                  } else {
                      mergedOverlaps.push(currentOverlap);
                      currentOverlap = { ...nextOverlap };
                  }
              }
              mergedOverlaps.push(currentOverlap);
              overlapsByFile[fileId] = { document: file, overlaps: mergedOverlaps };
          }
      }
      
      const finalOverlaps = Object.values(overlapsByFile);
      if (finalOverlaps.length === 0) {
        return res.status(404).json({ error: 'No overlapping codes found in the project to export.' });
      }
  
      // --- Statistics Calculation ---
      const totalOverlapRegions = finalOverlaps.reduce((total, fileGroup) => total + fileGroup.overlaps.length, 0);
      const documentsWithOverlaps = finalOverlaps.length;
      const totalDocuments = project.importedFiles.length;
      const totalOverlapTextLength = finalOverlaps.reduce((total, fileGroup) => 
          total + fileGroup.overlaps.reduce((fileTotal, overlap) => fileTotal + overlap.text.length, 0), 0
      );
      const averageOverlapLength = totalOverlapRegions > 0 ? Math.round(totalOverlapTextLength / totalOverlapRegions) : 0;
      
      // Calculate code pair frequency
      const allOverlapCodes = new Set();
      const codePairFrequency = {};
      finalOverlaps.forEach(fileGroup => {
        fileGroup.overlaps.forEach(overlap => {
          overlap.codes.forEach(code => allOverlapCodes.add(code.name));
          if (overlap.codes.length >= 2) {
            const sortedCodeNames = overlap.codes.map(c => c.name).sort();
            for (let i = 0; i < sortedCodeNames.length; i++) {
              for (let j = i + 1; j < sortedCodeNames.length; j++) {
                const pair = `${sortedCodeNames[i]} & ${sortedCodeNames[j]}`;
                codePairFrequency[pair] = (codePairFrequency[pair] || 0) + 1;
              }
            }
          }
        });
      });
      const uniqueCodesList = Array.from(allOverlapCodes).sort();
      const mostFrequentPair = Object.entries(codePairFrequency).sort(([,a], [,b]) => b - a)[0];
  
      // --- Excel Generation: Setup and Summary Headers ---
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Overlapping Codes Report');
      
      worksheet.getCell('A1').value = 'Total Overlap Regions:';
      worksheet.getCell('B1').value = totalOverlapRegions;
      worksheet.getCell('C1').value = 'Documents with Overlaps:';
      worksheet.getCell('D1').value = `${documentsWithOverlaps} / ${totalDocuments} Docs`;
      worksheet.getCell('E1').value = 'Most Frequent Pair:';
      worksheet.getCell('F1').value = mostFrequentPair ? `${mostFrequentPair[0]} (${mostFrequentPair[1]} times)` : 'N/A';
      
      worksheet.getCell('A2').value = 'Unique Codes Involved:';
      worksheet.getCell('B2').value = uniqueCodesList.join(', ') || 'N/A';
      worksheet.getCell('C2').value = 'Total Overlap Text:';
      worksheet.getCell('D2').value = `${totalOverlapTextLength} characters`;
      worksheet.getCell('E2').value = 'Average Overlap Length:';
      worksheet.getCell('F2').value = `${averageOverlapLength} characters`;
      
      // Style summary rows
      [1, 2].forEach(rowNum => {
        worksheet.getRow(rowNum).eachCell({ includeEmpty: true }, (cell, colNum) => {
          if (colNum % 2 === 1) { 
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2F5' } };
          } else { 
            cell.font = { color: { argb: 'FF1D3C87' } };
          }
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        });
      });
      
      // --- Excel Generation: Data Table Headers ---
      worksheet.addRow({});
      const headerRow = worksheet.getRow(4);
      headerRow.values = ['File Name', 'Overlapping Text', 'Applied Codes', 'Code Count'];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF444444' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      worksheet.getColumn('A').width = 30;
      worksheet.getColumn('B').width = 60;
      worksheet.getColumn('C').width = 40;
      worksheet.getColumn('D').width = 15;
      worksheet.getColumn('E').width = 30;
      worksheet.getColumn('F').width = 40; 
  
      // --- Excel Generation: Populate Data Rows ---
      let currentRowIndex = 5;
      finalOverlaps.forEach(fileGroup => {
        const fileStartRow = currentRowIndex;
        fileGroup.overlaps.forEach(overlap => {
          
          // Create Rich Text object for colored codes
          const richTextValue = [];
          overlap.codes.forEach((code, index) => {
            richTextValue.push({
              text: code.name,
              font: {
                color: { argb: hexToArgb(code.color || '#808080') }, 
                bold: true,
              }
            });
            if (index < overlap.codes.length - 1) {
              richTextValue.push({
                text: ', ',
                font: { color: { argb: 'FF000000' } } 
              });
            }
          });
          
          const rowData = [
            null, 
            `"${overlap.text}"`,
            { richText: richTextValue }, 
            overlap.codes.length
          ];
          
          worksheet.addRow(rowData);
          currentRowIndex++;
        });
        
        // Merge file name cells for visual grouping
        const fileEndRow = currentRowIndex - 1;
        if (fileEndRow >= fileStartRow) {
          worksheet.mergeCells(`A${fileStartRow}:A${fileEndRow}`);
          const fileNameCell = worksheet.getCell(`A${fileStartRow}`);
          fileNameCell.value = fileGroup.document.name;
          fileNameCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          fileNameCell.font = { bold: true };
          fileNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        }
      });
  
      // Apply borders and alignment to data table
      for (let i = 4; i < currentRowIndex; i++) {
          const row = worksheet.getRow(i);
          row.eachCell({ includeEmpty: true }, (cell) => {
              cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
              if (i > 4) {
                   cell.alignment = { ...cell.alignment, vertical: 'top', wrapText: true };
              }
          });
      }
  
      // --- Response Handling ---
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}_overlaps_report.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
  
    } catch (err) {
      console.error('[OVERLAPS EXPORT ERROR]', err);
      res.status(500).json({ error: 'Failed to export overlapping codes', details: err.message });
    }
  });

/**
 * Exports all memos associated with a specific file within a project to an Excel (.xlsx) spreadsheet.
 *
 * @route GET /:projectId/files/:fileId/export-memos
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The unique identifier of the project.
 * @param {string} req.params.fileId - The unique identifier of the file to export memos for.
 * @param {Object} res - The Express response object used to stream the file or send error responses.
 * @returns {Promise<void>} Streams the generated Excel workbook to the client or returns a JSON error.
 */
router.get('/:projectId/files/:fileId/export-memos', async (req, res) => {
    const { projectId, fileId } = req.params;
    try {
      // --- Project and File Retrieval ---
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
  
      const file = project.importedFiles.id(fileId);
      if (!file) return res.status(404).json({ error: 'File not found' });
  
      // --- Memo Filtering ---
      const memosForFile = project.memos.filter(memo => memo.fileId && memo.fileId.toString() === fileId);
      if (memosForFile.length === 0) {
        return res.status(404).json({ error: 'No memos found for this file.' });
      }
  
      // --- Workbook Generation ---
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Memos');
      worksheet.columns = [
        { header: 'File Name', key: 'fileName', width: 25 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Content', key: 'content', width: 50 },
        { header: 'Author', key: 'author', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 25 },
      ];
      memosForFile.forEach(memo => {
        worksheet.addRow({
          fileName: memo.fileName,
          title: memo.title || '',
          content: memo.content,
          author: memo.author,
          createdAt: memo.createdAt ?
            memo.createdAt.toLocaleString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }) :
            '',
        });
      });
  
      // --- Response Headers and Stream ---
      const sanitizedFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename=${sanitizedFileName}_memos.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      // --- Error Handling ---
      console.error(err);
      res.status(500).json({ error: 'Failed to export memos.' });
    }
});

/**
 * Express route handler to export a specific file within a project to a requested format.
 * Currently supports DOCX and PDF formats.
 *
 * @param {Object} req - The Express request object, containing path params (projectId, fileId) and query params (format).
 * @param {Object} res - The Express response object used to send the file buffer or stream.
 * @returns {Promise<void>} Returns a promise that resolves when the response is sent.
 */
router.get('/:projectId/files/:fileId/export', async (req, res) => {
    // --- Parameter Extraction ---
    const { projectId, fileId } = req.params;
    const { format } = req.query;
  
    try {
      // --- Project & File Retrieval ---
      const project = await Project.findOne({ _id: projectId, owner: req.userId });
      if (!project) {
        return res.status(404).json({ error: 'Project not found.' });
      }
  
      const file = project.importedFiles.id(fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found.' });
      }
  
      // --- Metadata Processing ---
      const baseName = path.basename(file.name, path.extname(file.name));
  
      if (format === 'docx') {
        // --- DOCX Generation ---
        const paragraphs = file.content.split('\n').map(line => new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun(line)],
        }));
        const doc = new Document({
          sections: [{
            properties: {},
            children: paragraphs,
          }],
        });
  
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}.docx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
  
      } else if (format === 'pdf') {
        // --- PDF Generation ---
        const doc = new PDFDocument();
        let filename = `${baseName}.pdf`;
        filename = encodeURIComponent(filename);
        res.setHeader('Content-disposition', `attachment; filename*=UTF-8''${filename}`);
        res.setHeader('Content-type', 'application/pdf');
  
        doc.pipe(res);
        doc.fontSize(12).text(file.content, {
          align: 'justify'
        });
        doc.end();
  
      } else {
        // --- Invalid Format Handling ---
        return res.status(400).json({ error: 'Invalid or unsupported format specified.' });
      }
    } catch (err) {
      // --- Error Handling ---
      console.error('File export error:', err);
      res.status(500).json({ error: 'Failed to export file.' });
    }
});
  
/**
 * Handles the export of a specific project as a compressed .quail archive.
 * * This route retrieves the project data, packages associated audio assets,
 * sanitizes system fields, and generates a ZIP file containing the project
 * JSON and assets. It handles temporary file creation, streaming response, 
 * and cleanup of temporary files upon completion.
 *
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The unique identifier of the project to export.
 * @param {string} req.userId - The ID of the user requesting the export (attached by middleware).
 * @param {Object} res - The Express response object.
 * @returns {void} Triggers a file download stream or sends a JSON error response.
 */
router.get('/:projectId/export-quail', async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  try {
    // --- Project Retrieval & Validation ---
    const project = await Project.findOne({ _id: projectId, owner: userId }).lean();
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // --- File System & Stream Setup ---
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.quail`;
    
    const zipPath = path.join(process.cwd(), `temp_export_${Date.now()}_${filename}`);
    const output = fs.createWriteStream(zipPath);
    
    const archive = archiver('zip', { zlib: { level: 9 } });

    // --- Response Handling & Cleanup ---
    output.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      console.log('Archiver finalized. Sending file...');

      res.download(zipPath, filename, (err) => {
        if (err) {
          console.error("Error sending file to client:", err);
        }

        fs.unlink(zipPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Failed to delete temp export file:", unlinkErr);
          } else {
            console.log(`Cleaned up temp export file: ${zipPath}`);
          }
        });
      });
    });

    archive.on('error', function(err) {
      console.error('Archiver error:', err);
      res.status(500).send({error: err.message});
    });

    archive.pipe(output);

    // --- Data Processing & Asset Archival ---
    const projectData = JSON.parse(JSON.stringify(project));

    if (projectData.importedFiles) {
      projectData.importedFiles = projectData.importedFiles.map(file => {
        if (file.sourceType === 'audio' && file.audioUrl) {
          let relativePath = file.audioUrl.startsWith('/') ? file.audioUrl.substring(1) : file.audioUrl;
          const absolutePath = path.resolve(relativePath);

          if (fs.existsSync(absolutePath)) {
            const ext = path.extname(relativePath);
            const zipAssetName = `assets/${file._id}${ext}`;
            archive.file(absolutePath, { name: zipAssetName });

            return { ...file, audioUrl: zipAssetName };
          }
        }
        return file;
      });
    }

    // --- Data Sanitization ---
    delete projectData._id;
    delete projectData.owner;
    delete projectData.createdAt;
    delete projectData.updatedAt;
    delete projectData.__v;

    // --- Archive Finalization ---
    archive.append(JSON.stringify(projectData, null, 2), { name: 'project.json' });
    
    await archive.finalize();

  } catch (err) {
    console.error('Project export failed:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Export failed' });
  }
});

export default router;