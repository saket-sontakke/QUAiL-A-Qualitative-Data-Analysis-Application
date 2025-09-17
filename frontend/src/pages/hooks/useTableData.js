import { useMemo, useState } from 'react';

/**
 * Sorts an array of code groups based on a given configuration.
 * @param {Array<object>} codeGroups - The code groups to sort.
 * @param {object} config - The sort configuration object.
 * @returns {Array<object>} The sorted array of code groups.
 */
const sortCodeGroups = (codeGroups, config) => {
  const sorted = [...codeGroups];
  if (config.key !== 'default') {
    sorted.sort((a, b) => {
      if (config.key === 'name') {
        return a.definition.name.localeCompare(b.definition.name);
      }
      if (config.key === 'frequency') {
        return b.segments.length - a.segments.length;
      }
      return 0;
    });
    if (config.direction === 'descending' && config.key === 'name') {
      return sorted.reverse();
    }
    if (config.direction === 'ascending' && config.key === 'frequency') {
      return sorted.reverse();
    }
  }
  return sorted;
};

/**
 * A custom hook to manage the state and derived data for the table views in the modal.
 * It handles searching, sorting, and memoized calculations for overall, by-document, and overlap views.
 * @param {object} props - The props for the hook.
 * @param {Array<object>} props.codedSegments - The raw array of coded segment data.
 * @param {Array<object>} props.codeDefinitions - The array of code definitions.
 * @param {object} props.project - The full project object.
 * @returns {object} An object containing state, state setters, and memoized data for the table views.
 */
export const useTableData = ({ codedSegments, codeDefinitions, project }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [overlapSearchTerm, setOverlapSearchTerm] = useState("");

  const filteredSegments = useMemo(() => {
    if (!searchTerm.trim()) return codedSegments;
    const term = searchTerm.toLowerCase();
    return codedSegments.filter((seg) => {
      const textMatch = seg.text.toLowerCase().includes(term);
      const nameMatch = seg.codeDefinition?.name?.toLowerCase().includes(term);
      return textMatch || nameMatch;
    });
  }, [searchTerm, codedSegments]);

  const totalFrequency = filteredSegments.length;

  const overallGroupedData = useMemo(() => {
    const groups = {};
    filteredSegments.forEach((segment) => {
      const def = segment.codeDefinition || { _id: "uncategorized", name: "N/A", description: "", color: "#808080" };
      const key = def._id;
      if (!groups[key]) groups[key] = { definition: def, segments: [] };
      groups[key].segments.push(segment);
    });
    return sortCodeGroups(Object.values(groups), sortConfig);
  }, [filteredSegments, sortConfig]);

  const detailedDataByDocument = useMemo(() => {
    const docMap = new Map();
    filteredSegments.forEach(segment => {
      const fileId = segment.fileId.toString();
      if (!docMap.has(fileId)) {
        const docDetails = project.importedFiles.find(doc => doc._id.toString() === fileId);
        docMap.set(fileId, { document: docDetails || { name: 'Unknown Document', _id: fileId }, segments: [] });
      }
      docMap.get(fileId).segments.push(segment);
    });
    const result = Array.from(docMap.values()).map(docGroup => {
      const codesMap = new Map();
      docGroup.segments.forEach(segment => {
        const def = segment.codeDefinition || { _id: "uncategorized", name: "N/A", description: "", color: "#808080" };
        const codeId = def._id;
        if (!codesMap.has(codeId)) {
          codesMap.set(codeId, { definition: def, segments: [] });
        }
        codesMap.get(codeId).segments.push(segment);
      });
      return {
        ...docGroup,
        totalSegmentsInDoc: docGroup.segments.length,
        codes: sortCodeGroups(Array.from(codesMap.values()), sortConfig)
      };
    });
    const originalOrderMap = new Map(project.importedFiles.map((file, index) => [file._id.toString(), index]));
    return result.sort((a, b) => {
      const indexA = originalOrderMap.get(a.document._id.toString());
      const indexB = originalOrderMap.get(b.document._id.toString());
      return indexA - indexB;
    });
  }, [filteredSegments, project.importedFiles, sortConfig]);

  const overlapsData = useMemo(() => {
    if (!project) return [];
  
    const overlapsByFile = {};
  
    const segmentsByFile = project.codedSegments.reduce((acc, segment) => {
        const fileId = segment.fileId.toString();
        if (!acc[fileId]) acc[fileId] = [];
        acc[fileId].push(segment);
        return acc;
    }, {});
  
    for (const fileId in segmentsByFile) {
        const segments = segmentsByFile[fileId];
        if (segments.length < 2) continue; 
        
        const file = project.importedFiles.find(f => f._id.toString() === fileId);
        if (!file?.content) continue;
  
        const boundaryPoints = new Set();
        segments.forEach(s => {
            boundaryPoints.add(s.startIndex);
            boundaryPoints.add(s.endIndex);
        });
        const sortedPoints = Array.from(boundaryPoints).sort((a, b) => a - b);
  
        const fileOverlaps = [];
  
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const intervalStart = sortedPoints[i];
            const intervalEnd = sortedPoints[i + 1];
            if (intervalStart === intervalEnd) continue;
  
            const coveringSegments = segments.filter(s =>
                s.startIndex <= intervalStart && s.endIndex >= intervalEnd
            );
  
            if (coveringSegments.length > 1) {
              const allCodes = coveringSegments.map(s => s.codeDefinition).filter(Boolean);
              const uniqueCodes = Array.from(new Map(allCodes.map(code => [code._id, code])).values());

              fileOverlaps.push({
                  start: intervalStart,
                  end: intervalEnd,
                  text: file.content.substring(intervalStart, intervalEnd),
                  codes: uniqueCodes,
              });
          }
        }
  
        if (fileOverlaps.length > 0) {
            const mergedOverlaps = [];
            if (fileOverlaps.length === 0) continue;

            let currentOverlap = { ...fileOverlaps[0] };
  
            for (let i = 1; i < fileOverlaps.length; i++) {
                const nextOverlap = fileOverlaps[i];
                
                const currentCodeIds = currentOverlap.codes.map(c => c._id).sort();
                const nextCodeIds = nextOverlap.codes.map(c => c._id).sort();
  
                if (nextOverlap.start === currentOverlap.end && JSON.stringify(currentCodeIds) === JSON.stringify(nextCodeIds)) {
                    currentOverlap.end = nextOverlap.end;
                    currentOverlap.text += nextOverlap.text;
                } else {
                    mergedOverlaps.push(currentOverlap);
                    currentOverlap = { ...nextOverlap };
                }
            }
            mergedOverlaps.push(currentOverlap); 
  
            overlapsByFile[fileId] = {
                document: file,
                overlaps: mergedOverlaps,
            };
        }
    }
    
    const originalOrderMap = new Map(project.importedFiles.map((file, index) => [file._id.toString(), index]));
    return Object.values(overlapsByFile).sort((a, b) => {
        const indexA = originalOrderMap.get(a.document._id.toString());
        const indexB = originalOrderMap.get(b.document._id.toString());
        return indexA - indexB;
    });
  }, [project]);

  const filteredOverlapsData = useMemo(() => {
    if (!overlapSearchTerm.trim()) {
      return overlapsData;
    }
    const term = overlapSearchTerm.toLowerCase();

    const filteredGroups = overlapsData.map(fileGroup => {
      const filteredOverlaps = fileGroup.overlaps.filter(overlap => {
        const textMatch = overlap.text.toLowerCase().includes(term);
        const codeMatch = overlap.codes.some(code => code.name.toLowerCase().includes(term));
        return textMatch || codeMatch;
      });

      if (filteredOverlaps.length > 0) {
        return { ...fileGroup, overlaps: filteredOverlaps };
      }
      return null;
    }).filter(Boolean); 

    return filteredGroups;
  }, [overlapsData, overlapSearchTerm]);

  const overlapStats = useMemo(() => {
    const stats = {
      totalRegions: 0,
      docsWithOverlaps: filteredOverlapsData.length,
      maxCodesInOverlap: 0,
      mostFrequentPair: null,
    };

    if (filteredOverlapsData.length === 0) {
      return stats;
    }

    const pairCounts = new Map();

    filteredOverlapsData.forEach(fileGroup => {
      stats.totalRegions += fileGroup.overlaps.length;

      fileGroup.overlaps.forEach(overlap => {
        const numCodes = overlap.codes.length;
        if (numCodes > stats.maxCodesInOverlap) {
          stats.maxCodesInOverlap = numCodes;
        }

        if (numCodes >= 2) {
          const sortedCodeIds = overlap.codes.map(c => c._id).sort();
          for (let i = 0; i < sortedCodeIds.length; i++) {
            for (let j = i + 1; j < sortedCodeIds.length; j++) {
              const pairKey = `${sortedCodeIds[i]}--${sortedCodeIds[j]}`;
              pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
            }
          }
        }
      });
    });

    if (pairCounts.size > 0) {
      const topPairEntry = [...pairCounts.entries()].reduce((max, entry) => entry[1] > max[1] ? entry : max);
      const [ids, count] = topPairEntry;
      const [id1, id2] = ids.split('--');
      
      const code1 = codeDefinitions.find(c => c._id === id1);
      const code2 = codeDefinitions.find(c => c._id === id2);

      if (code1 && code2) {
        stats.mostFrequentPair = { codes: [code1, code2], count };
      }
    }

    return stats;
  }, [filteredOverlapsData, codeDefinitions]);

  return {
    searchTerm,
    setSearchTerm,
    sortConfig,
    setSortConfig,
    overlapSearchTerm,
    setOverlapSearchTerm,
    totalFrequency,
    filteredSegments,
    overallGroupedData,
    detailedDataByDocument,
    filteredOverlapsData,
    overlapStats
  };
};