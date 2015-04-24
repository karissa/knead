# knead

![dat](http://img.shields.io/badge/Development%20sponsored%20by-dat-green.svg?style=flat)

```
$ npm install -g knead
```

##### Resolve Not Small Data conflicts with manual merges.

*Not Small Data.*  When data conflicts are sufficiently troubling to resolve manually.

![diff](/images/diff.png)

You can send two files into `knead`. You'll see a [daff](https://github.com/paulfitz/daff) for each chunk, with a prompt to keep the changes or not. Changes that are kept will be written to the given resolved file.

## Usage

```
$ knead <base-file> <changed-file> <resolved-file> [--format] [--limit]
```

`base-file`: also known as `local file`, this is the file that will work as the 'truth' for the diff

`changed-file`: also known as `remote file`, this is the file that is proposing changes

`resolved-file`: this is where the approved or disapproved changes will be saved.

`--format`: 'csv' (default). the data format to write to the resolved file. 'csv','json', or 'ndjson'

`--limit`: 20 (default). the number of rows per page

## Examples

```
$ knead 2012.csv 2015_changes.csv current.json --format json --limit 20
```