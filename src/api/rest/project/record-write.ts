import type { CreateAdrCommandData } from '../../../features/project/commands/impl/create-adr.command.js';
import type { CreateRequirementCommandData } from '../../../features/project/commands/impl/create-requirement.command.js';
import type { CreateWorkItemCommandData } from '../../../features/project/commands/impl/create-work-item.command.js';
import type { CreateWorkPlanCommandData } from '../../../features/project/commands/impl/create-work-plan.command.js';
import type { AdrUpdateRequest } from './dto/adr-update.request.js';
import type { AdrRequest } from './dto/adr.request.js';
import type { RequirementUpdateRequest } from './dto/requirement-update.request.js';
import type { RequirementRequest } from './dto/requirement.request.js';
import type { WorkItemUpdateRequest } from './dto/work-item-update.request.js';
import type { WorkItemRequest } from './dto/work-item.request.js';
import type { WorkPlanUpdateRequest } from './dto/work-plan-update.request.js';
import type { WorkPlanRequest } from './dto/work-plan.request.js';

export function adrCreateBody(projectId: string, data: AdrRequest): CreateAdrCommandData {
  return { projectId, id: data.id, ...adrFields(data) };
}

export function adrUpdateBody(
  projectId: string,
  id: string,
  data: AdrUpdateRequest,
): CreateAdrCommandData {
  return { projectId, id, ...adrFields(data) };
}

export function requirementCreateBody(
  projectId: string,
  data: RequirementRequest,
): CreateRequirementCommandData {
  return { projectId, id: data.id, ...requirementFields(data) };
}

export function requirementUpdateBody(
  projectId: string,
  id: string,
  data: RequirementUpdateRequest,
): CreateRequirementCommandData {
  return { projectId, id, ...requirementFields(data) };
}

export function workPlanCreateBody(
  projectId: string,
  data: WorkPlanRequest,
): CreateWorkPlanCommandData {
  return { projectId, id: data.id, ...workPlanFields(data) };
}

export function workPlanUpdateBody(
  projectId: string,
  id: string,
  data: WorkPlanUpdateRequest,
): CreateWorkPlanCommandData {
  return { projectId, id, ...workPlanFields(data) };
}

export function workItemCreateBody(
  projectId: string,
  data: WorkItemRequest,
): CreateWorkItemCommandData {
  return { projectId, id: data.id, ...workItemFields(data) };
}

export function workItemUpdateBody(
  projectId: string,
  id: string,
  data: WorkItemUpdateRequest,
): CreateWorkItemCommandData {
  return { projectId, id, ...workItemFields(data) };
}

function adrFields(data: AdrUpdateRequest) {
  return {
    title: data.title,
    status: data.status,
    supersededBy: data.supersededBy,
    context: data.context,
    decision: data.decision,
    alternatives: data.alternatives,
    consequences: data.consequences,
    relatedRequirements: data.relatedRequirements,
  };
}

function requirementFields(data: RequirementUpdateRequest) {
  return {
    title: data.title,
    status: data.status,
    statement: data.statement,
    acceptance: data.acceptance,
    relatedAdr: data.relatedAdr,
  };
}

function workPlanFields(data: WorkPlanUpdateRequest) {
  return {
    title: data.title,
    status: data.status,
    outcome: data.outcome,
    bounds: data.bounds,
    baselineId: data.baselineId,
    acceptance: data.acceptance,
  };
}

function workItemFields(data: WorkItemUpdateRequest) {
  return {
    title: data.title,
    cancelled: data.cancelled,
    goal: data.goal,
    inputs: data.inputs,
    owner: data.owner,
    constraints: data.constraints,
    acceptance: data.acceptance,
    plan: data.plan,
    dependsOn: data.dependsOn,
    relatedRequirements: data.relatedRequirements,
    relatedAdr: data.relatedAdr,
  };
}
