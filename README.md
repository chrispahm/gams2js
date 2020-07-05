# gams2js 🐬
## A GAMS output file parser for JavaScript

This simple script parses the results of a GAMS job (called output/listing file) and
turns them into a JavaScript object. 

The parser can be used in combination with the [neos-js](https://github.com/fruchtfolge/neos-js) package for solving GAMS jobs on the
NEOS servers, as well as for using GAMS in an [Observable](https://observablehq.com/@chrispahm/operations-research-in-observables).

## What can I use this for?
Using GAMS in a web-application (or an [Observable](https://observablehq.com/@chrispahm/operations-research-in-observables)) allows for writing didactic GAMS models, *without* requiring users (students, reviewers, readers) to install any additional software. 
Everything they need is a web browser.

This can make it easier for anyone interested in your research to understand, follow **and run** your model, without the additional overhead of setting up a working environment first.

Opposed to [GAMS MIRO](https://www.gams.com/miro/) (build on [Shiny](https://shiny.rstudio.com/)), gams2js does not impose any web framework on developers. This allows for more flexible web-development (despite offering less features).

Compared to a (non cloud hosted) Jupyter Notebook, using gams2js in an Observable allows for **running, and working with the results of your model** without download and installing anything. 

## Example

```js
const listing = `... other contents of the listing
---- VAR x  shipment quantities in cases

                      LOWER     LEVEL     UPPER    MARGINAL

Seattle  .New-York      .       50.000     +INF       .         
Seattle  .Chicago       .      300.000     +INF       .         
Seattle  .Topeka        .         .        +INF      0.036      
San-Diego.New-York      .      275.000     +INF       .         
San-Diego.Chicago       .         .        +INF      0.009      
San-Diego.Topeka        .      275.000     +INF       .      

... further contents of the listing
`

const solution = gams(listing)
// get the number of solve statements found
console.log(solution.solves.length)
// get the objective value of a particular solve
console.log(solution.solves[0].objective)
// get a dataframe (array of JS object) of the variable 'x', including all solves
const x = solution.get('x')
/* where x yields a dataframe of the format
[{
  "marginal": 0,
  "level": 50,
  "upper": Infinity,
  "lower": 0,
  "domain": ["Seattle", "New-York"],
  "name": "x",
  "description": "shipment quantities in cases"
}, {
  "marginal": 0,
  "level": 300,
  "upper": Infinity,
  "lower": 0,
  "domain": ["Seattle", "Chicago"],
  "name": "x",
  "description": "shipment quantities in cases"
},{
...
}
]
*/

// get a dataframe of the variable 'x', where the first domain is always equal 
// to 'Seattle' (including all solves)
const x = solution.get('x','Seattle')
// get a dataframe of the variable 'x', where the first domain is Seattle and 
// the second domain is Chicago, but only from the first solve statement
// remember that in JS you start countin at 0 😏
const x = solution.get('x',['Seattle','Chicago'],0)
```

## Installation
### Browser
Grab a release from the `dist` folder. Then, in the `header` include:
```html
<script src="assets/gams2js.min.js"></script>
```
This exposes the global variable `gams`.

### Node-JS
Install via npm
```
npm i gams2js
```
then
```js
const gams = require('gams2js')
// or ES6 import
import gams from 'gams2js'
```

## API
### ```gams(listing)```
Where `listing` is a `UTF-8` encoded string containing the output of a GAMS run.

Example:
```js
const solution = gams(listing)
```
The return value of the function is an *object* with the following properties

- `solves` *\<array\>, an array of objects for each solve statement*
  - `objective`  *\<number\>, the objective value of the solve*
  - `line` *\<number\>, the line number of the the solve*
  - `modelStatus` *\<number\>, the GAMS model status of the solve*
  - `equations` *\<array\>, an array of objects, each object representing a row of equation data*
    - `name` *\<string\>, the GAMS identifier of the equation row*
    - `domain` *\<array\>, the domain of the equation row, [] if not domain present*
    - `lower` *\<number\>, the lower bound of the equation row*
    - `level` *\<number\>, the solution level of the equation row*
    - `upper` *\<number\>, the upper bound of the equation row*
    - `marginal` *\<number\>, the marginal value of the equation row*
  - `variables` *\<number\>, an array of objects, each object representing a row of variable data*
    - `name` *\<string\>, the GAMS identifier of the variable row*
    - `domain` *\<array\>, the domain of the variable row, [] if not domain present*
    - `lower` *\<number\>, the lower bound of the variable row*
    - `level` *\<number\>, the solution level of the variable row*
    - `upper` *\<number\>, the upper bound of the variable row*
    - `marginal` *\<number\>, the marginal value of the variable row*
- `get` *\<function\>, see below for usage instructions*

### `[solution].get(symbol,[domain],[solve])`
A getter function for retrieving values from the listing.

- `symbol` *\<string, case-insensitive\>, the GAMS identifier to search for, may either be a variable or equation*
- `domain` *\<string/array, case-insensitive\> optional, filter the identifier by a domain. If a string is passed, the first domain element is converted to an array of length 1. Empty indexes in an array act as a wildcard (e.g. ['','Seattle'] would allow any label for the first domain, but only Seattle for the second).*
- `solve` *\<number\>, optional, the array index position of the solve to limit the search for. If omitted, all solves will be queried*


## What are the limitations?
`gams2js` does not serve as a [higher level GAMS API](https://www.gams.com/latest/docs/API_MAIN), it merely allows for accessing
the results of a model run. 

Opposed to the higher level GAMS APIs, which are capable of communicating with GAMS via the [GAMS data eXchange format (GDX)](https://www.gams.com/latest/docs/UG_GDX.html),
this library relies on parsing the GAMS output file. 

Parsing a GAMS output file opposed to reading a GDX comes with several limitations:
  - **Symbol names (variable and equation names), longer than 10 characters are not supported**, as they might be truncated in the listing with a `~`.
    This makes it impossible for the parser to distinguish symbols longer than 10 characters with the same basename.
    While the `options dispWidth = value` command can be used to increase the display width for `display` statements, this option
    won't affect general variable and equation prints in the listing.
    Keep in mind that you can add a description for you identifiers with up to 255 characters, which will be picked up by gams2js.
    
  - When using the NEOS-Server for solving a GAMS job, **non-ASCII characters (e.g. é,ä,œ) are not allowed in the GAMS model**.
    It is therefore advised to write the models in plain english, or write an escape function for your model. Keep in mind 
    that the results of the JavaScript `encodeURI` do not adhere to the GAMS naming conventions, so you need to write one yourself.
  - Unexpected things may occur, as parsing is done using regular expressions and string manipulation. This library is only tested against a limited number of test cases, you are invited to help expand it!
    
## What are possible alternatives?

gams2js is still in a very early stage of development, and lacks many of the features that make GAMS a great language.
Making use of syntax highlighting, code-completion, and error highlighting (all features of GAMS Studio or [linter-gams](https://github.com/chrispahm/linter-gams)) are not supported when using gams2js in an Observable. Also, sequential code execution, as well as direct interaction with GAMS symbols as in a Jupyter Notebook is not supported. For more ambitous projects (maybe outside scope of a didactic model) please have a look at the following projects:

 - [Jupyter @ GAMS](https://jupyterhub.gams.com/hub/login) on Jupyterhub - Exceuting and communicating with GAMS in a Jupyter Notebook
 - [GAMS MIRO](https://www.gams.com/miro/) - a deployment environment that allows to turn GAMS models into interactive applications.
 - [linter-gams](https://github.com/chrispahm/linter-gams) - A GAMS IDE build on Atom featuring interactive symbol navigation, an R-Studio like data panel, model-aware auto-completion and many more features.
 
 ## Contribution
 Contribution is highly appreciated 👍!  
 Please open an issue in case of questions / bug reports or a pull request if you implemented a new feature / bug fix.  
 In the latter case, please make sure to run `npm test` (and adapt `test/test.js` to your changes) and / or update the `README` 🙂

 ## License
 MIT @Christoph Pahmeyer

 This software is crafted with :heart: at the [University of Bonn - EMAS Group](https://www.ilr.uni-bonn.de/em/em_e.htm)
    
