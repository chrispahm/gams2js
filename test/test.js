const gams = require('..')
const fs = require('fs')
const util = require('util')
const assert = require('assert')

const read = util.promisify(fs.readFile)
// const write = util.promisify(fs.writeFile)

const tests = ['transport']

;(async () => {
  try {
    for (var i = 0; i < tests.length; i++) {
      const filename = tests[i]
      
      const listing = await read(`test/listings/${filename}.lst`,'utf8')
      const expected = await read(`test/expected/${filename}.json`,'utf8')

      const solution = gams(listing)

      assert.deepEqual(JSON.stringify(solution),expected)
      // await write(`test/expected/${filename}.json`,JSON.stringify(data),'utf8')

      // test the example in the readme
      if (filename === 'transport') {
        const x = solution.get('x')
        if (!x || x.length !== 6) throw new Error('Failed "get" test for variable x')
        
        // get all rows of x where the first domain is equal to seattle
        const seattle = solution.get('x','seattle')
        if (!seattle || seattle.length !== 3) throw new Error('Failed "get" test for variable x, first domain seattle')
        // get all rows where the second domain is Topeka
        const topeka = solution.get('x',['','Topeka'])
        if (!topeka || topeka.length !== 2) throw new Error('Failed "get" test for variable x, second domain Topeka')
        // get all rows where the first domain is Seattle, second is Topeka
        const seattleTopeka = solution.get('x',['Seattle','Topeka'])
        if (!seattleTopeka || seattleTopeka.length !== 1) throw new Error('Failed "get" test for variable x, first domain Seattle, second domain Topeka')
      }
      
      console.log(`All tests passed for filename ${filename}.`)
    }
  } catch (e) {
    console.error(e)
  }
})()
