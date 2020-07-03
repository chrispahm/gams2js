'use strict';

var helpers = {
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
    const line = this.splitNewline(listing).find(l => l.includes('LOWER'));
    const lowerToLevel = line.split('LOWER')[1].split('LEVEL')[0].length;
    const levelToUpper = line.split('LEVEL')[1].split('UPPER')[0].length;
    const upperToMarginal = line.split('UPPER')[1].split('MARGINAL')[0].length;
    
    const marginalEnd = - 6 - 8 - Math.floor(upperToMarginal / 2);
    const upperEnd = marginalEnd - Math.ceil(upperToMarginal / 2) - 5 - Math.floor(levelToUpper / 2);
    const levelEnd = upperEnd - Math.ceil(levelToUpper / 2) - 5 - Math.floor(lowerToLevel / 2);
    const lowerEnd = levelEnd - Math.ceil(lowerToLevel / 2) - 5 - Math.floor(lowerToLevel / 2);
    
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
    const marginal = line.slice(columnWidths.marginal.end).trim();
    const upper = line.slice(columnWidths.upper.end,columnWidths.upper.start).trim();
    const level = line.slice(columnWidths.level.end,columnWidths.level.start).trim();
    const lower = line.slice(columnWidths.lower.end,columnWidths.lower.start).trim();
    
    const domain = line
      .slice(-line.length,columnWidths.lower.end)
      .trim()
      .split('.')
      .map(d => d.trim());
    
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
    const start = listing.search('OBJECTIVE VALUE') + 15;
  	const end = start + listing.slice(start).search('\n');
  	const objectiveValueString = listing.slice(start, end);
  	return parseFloat(objectiveValueString)
  },
  
  getSolveLine(listing) {
    let solReportElements = this.splitByWhitespace(this.splitNewline(listing)[0]);
    return Number(solReportElements[solReportElements.length - 1])
  },
  
  getModelStatus(listing) {
    const start = listing.search('MODEL STATUS') + 18;
    const end = start + 2;
		const modelStatusString = listing.slice(start, end);
		return parseFloat(modelStatusString)
  }
  
};

function readSymbols(type,listing,columnWidths) {
  // split by symbol
  let entries = listing.split(`---- ${type} `);
  // discard the first entry (does not contain the symbol)
  entries = entries.slice(1,entries.length);
  // remove the bottom part of the final entry in order to avoid
  // parsing of non-equation/variable related parts of the listing
  const splitChar = type === 'EQU' ? '---- ' : '****';
  entries[entries.length - 1] = entries[entries.length - 1].split(splitChar)[0];
  
  let data = [];
  
  entries.forEach(entry => {
    entry = helpers.removeEmptyLines(entry);
    let lines = helpers.splitNewline(entry);
    const name = helpers.getSymbolName(entry);
    let interimData = [];
    let description = '';
    
    lines.forEach(line => {
      if (line.includes('LOWER')) return
      if (!line.includes('.')) {
        if (line.includes(name)) {
          description = line.trim().substring(name.length).trim();
        }
        return
      }
      const values = helpers.getValues(line,columnWidths);
      if (!values.domain[0]) return
      // remove the domain if it actually is the symbol name
      if (values.domain.length === 1) {
        values.domain = values.domain.filter(d => d !== name);
      }
      interimData.push(values);
    });
    
    // update values with name, description, solve
    interimData = interimData.map(value => {
      return {
        ...value,
        name: name,
        description: description
      }
    });
    data = data.concat(interimData);
  });
  return data
}

function getSymbol(data,name, domain = []) {
  if (!name) throw new Error('Symbol name required for query.')
  else if (typeof name !== 'string') throw new TypeError('Symbol name must be of type string.')

  return data.filter(e => {
    if (e.name.toUpperCase() !== name.toUpperCase()) return
    if (domain && domain.length) {
      try {
        for (let i = 0; i < domain.length; i++) {
          // empty domains act as a wildcard character, so you can perform 
          // checks against the 2nd, 3rd etc domain position
          if (!domain[i]) continue
          if (domain[i].toUpperCase() !== e.domain[i].toUpperCase()) return
        }
      } catch (e) {
        // no domain, or exceeding length of domain
        return
      }
    }
    return e
  })
}

function parse(listing) {
  let solves = helpers.splitSolves(listing);
  // if splitting by solves didn't do anything, there most likely was
  // a compilation error
  if (solves.length === 1) throw new Error('Error parsing the listing file. Check the raw listing file for compilation errors.')

  try {
    // before parsing anything, we need to define the column widths
    const columnWidths = helpers.getColumnWidths(listing);
    // disregard the first array element, as it only contains junk
    solves = solves.slice(1,solves.length);
    return {
      solves: solves.map(solve => {
        return {
          objective: helpers.readObjective(solve),
          line: helpers.getSolveLine(solve),
          modelStatus: helpers.getModelStatus(solve),
          equations: readSymbols('EQU', solve, columnWidths),
          variables: readSymbols('VAR', solve, columnWidths)
        }
      }),
      get(symbol,domain,solve) {
        if (domain && typeof domain === 'string') domain = [domain];
        // coerce the relevant data
        let data = [];
        if (solve && typeof solve === 'number') {
          try {
            data = data.concat(this.solves[solve].equations,this.solves[solve].variables);
          } catch (e) {
            throw new Error(`No solution found for solve no. ${solve}. Please check the solves array manually.`)
          }
        } else {
          try {
            this.solves.forEach(s => {
              data = data.concat(s.equations,s.variables);
            });
          } catch (e) {
            throw new Error(`Error processing solver data. Please file an issue on the gams2js Github repo.`)
          }
        }
        return getSymbol(data, symbol, domain)
      }
    } 
  } catch (e) {
    console.log(e);
    throw new Error('Error parsing the listing file: ' + e)
  }
}

module.exports = parse;
