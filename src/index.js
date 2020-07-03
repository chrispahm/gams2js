import helpers from './helpers'

function readSymbols(type,listing,columnWidths) {
  // split by symbol
  let entries = listing.split(`---- ${type} `)
  // discard the first entry (does not contain the symbol)
  entries = entries.slice(1,entries.length)
  // remove the bottom part of the final entry in order to avoid
  // parsing of non-equation/variable related parts of the listing
  const splitChar = type === 'EQU' ? '---- ' : '****'
  entries[entries.length - 1] = entries[entries.length - 1].split(splitChar)[0]
  
  let data = []
  
  entries.forEach(entry => {
    entry = helpers.removeEmptyLines(entry)
    let lines = helpers.splitNewline(entry)
    const name = helpers.getSymbolName(entry)
    let interimData = []
    let description = ''
    
    lines.forEach(line => {
      if (line.includes('LOWER')) return
      if (!line.includes('.')) {
        if (line.includes(name)) {
          description = line.trim().substring(name.length).trim()
        }
        return
      }
      const values = helpers.getValues(line,columnWidths)
      if (!values.domain[0]) return
      // remove the domain if it actually is the symbol name
      if (values.domain.length === 1) {
        values.domain = values.domain.filter(d => d !== name)
      }
      interimData.push(values)
    })
    
    // update values with name, description, solve
    interimData = interimData.map(value => {
      return {
        ...value,
        name: name,
        description: description
      }
    })
    data = data.concat(interimData)
  })
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
  let solves = helpers.splitSolves(listing)
  // if splitting by solves didn't do anything, there most likely was
  // a compilation error
  if (solves.length === 1) throw new Error('Error parsing the listing file. Check the raw listing file for compilation errors.')

  try {
    // before parsing anything, we need to define the column widths
    const columnWidths = helpers.getColumnWidths(listing)
    // disregard the first array element, as it only contains junk
    solves = solves.slice(1,solves.length)
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
        if (domain && typeof domain === 'string') domain = [domain]
        // coerce the relevant data
        let data = []
        if (solve && typeof solve === 'number') {
          try {
            data = data.concat(this.solves[solve].equations,this.solves[solve].variables)
          } catch (e) {
            throw new Error(`No solution found for solve no. ${solve}. Please check the solves array manually.`)
          }
        } else {
          try {
            this.solves.forEach(s => {
              data = data.concat(s.equations,s.variables)
            })
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

export default parse