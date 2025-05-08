import type { RouteRecordRaw } from 'vue-router';
// @ts-ignore
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    path: '/workflow',
    name: 'Workflow',
    meta: {
      order: 30,
      icon: 'ion:git-branch-outline',
      title: $t('routes.workflow.workflow'),
    },
    children: [
      {
        path: 'designer',
        name: 'BpmnDesigner',
        component: () => import('#/views/workflow/BpmnDesigner.vue'),
        meta: {
          title: $t('routes.workflow.designer'),
        },
      },
      {
        path: 'decision-designer',
        name: 'DmnDesigner',
        component: () => import('#/views/workflow/DmnDesigner.vue'),
        meta: {
          title: $t('routes.workflow.decisionDesigner'),
        },
      },
      {
        path: 'approval-task',
        name: 'ApprovalTaskList',
        component: () => import('#/views/workflow/ApprovalTaskList.vue'),
        meta: {
          title: $t('routes.workflow.approvalTask'),
        },
      },
      {
        path: 'form-manager',
        name: 'ApprovalFormManager',
        component: () => import('#/views/workflow/ApprovalFormManager.vue'),
        meta: {
          title: $t('routes.workflow.formManager'),
        },
      },
      {
        path: 'process-history',
        name: 'ProcessHistory',
        component: () => import('#/views/workflow/ProcessHistory.vue'),
        meta: {
          title: $t('routes.workflow.processHistory'),
        },
      },
    ],
  },
];

export default routes; 
