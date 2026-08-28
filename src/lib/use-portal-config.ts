'use client';
import { useEffect, useState } from 'react';
import { fallbackStatusConfig, statusTones, type StatusStyle } from './status-config';
const colorStyles: Record<string, Omit<StatusStyle, 'label'>> = {
  neutral: statusTones.neutral,
  warning: statusTones.warning,
  info: statusTones.info,
  success: statusTones.success,
  danger: statusTones.danger,
};
export function usePortalStatusConfig(){const[config,setConfig]=useState(fallbackStatusConfig);useEffect(()=>{fetch('/api/portal/application-statuses').then(r=>r.ok?r.json():null).then(body=>{if(!body?.statuses?.length)return;setConfig(current=>({...current,...Object.fromEntries(body.statuses.map((status:{code:string;partnerLabel:string;colorToken:string})=>[status.code,{label:status.partnerLabel,...(colorStyles[status.colorToken]??colorStyles.neutral)}]))}))}).catch(()=>undefined)},[]);return config}
export type PortalDashboardSection={key:string;name:string;type:string;config:Record<string,unknown>;displayOrder:number};
export function usePortalDashboardSections(){const[sections,setSections]=useState<PortalDashboardSection[]|null>(null);useEffect(()=>{fetch('/api/portal/dashboard-sections').then(r=>r.ok?r.json():null).then(body=>{if(body?.sections)setSections(body.sections)}).catch(()=>undefined)},[]);return sections}
