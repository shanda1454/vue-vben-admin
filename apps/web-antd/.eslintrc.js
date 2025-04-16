export default {
  rules: {
    'import/no-extraneous-dependencies': 'off',
    'n/no-extraneous-import': [
      'error',
      {
        allowModules: [
          '@ant-design/icons-vue',
          'bpmn-js',
          'bpmn-js-properties-panel',
          '@bpmn-io/properties-panel',
          'diagram-js-minimap',
          'ant-design-vue'
        ],
        resolvePaths: [],
      },
    ],
  },
};
