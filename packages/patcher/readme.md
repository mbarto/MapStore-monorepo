# Patcher

This lib allows to use jsonpath rules inside a json patch rules

## How to use it


```js
import {mergeConfigsPatch} from '@mapstore/patcher';


const sourceFile = {
  name: "Alfredo",
  isValid: true,
  children: [{
    name: "Luke"
  }]
}
const jsonPathRules = [{
  "op": "remove",
  "jsonpath": "$.name"
}]
const jsonPatchRules = [{
  "op": "remove",
  "path": "/name"
}]

const resultJsonPath = mergeConfigsPatch(sourceFile, jsonPathRules);
const resultJsonPatch = mergeConfigsPatch(sourceFile, jsonPatchRules);

console.log(resultJsonPath === resultJsonPatch)
true

console.log(resultJsonPath)
{
  isValid: true,
  children: [{
    name: "Luke"
  }]
}
```

## references

[jsonpath](https://goessner.net/articles/JsonPath/)

[json-patch](http://jsonpatch.com/)
