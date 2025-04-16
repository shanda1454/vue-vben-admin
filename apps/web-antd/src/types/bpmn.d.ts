declare module 'bpmn-js/lib/Modeler' {
  export default class BpmnModeler {
    constructor(options?: any);
    importXML(xml: string): Promise<any>;
    saveXML(options?: any): Promise<{ xml: string }>;
    get(componentName: string): any;
    destroy(): void;
  }
}

declare module 'bpmn-js-properties-panel' {
  export const BpmnPropertiesPanelModule: any;
  export const BpmnPropertiesProviderModule: any;
}

declare module 'diagram-js-minimap' {
  const minimapModule: any;
  export default minimapModule;
}

declare module '@bpmn-io/properties-panel/dist/assets/properties-panel.css' {
  const content: any;
  export default content;
}

declare module 'diagram-js-minimap/assets/diagram-js-minimap.css' {
  const content: any;
  export default content;
}

declare module 'bpmn-js/dist/assets/diagram-js.css' {
  const content: any;
  export default content;
}

declare module 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css' {
  const content: any;
  export default content;
}
