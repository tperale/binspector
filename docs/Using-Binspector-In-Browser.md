# Using Binspector in the browser

Considering the following tag in the webpage.

```txt
<!-- Input to pass the file to the browser -->
<input type="file" id="file-input" />
<!-- Button to download the file -->
<button id="file-download" />
```

A file `input` that will read the content of the file when sent to the webpage
and a `button` that will download a serialized version of the object sent to
the webpage.

The following code shows how to handle the content with Binspector.

```typescript
import { BinaryReader, binread } from 'binspector'
import * as fs from 'node:fs'
import * as path from 'node:path'

let protocol = undefined

const fileInput = document.getElementById("file-input")
fileInput.addEventListener("change", handleFileInput)

const fileDownload = document.getElementById("file-download")
fileDownload.addEventListener("click", handleFileDownload)

function handleFileInput(event) {
  const file = event.target.files[0]
  file.arrayBuffer().then((arr) => {
      protocol = binread(arr, Protocol)
  })
}

function handleFileDownload(event) {
    if (protocol !== undefined) {
        const _protocol = binwrite(protocol, Protocol)

        const blob = new Blob([_protocol.buffer])
        const url = URL.createObjectURL(blob)
        window.open(url)
    }
}
```
