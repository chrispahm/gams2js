export default {
  splitNewline(listing) {
    return listing.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/)
  },

  removeEmptyLines(listing) {
    return listing.replace(/^\s*[\r\n]/gm,'')
  },

  splitByWhitespace(listing) {
    return listing.split(/[ ,]+/)
  },

  getSymbolName(listing) {
    return listing.split(/\s/)[0]
  },

  splitSolves(listing) {
    return listing.split(/Solution Report\s*?SOLVE/)
  },
  
  getColumnWidths(listing) {
    const line = this.splitNewline(listing).find(l => l.includes('LOWER'))
    const lowerToLevel = line.split('LOWER')[1].split('LEVEL')[0].length
    const levelToUpper = line.split('LEVEL')[1].split('UPPER')[0].length
    const upperToMarginal = line.split('UPPER')[1].split('MARGINAL')[0].length
    
    const marginalEnd = - 6 - 8 - Math.floor(upperToMarginal / 2)
    const upperEnd = marginalEnd - Math.ceil(upperToMarginal / 2) - 5 - Math.floor(levelToUpper / 2)
    const levelEnd = upperEnd - Math.ceil(levelToUpper / 2) - 5 - Math.floor(lowerToLevel / 2)
    const lowerEnd = levelEnd - Math.ceil(lowerToLevel / 2) - 5 - Math.floor(lowerToLevel / 2)
    
    return {
      marginal: {
        start: -6,
        end: marginalEnd
      },
      upper: {
        start: marginalEnd,
        end: upperEnd 
      },
      level: {
        start: upperEnd,
        end: levelEnd
      },
      lower: {
        start: levelEnd,
        end: lowerEnd
      }
    }
  },
  
  getValues(line,columnWidths) {
    const marginal = line.slice(columnWidths.marginal.end).trim()
    const upper = line.slice(columnWidths.upper.end,columnWidths.upper.start).trim()
    const level = line.slice(columnWidths.level.end,columnWidths.level.start).trim()
    const lower = line.slice(columnWidths.lower.end,columnWidths.lower.start).trim()
    
    const domain = line
      .slice(-line.length,columnWidths.lower.end)
      .trim()
      .split('.')
      .map(d => d.trim())
    
    return {
      marginal: this.parseNumerical(marginal),
      level: this.parseNumerical(level),
      upper: this.parseNumerical(upper),
      lower: this.parseNumerical(lower),
      domain: domain
    }
  },
  
  parseNumerical(value) {
    if (value === '+INF') return Infinity
    else if (value === '-INF') return -Infinity
    else if (value === 'EPS') return Number.MIN_VALUE
    else if (value === '.') return 0
    else return Number(value)
  },

  readObjective(listing) {
    const start = listing.search('OBJECTIVE VALUE') + 15
  	const end = start + listing.slice(start).search('\n')
  	const objectiveValueString = listing.slice(start, end)
  	return parseFloat(objectiveValueString)
  },
  
  getSolveLine(listing) {
    let solReportElements = this.splitByWhitespace(this.splitNewline(listing)[0])
    return Number(solReportElements[solReportElements.length - 1])
  },
  
  getModelStatus(listing) {
    const start = listing.search('MODEL STATUS') + 18
    const end = start + 2
		const modelStatusString = listing.slice(start, end)
		return parseFloat(modelStatusString)
  }
  
}