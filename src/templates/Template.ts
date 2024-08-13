/**
TODO add if exports from tari.js are updated
import { templates } from "@tari-project/tarijs";
const { TemplateFactory } = templates; 
 */

import { TemplateFactory } from "@tari-project/tarijs/dist/templates/TemplateFactory";

export class Template extends TemplateFactory {
  public fct: any;
  public method: any;
  constructor(
    public templateAddress: string,
    functionName?: string,
    methodName?: string
  ) {
    super(templateAddress);
    this._initFunctions();
    this._initMethods();
    if (functionName) this.fct = this._defineFunction(functionName);
    if (methodName) this.method = this._defineMethod(methodName);
  }

  protected _initFunctions(): void {}
  protected _initMethods(): void {}
}
