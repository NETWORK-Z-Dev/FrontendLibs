# FrontendLibs
This library was made to easily download and "install" frontend libraries in NodeJS and store them in a custom path. The idea is to not link these libraries from online resource and instead save them locally so that applications that do use them can run without internet as well.

------

## Usage

```js
import FrontendLibs from "@hackthedev/frontend-libs";

let libDir = path.join(path.resolve(), "public", "js", "libs");

// installing multiple packages
const results = await FrontendLibs.installMultiple([
    { package: '@hackthedev/file-manager@1.0.0', path: libDir },
    { package: '@hackthedev/file-manager@1.0.0', path: libDir },
]);

results.forEach((r) => {
    if(r?.success || r?.skipped){
        console.log(r?.message)
    }
    else{
        console.error(r?.message)
    }
});

// Package @hackthedev/file-manager@1.0.0 already installed. Skipped.
```

Alternatively:

```js
const result = await FrontendLibs.install('@hackthedev/file-manager@1.0.0', libDir);
// Package @hackthedev/file-manager@1.0.0 already installed. Skipped.
```

