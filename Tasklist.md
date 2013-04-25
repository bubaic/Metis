This is the tasklist for Metis. If you stumbled here by accident, then feel free to [find out what the heck Metis is](https://github.com/StroblIndustries/Metis/blob/master/Readme.md).

- [ ] Modify Metis to be a PHP class, which should future-proof Metis functions from conflicting with potential core PHP functionality.
- [ ] Deprecate die() and replace with error codes (deprecation of die allows for continuation of PHP script)
- [ ] Implement multi-node file fetching in readJsonFile function
- [ ] Implement SQL-like query capability
  - [ ] Implement for writing data
  - [ ] Implement for reading data
  - [ ] Implement for updating / altering data
  - [ ] Implement for deleting data
- [ ] Implement asynchronous HTML5 Webworkers (JS-based) calls for Metis. Allows for more diverse use of Metis. May require Typescript (yet to be decided).
