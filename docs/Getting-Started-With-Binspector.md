# Getting Started with Binspector

The idea behind _binspector_ is to create declarative binary file format definition
library and provide tool to encode/decode binary file based on those definition. 

It takes heavy inspiration from C structure that are declarative, simple and
elegant way to describe a binary buffer.

```c
struct {
    uint8_t foo;
    uint16_t bar;
}
```

Since Typescript lacks such internal structure that can provide that amount of
detail the use of _decorator_ on top of class properties were chosen instead to
mimic that behaviour.

The benefit of reallying on decorators that describe the properties of a TS class
is that you don't have to write to type definition twice but can directly write
the methods that will handle the content of your file format in the same place
as where it's being declared.

## The binary definition reading

Each decorator you use on top of property will store metadata on how to parse
a binary file being read based on the binary file definition it made.

```typescript
import { BinaryReader, binread } 
import { promises as fs } from 'fs'
import path from 'path'

const data = await fs.readFile(path.join(__dirname, 'file.bin'))
const protocol = binread(new BinaryReader(data.buffer), ProtocolDefinition)
```

From an high level point of view the binary reader will start by reading
the `ProtocolDefinition` passed as an argument of `binread`.

```mermaid
stateDiagram-v2
state if_state <<choice>>
start: Reading a type definition
state start {
    PreClass: Execute __PreClass__ functions
    [*] --> PreClass
    PreClass --> if_state
    if_state --> BitField: is a __bitfield__
    if_state --> Relation : is a __relation type definition__
    state Relation {
        ReadRel: Read each proporty of the relation type definition.
    }
    state BitField {
        ReadBF: Read the BitField type definition based on the sized computed from the property definitions.
    }
    BitField --> PostClass
    Relation --> PostClass
    PostClass: Execute __PostClass__ functions
    PostClass --> [*]
}
```

__Relation type definition__ have a lot of helper decorators to helps you
describing each property of your file definition as declaratively as possible.
The decorators are devided into differents section and executed by the reading
loop at different moments.

```mermaid
flowchart TB
 subgraph s1[For each properties]
 direction TB
 PreOperation[__Pre__ property reading operations] --> Condition
 click PreOperation "/binspector/modules/PrePost.html" "Documentation for 'Pre' type decorators"
 Condition[__Condition__ get the definitive subtype to read based on current state] --> s2
 click Condition "/binspector/modules/Condition.html" "Documentation for 'Condtion' type decorators"
 subgraph s2[Reading subtype]
 Controller[__Controller__ decides when to stop reading the subtype based on a set of arbitrary conditions] --> TypeReading[Read __Relation__ or __Primitive__]
 click Controller "/binspector/modules/Controller.html" "Documentation for 'Controller' type decorators"
 click TypeReading "/binspector/modules/Primitive.html" "Documentation for 'Primitive' type decorators"
 end
 TypeReading --> Controller
 s2 --> Transform[__Transform__ the value we read into something else]
 click Transform "/binspector/modules/Transformer.html" "Documentation for 'Transformer' type decorators"
 Transform --> Validate[__Validate__ the final value]
 click Validate "/binspector/modules/Validator.html" "Documentation for 'Validator' type decorators"
 Validate --> PostOperation[__Post__ property reading operations]
 click PostOperation "/binspector/modules/PrePost.html" "Documentation for 'Post' type decorators"
 end
 PostOperation -->  A@{ shape: framed-circle, label: "Stop" }
```
