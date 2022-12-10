# stimmzettel
Stimmzettelgenerator

Currently requires a patched version of pdf-lib for squished text to work: <https://github.com/HSZemi/pdf-lib>


## How to use this

### Installation

To install the required dependencies run

```npm install```

This installs the current version of pdf-lib, which sadly does not allow for stretching text arbitrarily, also see [this issue](https://github.com/Hopding/pdf-lib/issues/1135).

So we use a patched version, https://github.com/HSZemi/pdf-lib , which you will have to install.


### Running

At the very bottom of the index.ts file you will find a line similar to 

```await main('sample.json', 'out.pdf', true)```

The parameters are as follows: 
* input file name 
    * format as described below
* output file name
    * will be overwritten, if it already exists
* whether to run in debug mode or not

Then run 
```npm run build```
to build the pdf file, with the parameters set in index.ts.

### Format of the input json file

A sample can be found in `sample.json`.
It is a json file that serializes a list of the type CandidatingList, given below as python dataclasses.

```python
@dataclass
class Person: 
    number: str
    name: str
    subjects: str

@dataclass
class CandidatingList:
    listname: List[str]
    people: List[Person]
```

The listname is given as a list of strings, where each element gives a single line in the box.

The lists will be printed in the order they appear in the json file, a python-script generating the json file from a folder of csvs is given in `generate_json.py`.

