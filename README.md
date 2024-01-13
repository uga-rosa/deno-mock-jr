# deno-mock-jr

Mock server based on JSON-RPC.

# Usage

## As a language server

To act as a language server, standard input/output is used to request.

```bash
./bin/mock-langserver /path/to/def.yaml
```

All arguments are considered paths to definition files.
json/yaml/toml are available for definition files.
Check `schemas/definition.json` for format.

## Use in Deno

`Server` class is available that returns results in a json string in response to a call in a json string.
The function to be called can be defined with `Server.setProcedureMap`, which sets a map whose keys are the method names and whose values are the functions that receive the params.

```typescript
import { ProcedureMap, Server } from "./server.ts";
import { is } from "./deps/unknownutil.ts";

const serv = new Server();

// Set procedures
const map: ProcedureMap = new Map();
map.set("add", (params) => {
  if (is.ArrayOf(is.Number)(params)) {
    return params.reduce((acc, cur) => acc + cur);
  }
  throw new Error(`Invalid params type: expect number[]`);
});
map.set("subtract", (params) => {
  if (is.ArrayOf(is.Number)(params)) {
    return params.reduce((acc, cur) => acc - cur);
  }
  throw new Error(`Invalid params type: expect number[]`);
});
serv.setProcedureMap(map);

// Listening on http://localhost:8000/
Deno.serve(async (req) => {
  if (req.body) {
    const decoded = await req.text();
    const resp = serv.call(decoded);
    if (resp != null) {
      return new Response(resp);
    }
  }
  return new Response();
});
```

```typescript
const resp = await fetch("http://localhost:8000", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ jsonrpc: "2.0", method: "add", params: [1, 2, "3"], id: 1 }),
});

console.log(await resp.text());
// {"jsonrpc":"2.0","result":6,"id":1}
```
