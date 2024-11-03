export class withBinspectorContext {
  _ctx: Record<string, any>

  constructor (ctx: Record<string, any>) {
    this._ctx = ctx
  }
}
