/** Convert the historical intermediate widget format to FlowFuse Dashboard. */
export function toFlowFuse(flow) {
 const result = flow.map(node => {
  if (node.type === 'ui_group') return { id: node.id, type: 'ui-group', name: node.name, page: 'cfg_ui_tab', width: 12, height: 1, order: 1, showTitle: true, visible: 'true', disabled: 'false', groupType: 'default' };
  if (node.type === 'ui_tab') return { id: node.id, type: 'ui-page', name: node.name, ui: 'cfg_ui_base', path: '/home', icon: 'home', layout: 'grid', theme: 'cfg_ui_theme', order: 1, visible: 'true', disabled: 'false', breakpoints: [{name:'Default',px:'0',cols:'12'}] };
  if (!['ui_gauge', 'ui_chart', 'ui_text'].includes(node.type)) return node;
  const base = { id: node.id, type: node.type.replace('_', '-'), z: node.z, name: node.name, group: node.group, order: node.order, width: node.width, height: node.height, x: node.x, y: node.y, wires: node.wires, className: '' };
  if (node.type === 'ui_gauge') return { ...base, gtype: 'gauge-half', gstyle: 'needle', title: node.title, label: node.title, units: node.label, min: node.min, max: node.max, value: 'payload', valueType: 'msg', segments: [{from:node.min,color:'#16a34a'}], sizeThickness: 16, sizeGap: 4, sizeKeyThickness: 8, styleRounded: true, styleGlow: false };
  if (node.type === 'ui_chart') return { ...base, label: node.label, chartType:'line', action:'append', series:'topic', seriesType:'msg', xAxisType:'time', xAxisProperty:'', xAxisPropertyType:'timestamp', xformat:'HH:mm:ss', yAxisProperty:'payload', yAxisPropertyType:'msg', ymin:node.ymin, ymax:node.ymax, removeOlder:1, removeOlderUnit:'3600', removeOlderPoints:'100', colors:node.colors };
  return { ...base, label: node.label, value:'payload', valueType:'msg', layout:'row-spread', style:false };
 });
 if (flow.some(n => n.type === 'ui_tab')) result.push(
  {id:'cfg_ui_base',type:'ui-base',name:'HomeClimate local demonstration',path:'/dashboard',includeClientData:true,acceptsClientConfig:[],showPathInSidebar:false,showPageTitle:true,navigationStyle:'default'},
  {id:'cfg_ui_theme',type:'ui-theme',name:'HomeClimate',colors:{surface:'#ffffff',primary:'#166534',bgPage:'#f1f5f9',groupBg:'#ffffff',groupOutline:'#cbd5e1'},sizes:{density:'default',pagePadding:'12px',groupGap:'12px',groupBorderRadius:'4px',widgetGap:'12px'}}
 );
 return result;
}
