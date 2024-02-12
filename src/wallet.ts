import { Settings } from "./routes/home/SettingsForm.tsx";
import { FunctionDef } from "./templateDefinition.ts";

import {
  createClient,
  TransactionSubmitRequest,
  AccountGetDefaultRequest,
  SubstatesListRequest,
  SubstatesGetRequest,
  Instruction,
  SubstateType,
  SubstateId,
  Arg,
  WalletDaemonClient
} from "@tarilabs/wallet_jrpc_client";

export async function getTemplateDefinition(
  walletdUrl: string,
  template_address: string
) {
  const client = createClient(walletdUrl || "http://localhost:9000");
  await authorizeClient(client);
  const resp = await client.templatesGet({
    template_address
  });
  return resp.template_definition;
}

export async function listSubstates(
  walletdUrl: string,
  template: string | null,
  substateType: SubstateType | null
) {
  const client = createClient(walletdUrl || "http://localhost:9000");
  await authorizeClient(client);
  const resp = await client.substatesList({
    filter_by_template: template,
    filter_by_type: substateType
  } as SubstatesListRequest);
  return resp.substates;
}

export async function getSubstate(walletdUrl: string, substateId: SubstateId) {
  const client = createClient(walletdUrl || "http://localhost:9000");
  await authorizeClient(client);
  const resp = await client.substatesGet({
    substate_id: substateId
  } as SubstatesGetRequest);
  return resp;
}

async function authorizeClient(client: WalletDaemonClient) {
  // TODO: keep this token in local storage
  const token = await client.authRequest(["Admin"]);
  await client.authAccept(token, "web");
}

export async function buildInstructionsAndSubmit(
  settings: Settings,
  selectedBadge: string | null,
  selectedComponent: string | null,
  func: FunctionDef,
  args: object
) {
  const client = createClient(settings.walletdUrl || "http://localhost:9000");
  // Login
  await authorizeClient(client);

  const req = await createTransactionRequest(
    client,
    settings,
    selectedBadge,
    selectedComponent,
    func,
    args
  );

  const submitResp = await client.submitTransaction(req);
  let resp = await client.waitForTransactionResult({
    transaction_id: submitResp.transaction_id,
    timeout_secs: 60
  });
  return resp;
}

export async function createTransactionRequest(
  client: WalletDaemonClient,
  settings: Settings,
  selectedBadge: string | null,
  selectedComponent: string | null,
  func: FunctionDef,
  formValues: object
): Promise<TransactionSubmitRequest> {
  const fee = 2000;
  const { account } = await client.accountsGetDefault(
    {} as AccountGetDefaultRequest
  );

  const fee_instructions = [
    {
      CallMethod: {
        component_address: account.address.Component,
        method: "pay_fee",
        args: [`Amount(${fee})`]
      }
    }
  ];

  const args = Object.values(formValues) as Arg[];
  const isMethod =
    func.arguments.length > 0 && func.arguments[0].name === "self";

  if (!isMethod && !settings.template) {
    throw new Error("Template not set");
  }

  if (isMethod && !selectedComponent) {
    throw new Error("This call requires a component to be selected");
  }

  let bucketId = 0;

  const proofInstructions: Instruction[] =
    isMethod && selectedBadge
      ? [
          {
            CallMethod: {
              component_address: account.address.Component,
              method: "create_proof_for_resource",
              args: [selectedBadge]
            }
          },
          {
            PutLastInstructionOutputOnWorkspace: { key: [bucketId++] }
          }
        ]
      : [];

  const callInstruction: Instruction = isMethod
    ? {
        CallMethod: {
          component_address: selectedComponent,
          method: func.name,
          args: args
        }
      }
    : {
        CallFunction: {
          template_address: settings.template,
          function: func.name,
          args: args
        }
      };

  const nextInstructions: Instruction[] =
    func.output.Other?.name === "Bucket"
      ? [
          { PutLastInstructionOutputOnWorkspace: { key: [bucketId] } },
          {
            CallMethod: {
              component_address: account.address.Component,
              method: "deposit",
              args: [{ Workspace: [bucketId] }]
            }
          }
        ]
      : [];

  const instructions: Instruction[] = [
    ...proofInstructions,
    callInstruction,
    ...nextInstructions,
    "DropAllProofsInWorkspace"
  ];

  return {
    signing_key_index: account.key_index,
    fee_instructions,
    instructions,
    inputs: [],
    override_inputs: false,
    is_dry_run: false,
    proof_ids: [],
    min_epoch: null,
    max_epoch: null
  } as TransactionSubmitRequest;
}
