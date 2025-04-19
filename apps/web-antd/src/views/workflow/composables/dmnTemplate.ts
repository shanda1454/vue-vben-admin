/**
 * DMN XML template generator
 */

/**
 * Creates a basic DMN XML template with an empty decision diagram
 * @returns {string} DMN XML template as a string
 */
export function createDmnXML(): string {
  // DMN specification version 1.3
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" 
             xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" 
             xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" 
             xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" 
             id="definitions" 
             name="Decision Model" 
             namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="decision_1" name="Decision 1">
    <decisionTable id="decisionTable_1">
      <input id="input_1">
        <inputExpression id="inputExpression_1" typeRef="string">
          <text>input</text>
        </inputExpression>
      </input>
      <output id="output_1" typeRef="string" />
      <rule id="rule_1">
        <inputEntry id="inputEntry_1">
          <text>"value"</text>
        </inputEntry>
        <outputEntry id="outputEntry_1">
          <text>"result"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_1">
      <dmndi:DMNShape id="DMNShape_1" dmnElementRef="decision_1">
        <dc:Bounds height="80" width="180" x="150" y="150" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;
} 
